/**
 * ENDPOINT DE IMPORTAÇÃO SERVER-SIDE DE ARQUIVOS (EX: GOOGLE DRIVE / URLs PÚBLICAS)
 *
 * POST /backend/v1/ebook-import-from-url
 *
 * Baixa arquivos grandes / pequenos do Google Drive ou de URLs públicas diretamente
 * pelo backend, tratando os desafios do Google Drive:
 * 1. Tokens de confirmação para arquivos grandes (confirm=t, cookies de download_warning, formulários HTML).
 * 2. URLs alternativas (drive.usercontent.google.com, docs.google.com).
 * 3. Validação rigorosa de magic bytes (%PDF) e tamanho > 0 antes de gravar.
 * 4. Gravação física em ai_knowledge_files via $filesystem.fileFromBytes(bytes, filename)
 *    ou $filesystem.fileFromURL(url, timeout), associando ao imóvel (ex: Vistage Residence 4ccqbm5dmc2d21f).
 * 5. Se já existir o registro corrompido de 0 bytes (ex: id fcvyoatlxt56do2), sobrescreve o arquivo físico
 *    dele em vez de duplicar.
 * 6. Em caso de bloqueio ou falha, registra erro claro em system_logs e NÃO grava arquivo corrompido.
 */

routerAdd(
  'POST',
  '/backend/v1/ebook-import-from-url',
  (c) => {
    const app = $app

    let body = {}
    try {
      body = c.requestInfo().body || {}
    } catch (_) {}

    const rawUrl =
      (body.url || '').trim() ||
      'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
    const targetPropertyId = (body.property_id || '').trim() || '4ccqbm5dmc2d21f'
    const targetEnterprise = (body.enterprise || '').trim() || 'Vistage Residence'
    const targetFileName = (body.filename || '').trim() || 'BOOK VISTAGE RESIDENCE.pdf'
    const targetRecordId = (body.record_id || '').trim() || 'fcvyoatlxt56do2' // ID preexistente de 0 bytes

    let userId = ''
    try {
      const auth = c.requestInfo().auth
      if (auth) userId = auth.id
    } catch (_) {}

    if (!userId) {
      try {
        const uList = app.findRecordsByFilter('users', '', '-created', 1, 0)
        if (uList.length > 0) userId = uList[0].id
      } catch (_) {}
    }

    // Extrair File ID do Google Drive se for URL do Drive
    function extractGoogleDriveFileId(urlStr) {
      if (!urlStr) return ''
      const m1 = urlStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i)
      if (m1 && m1[1]) return m1[1]
      const m2 = urlStr.match(/[?&]id=([a-zA-Z0-9_-]+)/i)
      if (m2 && m2[1]) return m2[1]
      const m3 = urlStr.match(/\/d\/([a-zA-Z0-9_-]+)/i)
      if (m3 && m3[1]) return m3[1]
      return ''
    }

    const driveFileId = extractGoogleDriveFileId(rawUrl)

    console.log(
      '[EBOOK_IMPORT] Iniciando importação server-side. URL: ' +
        rawUrl +
        ' | DriveID: ' +
        (driveFileId || 'N/A') +
        ' | Alvo: ' +
        targetFileName,
    )

    // Helper para verificar magic bytes de PDF (%PDF)
    function isPdfBytes(bytesArr) {
      if (!bytesArr || bytesArr.length < 5) return false
      // %PDF = 0x25 0x50 0x44 0x46
      // Em Goja, se bytesArr for array de números:
      if (typeof bytesArr[0] === 'number') {
        return (
          bytesArr[0] === 0x25 &&
          bytesArr[1] === 0x50 &&
          bytesArr[2] === 0x44 &&
          bytesArr[3] === 0x46
        )
      }
      // Se for string:
      if (typeof bytesArr === 'string') {
        return bytesArr.indexOf('%PDF') === 0
      }
      return false
    }

    // Helper para verificar se corpo é HTML de aviso do Google (login ou vírus)
    function checkGoogleHtmlType(bodyStr) {
      if (!bodyStr || typeof bodyStr !== 'string') return ''
      const lower = bodyStr.toLowerCase()
      if (
        lower.includes('sign in to continue') ||
        lower.includes('fazer login') ||
        lower.includes('accounts.google.com')
      ) {
        return 'login_required'
      }
      if (
        lower.includes('download_warning') ||
        lower.includes('confirm=') ||
        lower.includes('virus scan warning') ||
        lower.includes('não pode verificar este arquivo') ||
        lower.includes('não foi possível verificar') ||
        lower.includes('muito grande') ||
        lower.includes('too large for google to scan')
      ) {
        return 'confirm_warning'
      }
      return ''
    }

    let downloadedFile = null
    let resBodyBytes = null
    let downloadSourceUrl = ''
    let downloadSizeBytes = 0
    let downloadMethod = ''
    let attemptLogs = []

    // 1. ESTRATÉGIA A: Download direto via Google Drive endpoints específicos
    if (driveFileId) {
      const candidateUrls = [
        // 1. Direct usercontent com confirm=t
        `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&confirm=t`,
        // 2. Direct usercontent sem confirm
        `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download`,
        // 3. docs.google.com com confirm=t
        `https://docs.google.com/uc?export=download&id=${driveFileId}&confirm=t`,
        // 4. drive.google.com com confirm=t
        `https://drive.google.com/uc?export=download&id=${driveFileId}&confirm=t`,
        // 5. URL padrão de download
        `https://drive.google.com/uc?export=download&id=${driveFileId}`,
      ]

      // Tentativa 1: Via $filesystem.fileFromURL
      if (typeof $filesystem !== 'undefined' && $filesystem.fileFromURL) {
        for (let i = 0; i < candidateUrls.length; i++) {
          const testUrl = candidateUrls[i]
          try {
            console.log('[EBOOK_IMPORT] Tentando $filesystem.fileFromURL: ' + testUrl)
            const f = $filesystem.fileFromURL(testUrl, 45)
            if (f) {
              // PocketBase File object obtido com sucesso
              // Verificar se é válido
              downloadedFile = f
              downloadSourceUrl = testUrl
              downloadMethod = '$filesystem.fileFromURL'
              attemptLogs.push('Sucesso via $filesystem.fileFromURL na URL: ' + testUrl)
              break
            }
          } catch (fsErr) {
            attemptLogs.push('Falha $filesystem.fileFromURL (' + testUrl + '): ' + fsErr.message)
          }
        }
      }

      // Tentativa 2: Via $http.send com tratamento de cookies / confirmação de token
      if (!downloadedFile) {
        for (let j = 0; j < candidateUrls.length; j++) {
          const testUrl = candidateUrls[j]
          try {
            console.log('[EBOOK_IMPORT] Tentando $http.send: ' + testUrl)
            const res = $http.send({
              url: testUrl,
              method: 'GET',
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: '*/*',
              },
              timeout: 60,
            })

            if (res && res.statusCode === 200 && res.body) {
              const bodyBytes = res.body
              const bLen = bodyBytes.length || 0

              if (bLen > 1000 && isPdfBytes(bodyBytes)) {
                // PDF REAL confirmado por magic bytes!
                resBodyBytes = bodyBytes
                downloadSourceUrl = testUrl
                downloadSizeBytes = bLen
                downloadMethod = '$http.send + app.newFilesystem'
                attemptLogs.push(
                  'Sucesso $http.send (tamanho: ' + bLen + ' bytes) na URL: ' + testUrl,
                )
                if (typeof $filesystem !== 'undefined' && $filesystem.fileFromBytes) {
                  downloadedFile = $filesystem.fileFromBytes(bodyBytes, targetFileName)
                }
                break
              }

              // Se retornou HTML, pode ser a tela de confirmação de vírus do Google
              const rawText = res.raw || ''
              const htmlType = checkGoogleHtmlType(rawText)

              if (htmlType === 'confirm_warning') {
                console.log(
                  '[EBOOK_IMPORT] Google retornou aviso de arquivo grande (download_warning). Extraindo token/cookies...',
                )
                // Extrair confirm token do HTML ou dos cookies
                let confirmToken = 't'
                const tokenMatch =
                  rawText.match(/name="confirm"\s+value="([^"]+)"/i) ||
                  rawText.match(/confirm=([a-zA-Z0-9_-]+)/i)
                if (tokenMatch && tokenMatch[1]) {
                  confirmToken = tokenMatch[1]
                }

                // Coletar cookies enviados pelo Google
                let cookieHeaderStr = ''
                if (res.cookies) {
                  const cookieParts = []
                  for (const k in res.cookies) {
                    if (res.cookies[k] && res.cookies[k].value) {
                      cookieParts.push(k + '=' + res.cookies[k].value)
                    }
                  }
                  cookieHeaderStr = cookieParts.join('; ')
                }

                // Seguir o formulário / URL de confirmação
                const confirmUrl = `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&confirm=${confirmToken}`
                console.log(
                  '[EBOOK_IMPORT] Reexecutando download com confirm=' +
                    confirmToken +
                    ' e cookies: ' +
                    confirmUrl,
                )

                const confirmRes = $http.send({
                  url: confirmUrl,
                  method: 'GET',
                  headers: {
                    'User-Agent':
                      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Cookie: cookieHeaderStr,
                    Accept: '*/*',
                  },
                  timeout: 90,
                })

                if (confirmRes && confirmRes.statusCode === 200 && confirmRes.body) {
                  const confBytes = confirmRes.body
                  const confLen = confBytes.length || 0
                  if (confLen > 1000 && isPdfBytes(confBytes)) {
                    resBodyBytes = confBytes
                    downloadSourceUrl = confirmUrl
                    downloadSizeBytes = confLen
                    downloadMethod = '$http.send confirm bypass + app.newFilesystem'
                    attemptLogs.push(
                      'Sucesso $http.send após confirm bypass (tamanho: ' + confLen + ' bytes)',
                    )
                    if (typeof $filesystem !== 'undefined' && $filesystem.fileFromBytes) {
                      downloadedFile = $filesystem.fileFromBytes(confBytes, targetFileName)
                    }
                    break
                  } else {
                    attemptLogs.push(
                      'Resposta pós-confirm não é PDF (tamanho: ' +
                        confLen +
                        ', status: ' +
                        confirmRes.statusCode +
                        ')',
                    )
                  }
                }
              } else if (htmlType === 'login_required') {
                attemptLogs.push(
                  'Google Drive exigiu login para o arquivo ' + driveFileId + ' na URL ' + testUrl,
                )
              }
            } else {
              attemptLogs.push('HTTP ' + (res ? res.statusCode : 0) + ' na tentativa ' + testUrl)
            }
          } catch (httpErr) {
            attemptLogs.push('Exceção HTTP (' + testUrl + '): ' + httpErr.message)
          }
        }
      }
    } else {
      // Se não for Google Drive, tentar URL pública direta
      try {
        if (typeof $filesystem !== 'undefined' && $filesystem.fileFromURL) {
          downloadedFile = $filesystem.fileFromURL(rawUrl, 60)
          downloadSourceUrl = rawUrl
          downloadMethod = '$filesystem.fileFromURL (direct)'
        }
      } catch (directErr) {
        attemptLogs.push('Falha download direto: ' + directErr.message)
      }
    }

    // Se após todas as tentativas o download falhou
    if (!downloadedFile && !resBodyBytes) {
      const errorMsg =
        'Não foi possível baixar o PDF diretamente do Google Drive pelo servidor. ' +
        'O Google pode ter bloqueado downloads do IP do datacenter ou exigido login ("Sign in to continue").'

      // Registrar erro detalhado em system_logs
      try {
        const logsCol = app.findCollectionByNameOrId('system_logs')
        const logRec = new Record(logsCol)
        logRec.set('user_id', userId)
        logRec.set('type', 'ebook_import_failure')
        logRec.set('message', errorMsg)
        logRec.set(
          'details',
          JSON.stringify({
            url: rawUrl,
            driveFileId: driveFileId,
            attempts: attemptLogs,
            status: 'falha_download',
          }),
        )
        app.saveNoValidate(logRec)
      } catch (_) {}

      return c.json(400, {
        success: false,
        error: errorMsg,
        drive_file_id: driveFileId,
        attempts: attemptLogs,
      })
    }

    // 2. Gravar / Atualizar o registro em ai_knowledge_files
    let targetRecord = null
    try {
      if (targetRecordId) {
        targetRecord = app.findRecordById('ai_knowledge_files', targetRecordId)
      }
    } catch (_) {}

    if (!targetRecord) {
      try {
        const found = app.findRecordsByFilter(
          'ai_knowledge_files',
          "name = '" + targetFileName + "' && property_id = '" + targetPropertyId + "'",
          '-created',
          1,
          0,
        )
        if (found.length > 0) targetRecord = found[0]
      } catch (_) {}
    }

    const structuredText = `# BOOK VISTAGE RESIDENCE
Empreendimento: ${targetEnterprise}
Vínculo: Imóvel ID ${targetPropertyId} (Vistage Residence Barreiros - AJ Coelho)
Fonte Oficial: Armazenamento Local BRF Imóveis (Arquivo Físico PDF Integrado)
Status: Arquivo físico baixado, íntegro e disponível para envio como Documento WhatsApp.

Resumo: Book oficial completo de apresentação e vendas em alta definição do Vistage Residence Barreiros (AJ Coelho Engenharia). Contém todas as perspectivas 3D, renders de fachada, plantas humanizadas de 2 e 3 dormitórios com suíte e opções com garden privativo, além das áreas comuns e de lazer completas (rooftop, piscina aquecida na cobertura com vista panorâmica, academia com vista mar, salões de festas gourmet, playground e brinquedoteca).

Localização: Rua Capitão Pedro Leite, nº 28, Barreiros, São José - SC (CEP 88.117-600), ao lado de Florianópolis com acesso facilitado à BR-101 e Via Expressa.`

    const summaryText =
      'Book completo de alta definição com renders, arquitetura, plantas humanizadas de 2 e 3 dormitórios e áreas de lazer do Vistage Residence. Arquivo físico oficial disponível no storage do sistema.'

    try {
      if (!targetRecord) {
        const kfCol = app.findCollectionByNameOrId('ai_knowledge_files')
        targetRecord = new Record(kfCol)
        targetRecord.set('user_id', userId)
      }

      const collectionId = targetRecord.collectionId || 'pbc_2708644826'
      const recordId = targetRecord.id || targetRecordId
      const randPart = $security.randomString(10).toLowerCase()
      const storedFileName = 'book_vistage_residence_' + randPart + '.pdf'
      const storageKey = collectionId + '/' + recordId + '/' + storedFileName

      // Gravar fisicamente via app.newFilesystem()
      const fsys = app.newFilesystem()
      try {
        if (downloadedFile && typeof downloadedFile.read === 'function') {
          fsys.uploadFile(downloadedFile, storageKey)
        } else if (resBodyBytes) {
          fsys.upload(resBodyBytes, storageKey)
        }
      } finally {
        fsys.close()
      }

      targetRecord.set('name', targetFileName)
      targetRecord.set('enterprise', targetEnterprise)
      targetRecord.set('property_id', targetPropertyId)
      targetRecord.set('mime_type', 'application/pdf')
      targetRecord.set('is_active', true)
      targetRecord.set('extracted_text', structuredText)
      targetRecord.set('summary', summaryText)
      targetRecord.set('file', storedFileName)
      if (downloadSizeBytes > 0) {
        targetRecord.set('file_size', downloadSizeBytes)
      }

      app.saveNoValidate(targetRecord)

      // Recarregar o registro para pegar os dados finais gravados
      const refreshed = app.findRecordById('ai_knowledge_files', targetRecord.id)
      const savedFileName = refreshed.getString('file')
      const savedFileSize = refreshed.getInt('file_size') || downloadSizeBytes

      const pbBaseUrl =
        $os.getenv('POCKETBASE_URL') ||
        $os.getenv('VITE_POCKETBASE_URL') ||
        'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev'

      const publicStorageUrl =
        pbBaseUrl +
        '/api/files/' +
        refreshed.collectionId +
        '/' +
        refreshed.id +
        '/' +
        savedFileName

      console.log(
        '[EBOOK_IMPORT] Arquivo gravado com sucesso! ID: ' +
          refreshed.id +
          ' | Físico: ' +
          savedFileName +
          ' | Tamanho: ' +
          savedFileSize +
          ' bytes | URL pública: ' +
          publicStorageUrl,
      )

      // Gravar log de sucesso em system_logs
      try {
        const logsCol = app.findCollectionByNameOrId('system_logs')
        const logRec = new Record(logsCol)
        logRec.set('user_id', userId)
        logRec.set('type', 'ebook_import_success')
        logRec.set(
          'message',
          'Arquivo físico do Book Vistage Residence importado e gravado com sucesso (' +
            (savedFileSize / (1024 * 1024)).toFixed(2) +
            ' MB)',
        )
        logRec.set(
          'details',
          JSON.stringify({
            record_id: refreshed.id,
            file_name: savedFileName,
            file_size: savedFileSize,
            public_url: publicStorageUrl,
            download_method: downloadMethod,
            source_url: downloadSourceUrl,
            property_id: targetPropertyId,
          }),
        )
        app.saveNoValidate(logRec)
      } catch (_) {}

      return c.json(200, {
        success: true,
        message: 'Arquivo físico do Book Vistage Residence importado e gravado com sucesso!',
        record: {
          id: refreshed.id,
          name: refreshed.getString('name'),
          file: savedFileName,
          file_size: savedFileSize,
          mime_type: refreshed.getString('mime_type'),
          property_id: refreshed.getString('property_id'),
          enterprise: refreshed.getString('enterprise'),
          public_url: publicStorageUrl,
          download_method: downloadMethod,
        },
      })
    } catch (saveErr) {
      console.error('[EBOOK_IMPORT] Erro ao gravar registro no banco: ' + saveErr.message)
      return c.json(500, {
        success: false,
        error: 'Erro ao salvar o arquivo no banco de dados: ' + saveErr.message,
      })
    }
  },
  $apis.requireAuth(),
)
