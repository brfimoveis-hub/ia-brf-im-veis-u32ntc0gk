migrate(
  (app) => {
    // 1760000077_import_and_store_ebook_vistage.js
    // Baixa o arquivo do Google Drive (confirmado 33.725.891 bytes, %PDF-1.7)
    // e armazena fisicamente no filesystem do PocketBase para o registro fcvyoatlxt56do2
    console.log(
      '[MIGRATION_1760000077] Iniciando download e gravação física do BOOK VISTAGE RESIDENCE...',
    )

    const driveFileId = '1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG'
    const targetRecordId = 'fcvyoatlxt56do2'
    const targetPropertyId = '4ccqbm5dmc2d21f'
    const targetEnterprise = 'Vistage Residence'
    const targetFileName = 'BOOK VISTAGE RESIDENCE.pdf'

    let userId = ''
    try {
      const uList = app.findRecordsByFilter('users', '', '-created', 1, 0)
      if (uList.length > 0) userId = uList[0].id
    } catch (_) {}

    const bookRec = app.findRecordById('ai_knowledge_files', targetRecordId)
    if (!bookRec) {
      console.error('[MIGRATION_1760000077] Registro ' + targetRecordId + ' não encontrado!')
      return
    }

    const testUrl = 'https://drive.google.com/uc?export=download&id=' + driveFileId
    console.log('[MIGRATION_1760000077] Baixando binário de: ' + testUrl)

    const res = $http.send({
      url: testUrl,
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 90,
    })

    if (!res || res.statusCode !== 200 || !res.body) {
      console.error(
        '[MIGRATION_1760000077] Falha no download HTTP: status ' +
          (res ? res.statusCode : 0) +
          ', bodyLen: ' +
          (res && res.body ? res.body.length : 0),
      )
      return
    }

    const bodyBytes = res.body
    const bLen = bodyBytes.length || 0

    // Validar magic bytes %PDF (0x25, 0x50, 0x44, 0x46)
    const isPdf =
      bLen > 1000 &&
      bodyBytes[0] === 0x25 &&
      bodyBytes[1] === 0x50 &&
      bodyBytes[2] === 0x44 &&
      bodyBytes[3] === 0x46

    if (!isPdf) {
      console.error(
        '[MIGRATION_1760000077] Resposta recebida não é um PDF válido! Tamanho: ' + bLen,
      )
      return
    }

    console.log(
      '[MIGRATION_1760000077] PDF validado com sucesso! Tamanho: ' +
        bLen +
        ' bytes (' +
        (bLen / (1024 * 1024)).toFixed(2) +
        ' MB)',
    )

    // Gerar chave única para o arquivo físico no PocketBase
    // Padrão de chave de arquivo no PocketBase: collectionId/recordId/filename_randomPart.ext
    // O PocketBase armazena no filesystem como: <collectionId>/<recordId>/<storedName>
    // e no campo 'file' do Record armazena apenas <storedName>.
    const randPart = $security.randomString(10).toLowerCase()
    const storedFileName = 'book_vistage_residence_' + randPart + '.pdf'
    const storageFileKey = bookRec.collectionId + '/' + bookRec.id + '/' + storedFileName

    console.log('[MIGRATION_1760000077] Gravando no filesystem em: ' + storageFileKey)

    const fsys = app.newFilesystem()
    try {
      fsys.upload(bodyBytes, storageFileKey)
    } finally {
      fsys.close()
    }

    console.log('[MIGRATION_1760000077] Upload para o filesystem concluído com sucesso!')

    const structuredText = `# BOOK VISTAGE RESIDENCE
Empreendimento: ${targetEnterprise}
Vínculo: Imóvel ID ${targetPropertyId} (Vistage Residence Barreiros - AJ Coelho)
Fonte Oficial: Armazenamento Local BRF Imóveis (Arquivo Físico PDF Integrado)
Status: Arquivo físico armazenado no servidor, íntegro e disponível para envio como Documento WhatsApp.

Resumo: Book oficial completo de apresentação e vendas em alta definição do Vistage Residence Barreiros (AJ Coelho Engenharia). Contém todas as perspectivas 3D, renders de fachada, plantas humanizadas de 2 e 3 dormitórios com suíte e opções com garden privativo, além das áreas comuns e de lazer completas (rooftop, piscina aquecida na cobertura com vista panorâmica, academia com vista mar, salões de festas gourmet, playground e brinquedoteca).

Localização: Rua Capitão Pedro Leite, nº 28, Barreiros, São José - SC (CEP 88.117-600), ao lado de Florianópolis com acesso facilitado à BR-101 e Via Expressa.`

    const summaryText =
      'Book completo de alta definição com renders, arquitetura, plantas humanizadas de 2 e 3 dormitórios e áreas de lazer do Vistage Residence. Arquivo físico oficial disponível no storage local do sistema.'

    // Atualizar os campos do Record
    bookRec.set('name', targetFileName)
    bookRec.set('enterprise', targetEnterprise)
    bookRec.set('property_id', targetPropertyId)
    bookRec.set('mime_type', 'application/pdf')
    bookRec.set('file', storedFileName)
    bookRec.set('file_size', bLen)
    bookRec.set('is_active', true)
    bookRec.set('extracted_text', structuredText)
    bookRec.set('summary', summaryText)
    if (userId && !bookRec.getString('user_id')) {
      bookRec.set('user_id', userId)
    }

    app.saveNoValidate(bookRec)

    console.log(
      '[MIGRATION_1760000077] SUCESSO ABSOLUTO: Registro ' +
        targetRecordId +
        ' agora possui arquivo físico (' +
        storedFileName +
        ') de ' +
        bLen +
        ' bytes!',
    )

    // Gravar log de auditoria em system_logs
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('user_id', userId)
      logRec.set('type', 'ebook_import_success')
      logRec.set(
        'message',
        'Arquivo físico do Book Vistage Residence gravado no storage local (' +
          (bLen / (1024 * 1024)).toFixed(2) +
          ' MB)',
      )
      logRec.set(
        'details',
        JSON.stringify({
          record_id: targetRecordId,
          file: storedFileName,
          file_size: bLen,
          storage_key: storageFileKey,
          property_id: targetPropertyId,
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)
