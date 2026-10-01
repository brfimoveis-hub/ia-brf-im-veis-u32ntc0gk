/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Limpar as 14 travas ai_processing órfãs existentes usando SQL direto exatamente conforme solicitado
    try {
      app
        .db()
        .newQuery(
          "UPDATE customers SET tags = (SELECT json_group_array(value) FROM json_each(customers.tags) WHERE value NOT LIKE 'ai_processing%') WHERE tags LIKE '%ai_processing%';",
        )
        .execute()
      console.log('[migration 0273] Travas ai_processing órfãs removidas com sucesso via SQL.')
    } catch (err) {
      console.warn(`[migration 0273] Erro ao limpar travas ai_processing via SQL: ${String(err)}`)
    }

    // 2. Garantir saneamento tolerante por API caso algum JSON de tags estivesse mal formatado
    try {
      const records = app.findRecordsByFilter(
        'customers',
        "tags ~ 'ai_processing'",
        '-created',
        500,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        let rawTags = rec.get('tags') || []
        let tags = []
        if (typeof rawTags === 'string') {
          try {
            tags = JSON.parse(rawTags)
          } catch (_) {
            tags = [rawTags]
          }
        } else if (Array.isArray(rawTags)) {
          tags = rawTags
        }
        const filtered = tags.filter(
          (t) => typeof t === 'string' && t !== 'ai_processing' && !t.startsWith('ai_processing:'),
        )
        rec.set('tags', filtered)
        app.saveNoValidate(rec)
      }
    } catch (e) {
      console.warn(`[migration 0273] Saneamento secundário de tags: ${String(e)}`)
    }
  },
  (app) => {
    // Reversão não necessária para limpeza de travas transitórias
  },
)
