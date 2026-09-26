/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para extração automática de texto em arquivos de conhecimento da IA
 * Movemos toda a lógica inline dentro do callback para evitar problemas de escopo do PocketBase JSVM.
 */
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const fileName = record.getString('file')
  if (!fileName) return e.next()

  let extractedMarkdown = ''
  const lowerName = (record.getString('name') || fileName).toLowerCase()

  // 1. Tentar extração via $documents.toMarkdown para documentos estruturados
  const isDocument =
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.pptx')

  if (isDocument) {
    try {
      const docResult = $documents.toMarkdown({
        record: record,
        field: 'file',
      })
      if (docResult && docResult.markdown) {
        extractedMarkdown = docResult.markdown
      }
    } catch (docErr) {
      console.warn('[AI_KNOWLEDGE_FILES] $documents.toMarkdown failed: ' + String(docErr))
    }
  }

  // 2. Se for arquivo de texto puro (.txt, .md, .csv, .json)
  const isPlainText =
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.json')

  if (!extractedMarkdown && isPlainText) {
    try {
      const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
      const fileUrl = pbUrl + '/api/files/' + record.collectionId + '/' + record.id + '/' + fileName
      const fileRes = $http.send({ url: fileUrl, method: 'GET', timeout: 10 })
      if (fileRes && fileRes.statusCode === 200 && fileRes.body) {
        extractedMarkdown = String.fromCharCode.apply(null, fileRes.body)
      }
    } catch (txtErr) {
      console.warn('[AI_KNOWLEDGE_FILES] Text fetch error: ' + String(txtErr))
    }
  }

  // 3. Se for imagem (.png, .jpg, .jpeg, .webp)
  const isImage =
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp')

  if (!extractedMarkdown && isImage) {
    extractedMarkdown =
      '[Material visual/imagem anexado à base de conhecimento: ' +
      (record.getString('name') || fileName) +
      ']'
  }

  // 4. Salva o texto extraído no registro se obteve algo
  if (extractedMarkdown && extractedMarkdown.trim()) {
    try {
      const recToUpdate = $app.findRecordById('ai_knowledge_files', record.id)
      recToUpdate.set('extracted_text', extractedMarkdown.trim())
      if (record.get('is_active') === null || record.get('is_active') === undefined) {
        recToUpdate.set('is_active', true)
      }
      $app.saveNoValidate(recToUpdate)
      console.log(
        '[AI_KNOWLEDGE_FILES] Extracted text saved for record=' +
          record.id +
          ' len=' +
          extractedMarkdown.length,
      )
    } catch (saveErr) {
      console.error('[AI_KNOWLEDGE_FILES] Error saving extracted text: ' + String(saveErr))
    }
  }

  return e.next()
}, 'ai_knowledge_files')

onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const currentExtracted = (record.getString('extracted_text') || '').trim()
  const fileName = record.getString('file')
  if (currentExtracted || !fileName) {
    return e.next()
  }

  let extractedMarkdown = ''
  const lowerName = (record.getString('name') || fileName).toLowerCase()

  const isDocument =
    lowerName.endsWith('.pdf') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.pptx')

  if (isDocument) {
    try {
      const docResult = $documents.toMarkdown({
        record: record,
        field: 'file',
      })
      if (docResult && docResult.markdown) {
        extractedMarkdown = docResult.markdown
      }
    } catch (docErr) {
      console.warn('[AI_KNOWLEDGE_FILES] $documents.toMarkdown failed: ' + String(docErr))
    }
  }

  const isPlainText =
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.json')

  if (!extractedMarkdown && isPlainText) {
    try {
      const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
      const fileUrl = pbUrl + '/api/files/' + record.collectionId + '/' + record.id + '/' + fileName
      const fileRes = $http.send({ url: fileUrl, method: 'GET', timeout: 10 })
      if (fileRes && fileRes.statusCode === 200 && fileRes.body) {
        extractedMarkdown = String.fromCharCode.apply(null, fileRes.body)
      }
    } catch (txtErr) {
      console.warn('[AI_KNOWLEDGE_FILES] Text fetch error: ' + String(txtErr))
    }
  }

  if (extractedMarkdown && extractedMarkdown.trim()) {
    try {
      const recToUpdate = $app.findRecordById('ai_knowledge_files', record.id)
      recToUpdate.set('extracted_text', extractedMarkdown.trim())
      $app.saveNoValidate(recToUpdate)
    } catch (saveErr) {
      console.error('[AI_KNOWLEDGE_FILES] Update save error: ' + String(saveErr))
    }
  }

  return e.next()
}, 'ai_knowledge_files')
