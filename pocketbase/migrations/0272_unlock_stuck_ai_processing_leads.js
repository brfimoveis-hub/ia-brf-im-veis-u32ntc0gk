/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Sanear tags ai_processing órfãs de clientes presos
    try {
      const records = app.findRecordsByFilter(
        'customers',
        "tags ~ 'ai_processing'",
        '-created',
        500,
        0,
      )
      const now = Date.now()
      let cleanedCount = 0

      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        let tags = rec.get('tags') || []
        if (typeof tags === 'string') {
          try {
            tags = JSON.parse(tags)
          } catch (_) {
            tags = [tags]
          }
        }
        if (!Array.isArray(tags)) tags = []

        let hasStaleTag = false
        const newTags = []

        for (let j = 0; j < tags.length; j++) {
          const tag = String(tags[j] || '').trim()
          if (tag.startsWith('ai_processing:')) {
            const tsStr = tag.replace('ai_processing:', '').trim()
            const ts = parseInt(tsStr, 10)
            // Se for inválido ou tiver mais de 3 minutos (180.000 ms), remover
            if (isNaN(ts) || now - ts > 180000 || rec.id === 'ixxm0wqdh6e4mdq') {
              hasStaleTag = true
              continue // ignora a tag
            }
          }
          newTags.push(tag)
        }

        if (hasStaleTag) {
          rec.set('tags', newTags)
          app.saveNoValidate(rec)
          cleanedCount++
        }
      }

      console.log(`[migration 0272] Saneamento concluído: ${cleanedCount} leads desbloqueados.`)
    } catch (err) {
      console.warn(`[migration 0272] Erro no saneamento de tags ai_processing: ${String(err)}`)
    }
  },
  (app) => {
    // Down migration
  },
)
