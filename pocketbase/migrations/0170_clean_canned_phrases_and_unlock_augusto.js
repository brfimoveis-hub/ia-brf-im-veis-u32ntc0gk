/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Clean stuck ai_processing locks from all customers (specifically Augusto 7ccs86jq0sz7ibe and any others)
    try {
      const customers = app.findRecordsByFilter('customers', '1=1', '-created', 5000, 0)
      let cleanedLocksCount = 0

      for (const customer of customers) {
        let rawTags = customer.get('tags')
        let tags = []

        if (Array.isArray(rawTags)) {
          tags = rawTags.filter((t) => typeof t === 'string')
        } else if (typeof rawTags === 'string') {
          try {
            const parsed = JSON.parse(rawTags)
            if (Array.isArray(parsed)) {
              tags = parsed.filter((t) => typeof t === 'string')
            }
          } catch (_) {
            tags = []
          }
        }

        const hasLock = tags.some((t) => t === 'ai_processing' || t.startsWith('ai_processing:'))
        if (hasLock) {
          const cleanTags = tags.filter(
            (t) => t !== 'ai_processing' && !t.startsWith('ai_processing:'),
          )
          customer.set('tags', cleanTags)
          try {
            app.saveNoValidate(customer)
            cleanedLocksCount++
            console.log('[MIGRATION_0170] Cleaned lock tag on customer ' + customer.id)
          } catch (saveErr) {
            console.warn(
              '[MIGRATION_0170] Failed to save customer tags for ' +
                customer.id +
                ': ' +
                String(saveErr),
            )
          }
        }
      }
      console.log(`[MIGRATION_0170] Total customers unlocked: ${cleanedLocksCount}`)
    } catch (e) {
      console.warn('[MIGRATION_0170] Error checking customers locks: ' + String(e))
    }

    // Direct fallback SQL to make 100% sure customer 7ccs86jq0sz7ibe (Augusto) has no ai_processing tag
    try {
      app
        .db()
        .newQuery(
          "UPDATE customers SET tags = (SELECT json_group_array(value) FROM json_each(customers.tags) WHERE value NOT LIKE 'ai_processing%') WHERE id = '7ccs86jq0sz7ibe'",
        )
        .execute()
    } catch (sqlErr) {
      console.warn('[MIGRATION_0170] SQL lock clear on Augusto (non-fatal): ' + String(sqlErr))
    }

    // 2. Deep clean canned phrases from users (ai_instructions, bia_instructions)
    try {
      const users = app.findRecordsByFilter('users', "email != ''", '', 100, 0)
      for (const u of users) {
        let ai = u.getString('ai_instructions') || ''
        let bia = u.getString('bia_instructions') || ''
        let changed = false

        const cleanTxt = (txt) => {
          if (!txt) return ''
          return txt
            .replace(/3\.\s*Gestão de Interrupções:.*?\(Retorno à Cadência 2\)\.?/gi, '')
            .replace(
              /1\.\s*GESTÃO DE INTERRUPÇÕES\s*[\u2010-\u2015\-—].*?sem confrontar o cliente\.?/gi,
              '',
            )
            .replace(
              /responda\s+(?:EXATAMENTE\s*:\s*)?["'“«]Com certeza,\s*vou te passar os valores agora mesmo.*?["'”»]/gi,
              'apresente os imóveis e valores do catálogo imediatamente com os links oficiais.',
            )
            .replace(
              /Com certeza,\s*vou te passar os valores agora mesmo[.\s]*Apenas para eu te enviar a unidade com o melhor custo[\u2010-\u2015\-]benefício para o seu perfil,?\s*o que é mais importante para você além do valor\??/gi,
              'Apresente os imóveis e valores reais do catálogo imediatamente com os links oficiais.',
            )
        }

        const newAi = cleanTxt(ai)
        if (newAi !== ai) {
          ai = newAi
          changed = true
        }

        const newBia = cleanTxt(bia)
        if (newBia !== bia) {
          bia = newBia
          changed = true
        }

        if (changed) {
          u.set('ai_instructions', ai)
          u.set('bia_instructions', bia)
          app.saveNoValidate(u)
          console.log('[MIGRATION_0170] Thoroughly cleaned canned phrases for user ' + u.id)
        }
      }
    } catch (e) {
      console.warn('[MIGRATION_0170] Error cleaning user instructions: ' + String(e))
    }

    // 3. Clean canned phrases from cadences
    try {
      const cadences = app.findRecordsByFilter('cadences', '1=1', '', 100, 0)
      for (const c of cadences) {
        let cContent = c.getString('content') || ''
        let cAi = c.getString('ai_instructions') || ''
        let cChanged = false

        const cleanCadenceTxt = (txt) => {
          if (!txt) return ''
          return txt
            .replace(
              /Com certeza,\s*vou te passar os valores agora mesmo[.\s]*Apenas para eu te enviar a unidade com o melhor custo[\u2010-\u2015\-]benefício para o seu perfil,?\s*o que é mais importante para você além do valor\??/gi,
              'Apresente os imóveis e valores reais do catálogo imediatamente com os links oficiais.',
            )
            .replace(
              /["'“«]Com certeza,\s*vou te passar os valores agora mesmo.*?["'”»]/gi,
              '"Apresento agora mesmo nossas melhores opções com links do catálogo."',
            )
        }

        const newContent = cleanCadenceTxt(cContent)
        if (newContent !== cContent) {
          cContent = newContent
          cChanged = true
        }

        const newAi = cleanCadenceTxt(cAi)
        if (newAi !== cAi) {
          cAi = newAi
          cChanged = true
        }

        if (cChanged) {
          c.set('content', cContent)
          c.set('ai_instructions', cAi)
          app.saveNoValidate(c)
          console.log('[MIGRATION_0170] Cleaned cadence ' + c.id)
        }
      }
    } catch (cadErr) {
      console.warn('[MIGRATION_0170] Error cleaning cadences: ' + String(cadErr))
    }
  },
  (app) => {},
)
