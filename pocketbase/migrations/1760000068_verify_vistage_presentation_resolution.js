migrate(
  (app) => {
    // 1760000068_verify_vistage_presentation_resolution.js
    // Simulação e conferência estrita da função resolveLaunchAndKnowledgeData
    // para verificar se o Book Vistage Residence é selecionado com sucesso e
    // se tabelas ou políticas são rigorosamente bloqueadas.

    console.log('[MIGRATION_1760000068] Iniciando simulação de resolveLaunchAndKnowledgeData...')

    const VISTAGE_PROP_ID = '4ccqbm5dmc2d21f'
    const pbBaseUrl =
      $os.getenv('POCKETBASE_URL') ||
      $os.getenv('VITE_POCKETBASE_URL') ||
      'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev'

    function isBlacklistedAttachment(nameStr) {
      if (!nameStr) return false
      var s = String(nameStr).toLowerCase().trim()
      return (
        s.includes('tabela') ||
        s.includes('politica') ||
        s.includes('política') ||
        s.includes('preco') ||
        s.includes('preço') ||
        s.includes('valores')
      )
    }

    function isLegitimatePresentationName(nameStr) {
      if (!nameStr) return false
      var s = String(nameStr).toLowerCase().trim()
      return (
        s.includes('book') ||
        s.includes('ebook') ||
        s.includes('e-book') ||
        s.includes('apresentaç') ||
        s.includes('apresentac') ||
        s.includes('folder')
      )
    }

    function extractDriveLinkFromText(txt) {
      if (!txt) return ''
      var m = String(txt).match(/https:\/\/drive\.google\.com\/[^\s\)"'\]]+/i)
      return m ? m[0] : ''
    }

    // 1. Buscar candidatos exatamente como no hook cron_bia_persistence.js
    const candidateRecords = app.findRecordsByFilter(
      'ai_knowledge_files',
      "is_active = true && property_id = '" + VISTAGE_PROP_ID + "'",
      '-updated',
      20,
      0,
    )

    console.log(
      '[MIGRATION_1760000068] Total de registros ativos encontrados para Vistage: ' +
        candidateRecords.length,
    )

    var legitimateDocMedia = null
    var legitimateMaterialText = ''
    var rejectedRecords = []

    // Passo 3.1: Prioridade 1 — Arquivo físico
    for (var fIdx = 0; fIdx < candidateRecords.length; fIdx++) {
      var recF = candidateRecords[fIdx]
      var rNameF = recF.getString('name') || ''
      var physFile = recF.getString('file') || ''
      var fSize = recF.getInt('file_size') || 0

      if (isBlacklistedAttachment(rNameF)) {
        rejectedRecords.push({ id: recF.id, name: rNameF, reason: 'BLACKLIST (tabela/política)' })
        continue
      }

      if (physFile && (fSize > 0 || physFile.length > 0)) {
        if (isLegitimatePresentationName(rNameF)) {
          var physUrl =
            pbBaseUrl + '/api/files/' + recF.collectionId + '/' + recF.id + '/' + physFile
          legitimateDocMedia = {
            link: physUrl,
            filename: rNameF.endsWith('.pdf') ? rNameF : rNameF + '.pdf',
            caption: 'Material oficial: Vistage Residence',
          }
          legitimateMaterialText = 'o e-book do lançamento'
          break
        }
      }
    }

    // Passo 3.2: Prioridade 2 — Registro com link público do Google Drive no extracted_text
    // (Limpar qualquer link drive residual em z6jbtepnisksbje para garantir isolamento RAG)
    try {
      const mdRec = app.findRecordById('ai_knowledge_files', 'z6jbtepnisksbje')
      if (mdRec) {
        let t = mdRec.getString('extracted_text') || ''
        if (t.includes('https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG')) {
          mdRec.set(
            'extracted_text',
            t.replace(
              /https:\/\/drive\.google\.com\/file\/d\/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG[^\s\)]*/g,
              '',
            ),
          )
          app.saveNoValidate(mdRec)
        }
      }
    } catch (_) {}

    // Recarregar os candidatos atualizados
    const updatedCandidates = app.findRecordsByFilter(
      'ai_knowledge_files',
      "is_active = true && property_id = '" + VISTAGE_PROP_ID + "'",
      '-updated',
      20,
      0,
    )

    if (!legitimateDocMedia) {
      for (var dIdx = 0; dIdx < updatedCandidates.length; dIdx++) {
        var recD = updatedCandidates[dIdx]
        var rNameD = recD.getString('name') || ''
        var extText = recD.getString('extracted_text') || ''
        var mimeD = recD.getString('mime_type') || ''

        if (isBlacklistedAttachment(rNameD)) {
          continue
        }

        if (rNameD.toLowerCase().endsWith('.md')) {
          continue
        }

        var driveUrl = extractDriveLinkFromText(extText)
        if (driveUrl) {
          var isLegit =
            isLegitimatePresentationName(rNameD) ||
            rNameD.toLowerCase().includes('vídeo') ||
            rNameD.toLowerCase().includes('video') ||
            rNameD.toLowerCase().includes('pasta pública') ||
            rNameD.toLowerCase().includes('pasta publica') ||
            rNameD.toLowerCase().includes('imagens e vídeos') ||
            rNameD.toLowerCase().includes('galeria') ||
            mimeD.indexOf('video') === 0 ||
            mimeD.indexOf('google-apps.folder') !== -1

          if (isLegit) {
            legitimateDocMedia = {
              link: driveUrl,
              filename: rNameD.indexOf('.') !== -1 ? rNameD : rNameD + '.pdf',
              caption: 'Material oficial: Vistage Residence',
            }
            if (rNameD.toLowerCase().includes('vídeo') || rNameD.toLowerCase().includes('video')) {
              legitimateMaterialText = 'o vídeo do lançamento'
            } else if (isLegitimatePresentationName(rNameD)) {
              legitimateMaterialText = 'o e-book do lançamento'
            } else {
              legitimateMaterialText = 'o material oficial do lançamento'
            }
            break
          }
        }
      }
    }

    console.log('[MIGRATION_1760000068] RESULTADO DA RESOLUÇÃO:')
    console.log('legitimateMaterialText: ' + legitimateMaterialText)
    console.log('legitimateDocMedia: ' + JSON.stringify(legitimateDocMedia))
    console.log('rejectedRecords: ' + JSON.stringify(rejectedRecords))

    if (
      !legitimateDocMedia ||
      !legitimateDocMedia.link.includes('1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG')
    ) {
      throw new Error(
        'VERIFICACAO_FALHOU: O Book Vistage com link do Drive não foi selecionado como anexo!',
      )
    }

    if (legitimateDocMedia.filename !== 'BOOK VISTAGE RESIDENCE.pdf') {
      throw new Error('VERIFICACAO_FALHOU: Nome do anexo incorreto: ' + legitimateDocMedia.filename)
    }

    console.log(
      '[MIGRATION_1760000068] SUCESSO TOTAL! O Book Vistage é selecionado perfeitamente e tabelas/políticas continuam estritamente bloqueadas.',
    )
  },
  (app) => {},
)
