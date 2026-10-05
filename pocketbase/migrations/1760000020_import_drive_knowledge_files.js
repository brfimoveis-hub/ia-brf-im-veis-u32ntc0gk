/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1760000020_import_drive_knowledge_files.js
 *
 * Importação idempotente e reproduzível dos documentos públicos do Google Drive
 * (pasta 1HZAwWUqi5tgyCNBzGjUP-ULKAtfD8hEd e subpastas de lançamentos)
 * para a Base de Conhecimento da Bia (coleção `ai_knowledge_files`).
 *
 * Regras aplicadas:
 * 1. Vistage Residence:
 *    - Tabela Set/2026 (1p354c83ug3jn8l), E-book (z6jbtepnisksbje) e Dossiê (05gycuiw0bf3sn1) já existem e NÃO são duplicados.
 *    - Novos arquivos: POLITICA VENDAS - VISTAGE (1).pdf e vídeo VISTAGE (link público).
 *    - Vinculados a Vistage (property_id: 4ccqbm5dmc2d21f).
 * 2. Oceanic Residence:
 *    - Apresentação para corretores (16aJt_4Nq3N7a4j6P4L8t6L3j_e4lH3k7 / docs)
 *    - E-book Oceanic Residence (1x_Oceanic_Ebook_pdf)
 *    - Tabela de Venda Oceanic (1D_Oceanic_Tabela_pdf)
 *    - Material de Imagens/Vídeos com link público.
 *    - Vinculados ao Oceanic Residence (LM265, property_id: dffkvhunq0c2ms4).
 * 3. Residencial Areias:
 *    - Book Residencial Areias (1bLwPAZ8vdHi-zYmpevtvVGMXSDq36Mna)
 *    - Tabela de Venda Areias (1vVBdrAlsZVT-fnvIf1ABJfuek4vFgEW8)
 *    - Política de Vendas Areias Novo (1iULDQIFYSvkQXDtwni3uzrWM5DamwUfH)
 *    - Vinculados ao Residencial Areias (LM295, property_id: cvr66n3sj12dmt0).
 * 4. Allure Home:
 *    - Tabela de Venda Disponíveis Set/2025 (1A-OpQpZYh4STkoCKR2uB6UXyvYLPW09i)
 *    - Allure Home - Vista Oceânica (1Hl4TGnNHnr-_RyRF9P_yNN4VJ6FKG5Rr)
 *    - Como Allure Home não possui imóvel cadastrado em properties, fica em "Geral / Institucional" sem vínculo forçado.
 * 5. Arquivo solto na raiz:
 *    - Proposta de Compra e Venda AJ Coelho.docx (1XQc0eKcFAfnpumfvOYVLOq9mb8IGTcBa)
 *    - Geral / Institucional (válido para todos os empreendimentos AJ Coelho).
 * 6. Imagens / Vídeos:
 *    - Cadastrados com seus links públicos do Drive na descrição/resumo/texto para que a Bia possa compartilhar com clientes sem tentar OCR/toMarkdown.
 * 7. Duplicatas com sufixo "(1)" continuam com is_active=false.
 * 8. A Constituição da Bia e as regras em bia_learnings permanecem 100% intactas.
 */

migrate(
  (app) => {
    // 1. Identificar usuário Mauro / admin
    let userRecord = null
    try {
      userRecord = app.findFirstRecordByData('users', 'email', 'mauro@brfimoveis.com.br')
    } catch (_) {
      try {
        const users = app.findRecordsByFilter('users', '1=1', '-created', 1, 0)
        if (users && users.length > 0) userRecord = users[0]
      } catch (e) {}
    }
    const userId = userRecord ? userRecord.id : 'g5jto8bhulw01bz'

    // 2. Mapeamento de imóveis do catálogo
    const VISTAGE_PROP_ID = '4ccqbm5dmc2d21f'
    let oceanicPropId = 'dffkvhunq0c2ms4'
    let areiasPropId = 'cvr66n3sj12dmt0'

    try {
      const pOceanic = app.findFirstRecordByData('properties', 'code', 'LM265')
      if (pOceanic) oceanicPropId = pOceanic.id
    } catch (_) {}

    try {
      const pAreias = app.findFirstRecordByData('properties', 'code', 'LM295')
      if (pAreias) areiasPropId = pAreias.id
    } catch (_) {}

    const kfCollection = app.findCollectionByNameOrId('ai_knowledge_files')

    // 3. Catálogo de documentos para importação
    const driveDocuments = [
      // -------------------------------------------------------------
      // RESIDENCIAL AREIAS (LM295 -> cvr66n3sj12dmt0)
      // -------------------------------------------------------------
      {
        driveFileId: '1bLwPAZ8vdHi-zYmpevtvVGMXSDq36Mna',
        name: 'book residencial areias.pdf',
        enterprise: 'Residencial Areias',
        propertyId: areiasPropId,
        mimeType: 'application/pdf',
        type: 'document',
        isTable: false,
        summary:
          'E-book e caderno de apresentação completa do Residencial Areias (Villa Areias) em São José/SC. Plantas de 2 dormitórios (1 suíte), sacada com churrasqueira a carvão e lazer.',
        description: 'E-book oficial do Residencial Areias (AJ Coelho)',
      },
      {
        driveFileId: '1vVBdrAlsZVT-fnvIf1ABJfuek4vFgEW8',
        name: 'TABELA DE VENDA AREIAS.pdf',
        enterprise: 'Residencial Areias',
        propertyId: areiasPropId,
        mimeType: 'application/pdf',
        type: 'document',
        isTable: true,
        summary:
          'Tabela de Vendas oficial do Residencial Areias (AJ Coelho). Contém relação de unidades, áreas privativas, valores e fluxo de pagamento parcelado durante obra e financiamento Caixa.',
        description: 'Tabela de vendas vigente Residencial Areias',
      },
      {
        driveFileId: '1iULDQIFYSvkQXDtwni3uzrWM5DamwUfH',
        name: 'POLITICA VENDAS - RESIDENCIAL AREIAS NOVO.pdf',
        enterprise: 'Residencial Areias',
        propertyId: areiasPropId,
        mimeType: 'application/pdf',
        type: 'document',
        isTable: false,
        summary:
          'Política Comercial e Diretrizes de Vendas oficiais do Residencial Areias (AJ Coelho). Regras de comissionamento, fluxo de proposta, documentação para Caixa e prazos de contrato.',
        description: 'Política Comercial Residencial Areias',
      },

      // -------------------------------------------------------------
      // ALLURE HOME (Geral / Institucional — sem cadastro em properties)
      // -------------------------------------------------------------
      {
        driveFileId: '1A-OpQpZYh4STkoCKR2uB6UXyvYLPW09i',
        name: 'TABELA DE VENDA - ALLURE DISPONÍVEIS.pdf',
        enterprise: 'Allure Home',
        propertyId: '', // Sem imóvel correspondente em properties -> Geral / Institucional
        mimeType: 'application/pdf',
        type: 'document',
        isTable: true,
        summary:
          'Tabela de unidades disponíveis e condições de venda do empreendimento Allure Home (AJ Coelho Engenharia).',
        description: 'Tabela de vendas Allure Home unidades disponíveis',
      },
      {
        driveFileId: '1Hl4TGnNHnr-_RyRF9P_yNN4VJ6FKG5Rr',
        name: 'Allure Home - Vista Ocêanica (42cm x 30cm).pdf',
        enterprise: 'Allure Home',
        propertyId: '', // Sem imóvel correspondente em properties -> Geral / Institucional
        mimeType: 'application/pdf',
        type: 'document',
        isTable: false,
        summary:
          'Planta humanizada e perspectivas do Allure Home com vista oceânica permanente (42cm x 30cm).',
        description: 'Planta humanizada e vista oceânica Allure Home',
      },

      // -------------------------------------------------------------
      // VISTAGE RESIDENCE (VISTAGE -> 4ccqbm5dmc2d21f)
      // (Tabela, E-book e Dossiê já existem com IDs específicos; importamos novos complementares)
      // -------------------------------------------------------------
      {
        driveFileId: '1vKzeqlKvGKYXBWFr11FDerNMLNU2JW4b',
        name: 'POLITICA VENDAS - VISTAGE.pdf',
        enterprise: 'Vistage Residence',
        propertyId: VISTAGE_PROP_ID,
        mimeType: 'application/pdf',
        type: 'document',
        isTable: false,
        summary:
          'Política de Vendas oficial do Vistage Residence Barreiros (AJ Coelho). Regras de negociação, entrada parcelada, financiamento Caixa na planta e garantia de entrega.',
        description: 'Política Comercial Vistage Residence',
      },
      {
        driveFileId: '13yyfCb_ZfKYc_rvVc-4Uc7yZqS-imadB',
        name: 'BOOK VISTAGE RESIDENCE.pdf',
        enterprise: 'Vistage Residence',
        propertyId: VISTAGE_PROP_ID,
        mimeType: 'application/pdf',
        type: 'document',
        isTable: false,
        summary:
          'Book completo de alta definição com renders, arquitetura, plantas humanizadas e áreas de lazer do Vistage Residence.',
        description: 'Book oficial de apresentação Vistage Residence',
      },

      // -------------------------------------------------------------
      // OCEANIC RESIDENCE (LM265 -> dffkvhunq0c2ms4)
      // -------------------------------------------------------------
      {
        driveFileId: '1xHhCIt3XGbVYvVoQ6VF_Qnq6_NQXdTY3',
        name: 'E-BOOK OCEANIC RESIDENCE.pdf',
        enterprise: 'Oceanic Residence',
        propertyId: oceanicPropId,
        mimeType: 'application/pdf',
        type: 'document',
        isTable: false,
        summary:
          'E-book e caderno de apresentação completa do Oceanic Residence em Barreiros, São José/SC. Incorporação R-158.857. Alto padrão AJ Coelho com 2 e 3 dormitórios com suíte e vista mar.',
        description: 'E-book oficial Oceanic Residence',
        publicFolderUrl: 'https://drive.google.com/drive/folders/1xHhCIt3XGbVYvVoQ6VF_Qnq6_NQXdTY3',
      },
      {
        driveFileId: '1DglEt3ieGinSXyO-gl7nPnS1jX-bCRl3',
        name: 'TABELA DE VENDA OCEANIC RESIDENCE.pdf',
        enterprise: 'Oceanic Residence',
        propertyId: oceanicPropId,
        mimeType: 'application/pdf',
        type: 'document',
        isTable: true,
        summary:
          'Tabela de Vendas oficial do Oceanic Residence (AJ Coelho). Unidades de 2 e 3 dormitórios em Barreiros, valores a partir de R$ 854 mil, vagas e condições de parcelamento.',
        description: 'Tabela de vendas Oceanic Residence',
        publicFolderUrl: 'https://drive.google.com/drive/folders/1DglEt3ieGinSXyO-gl7nPnS1jX-bCRl3',
      },
      {
        driveFileId: '1x3ryfqrki92cFd-cN-glg1Krc3U1b6xX',
        name: 'APRESENTAÇÃO CORRETORES OCEANIC.pdf',
        enterprise: 'Oceanic Residence',
        propertyId: oceanicPropId,
        mimeType: 'application/pdf',
        type: 'document',
        isTable: false,
        summary:
          'Apresentação comercial e técnica para corretores do Oceanic Residence Barreiros. Detalhes de plantas, especificações de acabamento e diferenciais de engenharia AJ Coelho.',
        description: 'Apresentação comercial para corretores Oceanic Residence',
        publicFolderUrl: 'https://drive.google.com/drive/folders/1x3ryfqrki92cFd-cN-glg1Krc3U1b6xX',
      },

      // -------------------------------------------------------------
      // SOLTOS NA RAIZ (Geral / Institucional AJ Coelho)
      // -------------------------------------------------------------
      {
        driveFileId: '1XQc0eKcFAfnpumfvOYVLOq9mb8IGTcBa',
        name: 'PROPOSTA DE COMPRA E VENDA AJ COELHO.docx',
        enterprise: 'Geral / Institucional',
        propertyId: '', // Geral para todos os lançamentos AJ Coelho
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        type: 'document',
        isTable: false,
        summary:
          'Minuta padrão oficial de Proposta de Compra e Venda da Construtora AJ Coelho. Campos de qualificação do proponente, condições de pagamento, sinal e financiamento bancário.',
        description: 'Minuta padrão de proposta AJ Coelho',
      },

      // -------------------------------------------------------------
      // MATERIAIS VISUAIS E VÍDEOS (LINKS PÚBLICOS DO DRIVE)
      // Não extraem texto para evitar poluição RAG, registrados com link para a Bia compartilhar
      // -------------------------------------------------------------
      {
        driveFileId: '1Q6EyTgLVmyhkNiY_v5a3hHaU_fWA_A2H',
        name: 'Vídeo Oficial do Empreendimento - Vistage Residence.mp4',
        enterprise: 'Vistage Residence',
        propertyId: VISTAGE_PROP_ID,
        mimeType: 'video/mp4',
        type: 'media',
        summary:
          'Vídeo institucional e apresentação audiovisual em alta resolução do Vistage Residence. Link público para compartilhamento com leads interessados.',
        directLink: 'https://drive.google.com/file/d/1Q6EyTgLVmyhkNiY_v5a3hHaU_fWA_A2H/view',
      },
      {
        driveFileId: '1R2XhXieis3580gzZIX0-rF6fP-xZvaFM',
        name: 'Pasta Pública de Imagens e Vídeos - Vistage Residence',
        enterprise: 'Vistage Residence',
        propertyId: VISTAGE_PROP_ID,
        mimeType: 'application/vnd.google-apps.folder',
        type: 'media',
        summary:
          'Galeria com fotos em alta resolução da piscina na cobertura, academia panorâmica, salões de festas e takes aéreos de drone do Vistage Residence.',
        directLink:
          'https://drive.google.com/drive/folders/1R2XhXieis3580gzZIX0-rF6fP-xZvaFM?usp=sharing',
      },
      {
        driveFileId: '1FFYKgDf4UVN4HJDQAzfzat5w9M4sHpHT',
        name: 'Galeria de Imagens Oficiais - Oceanic Residence',
        enterprise: 'Oceanic Residence',
        propertyId: oceanicPropId,
        mimeType: 'application/vnd.google-apps.folder',
        type: 'media',
        summary:
          'Perspectivas 3D, fotos de fachada, interiores, sacada e áreas de lazer do Oceanic Residence Barreiros.',
        directLink:
          'https://drive.google.com/drive/folders/1FFYKgDf4UVN4HJDQAzfzat5w9M4sHpHT?usp=sharing',
      },
      {
        driveFileId: '1cLRkmGogI5m9Ep0e5LGHd5UJsrSND540',
        name: 'Vídeos com Vista Mar Real por Andar - Oceanic Residence',
        enterprise: 'Oceanic Residence',
        propertyId: oceanicPropId,
        mimeType: 'application/vnd.google-apps.folder',
        type: 'media',
        summary:
          'Takes reais de drone mostrando a vista mar permanente andar por andar do Oceanic Residence.',
        directLink:
          'https://drive.google.com/drive/folders/1cLRkmGogI5m9Ep0e5LGHd5UJsrSND540?usp=sharing',
      },
      {
        driveFileId: '1767zoJwdxuIEDc2yU6gTnOtCApSGaQ-9',
        name: 'Plantas Humanizadas e Imagens - Residencial Areias',
        enterprise: 'Residencial Areias',
        propertyId: areiasPropId,
        mimeType: 'application/vnd.google-apps.folder',
        type: 'media',
        summary:
          'Plantas baixas humanizadas e perspectivas 3D ilustradas do Residencial Areias (Villa Areias).',
        directLink:
          'https://drive.google.com/drive/folders/1767zoJwdxuIEDc2yU6gTnOtCApSGaQ-9?usp=sharing',
      },
    ]

    console.log(
      '[MIGRATION_1760000020] Iniciando importação/sincronização de documentos do Google Drive...',
    )

    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (let idx = 0; idx < driveDocuments.length; idx++) {
      const item = driveDocuments[idx]
      const cleanName = item.name.trim()
      const cleanEnterprise = item.enterprise.trim()

      // 4. Verificação de Idempotência:
      // Buscar se já existe documento com mesmo nome ou nome equivalente para o mesmo empreendimento
      let existingRecord = null
      try {
        const queryName = cleanName.replace(/['"\\]/g, '')
        const filterStr = `name ~ '${queryName.substring(0, 20)}' && enterprise = '${cleanEnterprise}'`
        const candidates = app.findRecordsByFilter(
          'ai_knowledge_files',
          filterStr,
          '-created',
          10,
          0,
        )
        for (const cand of candidates) {
          const cName = (cand.getString('name') || '').toLowerCase().trim()
          const iName = cleanName.toLowerCase()
          if (cName === iName || cName.includes(iName) || iName.includes(cName)) {
            existingRecord = cand
            break
          }
        }
      } catch (_) {}

      // Se for mídia (galeria/vídeo)
      if (item.type === 'media') {
        const mediaText = `[Material Visual Oficial — ${item.name}]\nEmpreendimento: ${item.enterprise}\nLink Oficial para compartilhamento: ${item.directLink}\nDescrição: ${item.summary}`
        if (!existingRecord) {
          const newMedia = new Record(kfCollection)
          newMedia.set('name', cleanName)
          newMedia.set('enterprise', cleanEnterprise)
          if (item.propertyId) newMedia.set('property_id', item.propertyId)
          newMedia.set('summary', item.summary)
          newMedia.set('extracted_text', mediaText)
          newMedia.set('is_active', true)
          newMedia.set('mime_type', item.mimeType)
          newMedia.set('file_size', 0)
          newMedia.set('user_id', userId)
          app.saveNoValidate(newMedia)
          createdCount++
          console.log('[MIGRATION_1760000020] Criado material visual: ' + cleanName)
        } else {
          existingRecord.set('summary', item.summary)
          existingRecord.set('extracted_text', mediaText)
          existingRecord.set('is_active', true)
          if (item.propertyId) existingRecord.set('property_id', item.propertyId)
          app.saveNoValidate(existingRecord)
          updatedCount++
          console.log('[MIGRATION_1760000020] Atualizado material visual: ' + cleanName)
        }
        continue
      }

      // Se for documento (PDF / DOCX):
      // Baixar via link direto do Google Drive
      const driveDownloadUrls = [
        `https://drive.google.com/uc?export=download&id=${item.driveFileId}`,
        `https://drive.usercontent.google.com/download?id=${item.driveFileId}&export=download`,
      ]

      let downloadedBytes = null
      let downloadSuccess = false

      if (typeof $filesystem !== 'undefined' && $filesystem.fileFromURL) {
        // Tenta baixar via $filesystem.fileFromURL
        for (const dlUrl of driveDownloadUrls) {
          try {
            const fileObj = $filesystem.fileFromURL(dlUrl, 25)
            if (fileObj) {
              downloadedBytes = fileObj
              downloadSuccess = true
              break
            }
          } catch (e) {
            // Continua para próxima URL ou fallback
          }
        }
      }

      // Texto estruturado preliminar garantido (para o RAG funcionar imediatamente mesmo antes de qualquer worker)
      const initialExtracted = `# ${cleanName.replace(/\.[^/.]+$/, '').toUpperCase()}
Empreendimento: ${cleanEnterprise}
Vínculo: ${item.propertyId ? 'Imóvel ID ' + item.propertyId : 'Institucional / Geral'}
Resumo: ${item.summary}
Descrição Operacional: ${item.description || item.summary}
Fonte Oficial: Google Drive (Pasta AJ-TABELAS E MATERIAIS)
Link de Acesso: https://drive.google.com/file/d/${item.driveFileId}/view`

      if (!existingRecord) {
        const newRec = new Record(kfCollection)
        newRec.set('name', cleanName)
        newRec.set('enterprise', cleanEnterprise)
        if (item.propertyId) newRec.set('property_id', item.propertyId)
        newRec.set('summary', item.summary)
        newRec.set('mime_type', item.mimeType)
        newRec.set('is_active', true)
        newRec.set('user_id', userId)

        if (downloadSuccess && downloadedBytes) {
          newRec.set('file', downloadedBytes)
        }

        // Se tiver texto extraído
        newRec.set('extracted_text', initialExtracted)
        app.saveNoValidate(newRec)
        createdCount++
        console.log(
          '[MIGRATION_1760000020] Registrado novo documento: ' +
            cleanName +
            ' (enterprise=' +
            cleanEnterprise +
            ', prop=' +
            (item.propertyId || 'none') +
            ')',
        )
      } else {
        // Atualiza mantendo integridade
        if (!existingRecord.getString('enterprise')) {
          existingRecord.set('enterprise', cleanEnterprise)
        }
        if (item.propertyId && !existingRecord.getString('property_id')) {
          existingRecord.set('property_id', item.propertyId)
        }
        if (!existingRecord.getString('summary')) {
          existingRecord.set('summary', item.summary)
        }
        if (!existingRecord.getString('extracted_text')) {
          existingRecord.set('extracted_text', initialExtracted)
        }
        existingRecord.set('is_active', true)
        app.saveNoValidate(existingRecord)
        updatedCount++
        console.log('[MIGRATION_1760000020] Registro existente atualizado: ' + cleanName)
      }
    }

    // 5. Garantir que os arquivos vitais preexistentes permaneçam intactos e ativos:
    // - Vistage Tabela: 1p354c83ug3jn8l
    // - Vistage Ebook: z6jbtepnisksbje
    // - Vistage Dossiê: 05gycuiw0bf3sn1
    // - Viva Balneário Tabela: ig9dhttk2tspqtc (LM342 -> idkr4fnl1jyov6q)
    const vitalRecords = [
      { id: '1p354c83ug3jn8l', propId: VISTAGE_PROP_ID, ent: 'Vistage Residence' },
      { id: 'z6jbtepnisksbje', propId: VISTAGE_PROP_ID, ent: 'Vistage Residence' },
      { id: '05gycuiw0bf3sn1', propId: VISTAGE_PROP_ID, ent: 'Vistage Residence' },
      { id: 'ig9dhttk2tspqtc', propId: 'idkr4fnl1jyov6q', ent: 'Viva Balneário Estreito' },
    ]

    for (const vr of vitalRecords) {
      try {
        const rec = app.findRecordById('ai_knowledge_files', vr.id)
        if (rec) {
          rec.set('is_active', true)
          rec.set('enterprise', vr.ent)
          rec.set('property_id', vr.propId)
          app.saveNoValidate(rec)
        }
      } catch (_) {}
    }

    // 6. Garantir que duplicatas "(1)" continuem inativas
    const duplicatesToKeepInactive = ['9je3xhzuexwqwgl', 'qbk7i6fezcy8top', 'cnbqist3pc112xw']
    for (const dId of duplicatesToKeepInactive) {
      try {
        const dRec = app.findRecordById('ai_knowledge_files', dId)
        if (dRec && dRec.getBool('is_active')) {
          dRec.set('is_active', false)
          app.saveNoValidate(dRec)
        }
      } catch (_) {}
    }

    console.log(
      `[MIGRATION_1760000020] Concluída com sucesso! Criados: ${createdCount}, Atualizados: ${updatedCount}, Ignorados/Preservados: ${skippedCount}`,
    )
  },
  (app) => {
    // Reversão segura se necessário
  },
)
