migrate(
  (app) => {
    try {
      const biaLearningsCol = app.findCollectionByNameOrId('bia_learnings')
      const targetUser = app.findFirstRecordByFilter('users', "email != ''")
      const userId = targetUser ? targetUser.id : ''

      // 3 Regras ativas em bia_learnings (author "Mauro via Skip"):
      // (a) Priority 480: "Sem link nem preço cheio na 1ª apresentação — curiosidade + 1 pergunta"
      // (b) Priority 470: "Máximo 2 opções por mensagem, sem tabelas markdown"
      // (c) Priority 460: "Nunca dizer que imóvel não consta se ele já foi citado/apresentado na conversa — retomar o fio"

      const rulesToSeed = [
        {
          title:
            'SDR de Alta Conversão: Sem link nem preço cheio na 1ª apresentação — Curiosidade + 1 pergunta',
          rule_text:
            'REGRA DE CONDUTA DE SDR (ALTA CONVERSÃO — 1ª APRESENTAÇÃO):\n' +
            '1. Na 1ª apresentação de um imóvel, NUNCA enviar link nem preço cheio.\n' +
            '2. Desperte curiosidade e desejo em 3 a 4 linhas amigáveis com: localização privilegiada, destaque único, tipologia e estilo de vida.\n' +
            '3. Preço sempre como "a partir de R$ X" (nunca tabela cheia nem dump de valores).\n' +
            '4. Termine SEMPRE com APENAS UMA pergunta de continuidade (ex: "Quer que eu te envie as fotos e a ficha completa?").\n' +
            '5. Link do imóvel só é enviado se: (a) o lead pedir expressamente link/fotos, (b) na fase de agendamento de visita/tour, ou (c) em conversa madura com 3 ou mais trocas com interesse confirmado.',
          category: 'apresentacao',
          author: 'Mauro via Skip',
          priority: 480,
        },
        {
          title: 'Máximo 2 opções por mensagem, texto corrido amigável e sem tabelas markdown',
          rule_text:
            'FORMATO DE RESPOSTA SDR (MÁXIMO 2 OPÇÕES):\n' +
            '1. Quando o lead pedir opções ou catálogo, envie no MÁXIMO 2 opções por mensagem.\n' +
            '2. Use texto corrido, amigável e fluido (estilo WhatsApp natural). PROIBIDO usar tabelas markdown ou listas gigantes acumuladas.\n' +
            '3. Sempre termine com uma pergunta comparativa consultiva (ex: "Qual dessas duas propostas conversa melhor com o que você imaginou?").',
          category: 'apresentacao',
          author: 'Mauro via Skip',
          priority: 470,
        },
        {
          title:
            'Anti-Contradição: Nunca dizer que imóvel não consta se já foi citado ou apresentado — Retomar o fio',
          rule_text:
            'ANTI-CONTRADIÇÃO E CONTINUIDADE ABSOLUTA:\n' +
            '1. Se um imóvel já foi citado, apresentado ou enviado no histórico da conversa (ex: Fazenda ARU 341, Vistage, LM 344), ele NUNCA pode receber a frase "não consta no catálogo" ou "não temos esse imóvel".\n' +
            '2. Normalização ampla de códigos: aceitar "341", "ARU 341", "aru341", "#341", link "/341/".\n' +
            '3. Se o lead pedir comparação (ex: Vistage vs Fazenda ARU 341), MANTENHA AMBOS acessíveis no contexto e compare com elegância sem apagar nenhum.\n' +
            '4. Reconheça sempre o último gancho do lead ("Entendi, você quer comparar...", "Sobre a fazenda em São Joaquim que vimos...") em vez de recomeçar a conversa do zero.',
          category: 'comportamento',
          author: 'Mauro via Skip',
          priority: 460,
        },
      ]

      const nowIso = new Date().toISOString()
      for (let i = 0; i < rulesToSeed.length; i++) {
        const item = rulesToSeed[i]
        let existing = null
        try {
          existing = app.findFirstRecordByFilter(
            'bia_learnings',
            "title ~ '" + item.title.substring(0, 30).replace(/'/g, "''") + "'",
          )
        } catch (_) {}

        if (existing) {
          existing.set('title', item.title)
          existing.set('rule_text', item.rule_text)
          existing.set('category', item.category)
          existing.set('author', item.author)
          existing.set('is_active', true)
          existing.set('priority', item.priority)
          existing.set('last_reviewed_at', nowIso)
          existing.set('reviewed_by', 'Mauro')
          app.saveNoValidate(existing)
        } else {
          const rec = new Record(biaLearningsCol)
          rec.set('user_id', userId)
          rec.set('title', item.title)
          rec.set('rule_text', item.rule_text)
          rec.set('category', item.category)
          rec.set('author', item.author)
          rec.set('is_active', true)
          rec.set('priority', item.priority)
          rec.set('last_reviewed_at', nowIso)
          rec.set('reviewed_by', 'Mauro')
          app.saveNoValidate(rec)
        }
      }
      console.log('[MIG_0276] 3 regras SDR persistidas em bia_learnings (prioridades 480/470/460)!')

      // Atualizar bia_instructions no usuário preservando customizações existentes
      if (targetUser) {
        const currentBiaInst = targetUser.getString('bia_instructions') || ''
        const sdrBlockMarker = 'REGRA DE CONDUTA DE SDR (ALTA CONVERSÃO)'

        const sdrDirectiveBlock =
          '\n\n======================================================================\n' +
          'REGRA DE CONDUTA DE SDR (ALTA CONVERSÃO)\n' +
          '======================================================================\n' +
          '1. NA 1ª APRESENTAÇÃO DE UM IMÓVEL:\n' +
          '   - NUNCA enviar link nem preço cheio logo de cara.\n' +
          '   - Escreva 3 a 4 linhas que gerem curiosidade e desejo: localização privilegiada, destaque único, tipologia e estilo de vida.\n' +
          '   - Preço apenas como "a partir de R$ X" (nunca despejar tabela completa).\n' +
          '   - Termine SEMPRE com UMA pergunta de continuidade (ex: "Quer que eu te mande as fotos e a ficha completa dessa opção?").\n' +
          '2. QUANDO ENVIAR LINK:\n' +
          '   - Apenas se o lead pedir expressamente link/fotos ("me passa o link", "manda fotos", "quero ver o site"),\n' +
          '   - Na fase de agendamento de visita/tour, OU\n' +
          '   - Em conversa madura (3 ou mais trocas com interesse confirmado no imóvel).\n' +
          '3. MÁXIMO 2 OPÇÕES POR MENSAGEM:\n' +
          '   - Texto corrido e amigável (estilo WhatsApp natural). PROIBIDO usar tabelas markdown.\n' +
          '   - Termine sempre com pergunta comparativa entre as opções apresentadas.\n' +
          '4. ANTI-CONTRADIÇÃO E CONTINUIDADE:\n' +
          '   - Se um imóvel já foi citado ou apresentado na conversa, ele NUNCA pode receber a frase "não consta no catálogo". Retome o fio com elegância.\n' +
          '   - Reconheça o último gancho do lead ("Entendi, você quer comparar...", "Sobre a opção que vimos...") em vez de reiniciar do zero.\n'

        if (!currentBiaInst.includes(sdrBlockMarker)) {
          // Substituir instrução antiga conflitante se existir
          let updatedInst = currentBiaInst.replace(
            /Se o cliente perguntar ou exigir o preço ou opções, envie imediatamente 2 a 3 opções de imóveis reais do catálogo com código, valor, bairro e link oficial do site/gi,
            'Siga a REGRA DE CONDUTA DE SDR (ALTA CONVERSÃO): apresente no máximo 2 opções em 3 a 4 linhas de curiosidade, preço "a partir de R$ X", sem link e com uma pergunta consultiva',
          )
          updatedInst = updatedInst + sdrDirectiveBlock
          targetUser.set('bia_instructions', updatedInst)
          app.saveNoValidate(targetUser)
          console.log(
            '[MIG_0276] Bloco REGRA DE CONDUTA DE SDR anexado ao bia_instructions do usuário!',
          )
        } else {
          console.log('[MIG_0276] bia_instructions já possuía o bloco SDR. Mantido.')
        }
      }
    } catch (err) {
      console.warn('[MIG_0276] Erro na migration: ' + (err.message || String(err)))
    }
  },
  (app) => {
    try {
      const titles = [
        'SDR de Alta Conversão: Sem link nem preço cheio na 1ª apresentação',
        'Máximo 2 opções por mensagem, texto corrido amigável',
        'Anti-Contradição: Nunca dizer que imóvel não consta',
      ]
      for (let i = 0; i < titles.length; i++) {
        try {
          const r = app.findFirstRecordByFilter(
            'bia_learnings',
            "title ~ '" + titles[i].substring(0, 30).replace(/'/g, "''") + "'",
          )
          if (r) app.delete(r)
        } catch (_) {}
      }
    } catch (_) {}
  },
)
