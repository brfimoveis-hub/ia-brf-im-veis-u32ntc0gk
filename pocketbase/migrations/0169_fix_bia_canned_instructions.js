/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Clean canned responses from users collection
    try {
      const users = app.findRecordsByFilter('users', "email != ''", '', 100, 0)
      for (const u of users) {
        let ai = u.getString('ai_instructions') || ''
        let bia = u.getString('bia_instructions') || ''
        let changed = false

        const canned1 =
          '3. Gestão de Interrupções: Se o cliente exigir o preço imediatamente, responda: "Com certeza, vou te passar os valores agora mesmo. Apenas para eu te enviar a unidade com o melhor custo-benefício para o seu perfil, o que é mais importante para você além do valor?" (Retorno à Cadência 2).'
        const canned2 =
          '1. GESTÃO DE INTERRUPÇÕES — Se o cliente exigir o preço antes da Cadência 4 (Apresentação de Valor), responda EXATAMENTE: "Com certeza, vou te passar os valores agora mesmo. Apenas para eu te enviar a unidade com o melhor custo-benefício para o seu perfil, o que é mais importante para você além do valor?" Essa resposta redireciona para a Descoberta da Necessidade sem confrontar o cliente.'

        if (ai.includes(canned1)) {
          ai = ai.replace(
            canned1,
            '3. Envio de Imóveis e Valores: Se o cliente perguntar ou exigir o preço ou opções, envie imediatamente 2 a 3 opções de imóveis reais do catálogo com código, valor, bairro e link oficial do site. Nunca fique apenas fazendo perguntas.',
          )
          changed = true
        }
        if (ai.includes(canned2)) {
          ai = ai.replace(
            canned2,
            '1. RESPOSTA DIRETA AO PREÇO/OPÇÕES: Apresente imediatamente os imóveis e valores do catálogo com os links do site. Não retenha informações de preço.',
          )
          changed = true
        }

        if (bia.includes(canned1)) {
          bia = bia.replace(
            canned1,
            '3. Envio de Imóveis e Valores: Se o cliente perguntar ou exigir o preço ou opções, envie imediatamente 2 a 3 opções de imóveis reais do catálogo com código, valor, bairro e link oficial do site. Nunca fique apenas fazendo perguntas.',
          )
          changed = true
        }
        if (bia.includes(canned2)) {
          bia = bia.replace(
            canned2,
            '1. RESPOSTA DIRETA AO PREÇO/OPÇÕES: Apresente imediatamente os imóveis e valores do catálogo com os links do site. Não retenha informações de preço.',
          )
          changed = true
        }

        if (changed) {
          u.set('ai_instructions', ai)
          u.set('bia_instructions', bia)
          app.saveNoValidate(u)
          console.log('[MIGRATION_0169] Cleaned canned instructions for user ' + u.id)
        }
      }
    } catch (e) {
      console.warn('[MIGRATION_0169] Error updating users: ' + String(e))
    }

    // 2. Clean malformed property "e49"
    try {
      const brokenProp = app.findFirstRecordByData('properties', 'code', 'e49')
      if (brokenProp) {
        brokenProp.set('neighborhood', 'Jurerê Internacional')
        app.saveNoValidate(brokenProp)
        console.log('[MIGRATION_0169] Fixed broken neighborhood on property e49')
      }
    } catch (_) {}
  },
  (app) => {},
)
