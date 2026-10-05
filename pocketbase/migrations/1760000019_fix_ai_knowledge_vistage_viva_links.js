/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Relinkar E-book Vistage (z6jbtepnisksbje) para o imóvel correto do Vistage: 4ccqbm5dmc2d21f
    try {
      const ebookRec = app.findRecordById('ai_knowledge_files', 'z6jbtepnisksbje')
      if (ebookRec) {
        ebookRec.set('property_id', '4ccqbm5dmc2d21f')
        ebookRec.set('enterprise', 'Vistage Residence')
        ebookRec.set('is_active', true)
        app.saveNoValidate(ebookRec)
        console.log(
          '[MIGRATION_1760000019] E-book Vistage z6jbtepnisksbje relinkado para 4ccqbm5dmc2d21f.',
        )
      }
    } catch (err) {
      console.warn('[MIGRATION_1760000019] Erro ao relinkar z6jbtepnisksbje: ' + String(err))
    }

    // 2. Vincular Tabela Viva Balneário - Maio 2026.pdf (ig9dhttk2tspqtc) ao imóvel LM342: idkr4fnl1jyov6q
    try {
      const vivaTableRec = app.findRecordById('ai_knowledge_files', 'ig9dhttk2tspqtc')
      if (vivaTableRec) {
        vivaTableRec.set('property_id', 'idkr4fnl1jyov6q')
        vivaTableRec.set('enterprise', 'Viva Balneário Estreito')
        vivaTableRec.set('is_active', true)
        app.saveNoValidate(vivaTableRec)
        console.log(
          '[MIGRATION_1760000019] Tabela Viva Balneário ig9dhttk2tspqtc vinculada a idkr4fnl1jyov6q.',
        )
      }
    } catch (err) {
      console.warn('[MIGRATION_1760000019] Erro ao vincular ig9dhttk2tspqtc: ' + String(err))
    }

    // Também vincular os books do Viva Balneário (huf06dqw8q68yxl, byklgyubb4hamo7) caso estejam sem property_id
    try {
      const booksViva = ['huf06dqw8q68yxl', 'byklgyubb4hamo7']
      for (const bId of booksViva) {
        try {
          const bRec = app.findRecordById('ai_knowledge_files', bId)
          if (bRec && !bRec.getString('property_id')) {
            bRec.set('property_id', 'idkr4fnl1jyov6q')
            bRec.set('enterprise', 'Viva Balneário Estreito')
            app.saveNoValidate(bRec)
            console.log(
              '[MIGRATION_1760000019] Book Viva Balneário ' + bId + ' vinculado a idkr4fnl1jyov6q.',
            )
          }
        } catch (_) {}
      }
    } catch (_) {}

    // 3. Reativar e vincular documentos oficiais do Vistage:
    // - 1p354c83ug3jn8l ("TABELA VISTAGE.pdf", válida a partir de Setembro/2026) -> is_active = true, property_id = 4ccqbm5dmc2d21f
    // - 05gycuiw0bf3sn1 ("BRF IMÓVEIS & CONSTRUTORA AJ COELHO.docx", dossiê) -> is_active = true, property_id = 4ccqbm5dmc2d21f
    try {
      const tabelaVistage = app.findRecordById('ai_knowledge_files', '1p354c83ug3jn8l')
      if (tabelaVistage) {
        tabelaVistage.set('is_active', true)
        tabelaVistage.set('property_id', '4ccqbm5dmc2d21f')
        tabelaVistage.set('enterprise', 'Vistage Residence')
        app.saveNoValidate(tabelaVistage)
        console.log(
          '[MIGRATION_1760000019] TABELA VISTAGE.pdf 1p354c83ug3jn8l reativada e vinculada a 4ccqbm5dmc2d21f.',
        )
      }
    } catch (err) {
      console.warn('[MIGRATION_1760000019] Erro ao reativar 1p354c83ug3jn8l: ' + String(err))
    }

    try {
      const dossieVistage = app.findRecordById('ai_knowledge_files', '05gycuiw0bf3sn1')
      if (dossieVistage) {
        dossieVistage.set('is_active', true)
        dossieVistage.set('property_id', '4ccqbm5dmc2d21f')
        dossieVistage.set('enterprise', 'Vistage Residence')
        app.saveNoValidate(dossieVistage)
        console.log(
          '[MIGRATION_1760000019] Dossiê Vistage 05gycuiw0bf3sn1 reativado e vinculado a 4ccqbm5dmc2d21f.',
        )
      }
    } catch (err) {
      console.warn('[MIGRATION_1760000019] Erro ao reativar 05gycuiw0bf3sn1: ' + String(err))
    }

    // 4. Garantir que as variantes duplicadas "(1)" permaneçam inativas:
    // - 9je3xhzuexwqwgl
    // - qbk7i6fezcy8top
    // - cnbqist3pc112xw (outra cópia inativa de tabela antiga)
    const inactiveDuplicates = ['9je3xhzuexwqwgl', 'qbk7i6fezcy8top', 'cnbqist3pc112xw']
    for (const dupId of inactiveDuplicates) {
      try {
        const dupRec = app.findRecordById('ai_knowledge_files', dupId)
        if (dupRec && dupRec.getBool('is_active')) {
          dupRec.set('is_active', false)
          app.saveNoValidate(dupRec)
          console.log('[MIGRATION_1760000019] Duplicata ' + dupId + ' garantida inativa.')
        }
      } catch (_) {}
    }
  },
  (app) => {
    // Reversão segura
  },
)
