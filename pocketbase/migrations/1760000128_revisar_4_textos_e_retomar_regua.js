migrate(
  (app) => {
    // 1760000128_revisar_4_textos_e_retomar_regua.js
    // 1. Atualizar o Texto Único da Bia (bia_learnings id 'tYVJIdIFb5rW4iq') com os 4 textos revisados:
    //    - Parágrafos curtos separados por linha em branco
    //    - "trazer mais esta oportunidade"
    //    - "neste endereço"
    //    - "responda NÃO e você será excluído imediatamente do nosso cadastro"
    // 2. RETOMAR a régua de envios (autorizada pelo Mauro):
    //    - app_controls key='regua_automations_active' -> is_active = true
    //    - Gravação de log de retomada

    const targetRecordId = 'tYVJIdIFb5rW4iq'
    let targetRec = null
    try {
      targetRec = app.findRecordById('bia_learnings', targetRecordId)
    } catch (_) {
      targetRec = null
    }

    if (!targetRec) {
      const activeRecs = app.findRecordsByFilter(
        'bia_learnings',
        'is_active = true',
        '-priority,-created',
        1,
        0,
      )
      if (activeRecs && activeRecs.length > 0) {
        targetRec = activeRecs[0]
      }
    }

    const blocoReguaRevisado = `• Régua Soberana de Retomadas e Remarketing (quando o cliente estiver em pausa):
  - Critério de Entrada: Clientes em silêncio > 24h ou base histórica importada entram na régua de retomada. Regra de ouro: NENHUM link e NENHUM anexo no primeiro disparo — o PDF/ebook do Vistage Residence só é entregue mediante resposta "OK" (ou "Sim").
  - Rotação Determinística das 4 Versões Aprovadas de Retomada/Remarketing (VERBATIM):
    [VARIANTE 1]: "Olá, [nome]. Sou a Bia, da BRF Imóveis.

Como você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade de investimento.

São José foi a cidade que mais valorizou imóveis residenciais em Santa Catarina em 2025: alta de 11,31% no ano e cerca de 50% de valorização acumulada nos últimos três anos.

Barreiros concentra hoje o segundo metro quadrado mais valorizado da cidade: R$ 9.172/m².

A AJ Coelho acaba de lançar o Vistage Residence neste endereço.

Preparamos um ebook completo, com plantas, valores e condições de pagamento.

Para receber em primeira mão e escolher a melhor planta, basta responder OK.

Se não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro."
    [VARIANTE 2]: "Olá, [nome]. Sou a Bia, da BRF Imóveis.

Como você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade de investimento.

São José está entre as três melhores cidades do país para investimento em imóveis na planta: rentabilidade média de 19,7% ao ano e aluguel rendendo cerca de 5,5% ao ano, acima da média nacional.

O Vistage Residence, novo lançamento da AJ Coelho em Barreiros, reúne essas condições em um único endereço.

Organizamos um ebook com todas as informações do empreendimento e das unidades disponíveis.

Para receber em primeira mão e escolher a melhor planta, basta responder OK.

Se não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro."
    [VARIANTE 3]: "Olá, [nome]. Sou a Bia, da BRF Imóveis.

Como você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade.

Barreiros é um dos bairros mais completos de São José: acesso direto à BR-101, perto de Florianópolis, com comércio, escolas, universidades e serviços no dia a dia.

É um endereço que une qualidade de vida e valorização constante.

A AJ Coelho, com mais de 30 anos na Grande Florianópolis, lança aí o Vistage Residence: 79 apartamentos, plantas a partir de 63 m², rooftop com piscina e academia, mercado no condomínio e espaço pet.

Para receber em primeira mão e escolher a melhor planta, basta responder OK.

Se não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro."
    [VARIANTE 4]: "Olá, [nome]. Sou a Bia, da BRF Imóveis.

Como você já consta em nossos contatos, tomamos a liberdade de trazer mais esta oportunidade.

O Vistage Residence é o mais novo lançamento da AJ Coelho em Barreiros: 79 unidades, com plantas de 2 e 3 dormitórios, apartamentos garden e cobertura de 296 m².

A entrega está prevista para dezembro de 2030, com unidades a partir de R$ 608 mil — valor abaixo da média praticada no bairro.

Por ser lançamento, as primeiras unidades são comercializadas em condições diferenciadas.

Reunimos todas as informações em um ebook exclusivo.

Para receber em primeira mão e escolher a melhor planta, basta responder OK.

Se não deseja mais receber oportunidades como esta, responda NÃO e você será excluído imediatamente do nosso cadastro."
    Nota de entrega e continuidade: O PDF/ebook NUNCA é enviado no primeiro disparo. Quando o cliente responder "OK" (ou variações como "Sim", "quero"), a Bia envia imediatamente o ebook do Vistage Residence e a frase curta de confirmação. Se falhar, retenta após ~2 minutos. Cerca de 10 minutos após a confirmação do envio do ebook, a Bia envia a mensagem de continuidade ("Me diz: você procura mais para investir ou para morar?"), que é cancelada caso o cliente fale antes.
    Nota de descadastro (Opt-out): Se o cliente responder "NÃO", a Bia cancela imediatamente qualquer envio futuro e remove o cliente da régua comercial.`

    if (targetRec) {
      const currentText = targetRec.getString('rule_text')
      let updatedText = currentText
      const reguaSecRegex =
        /•\s*Régua Soberana de Retomadas e Remarketing[\s\S]*?(?=(?:•\s*Encerramento formal|•\s*Mapeamento Universal|\n\n\n|$))/i
      const oldReguaRegex = /•\s*Régua de persistência quando o cliente estiver em pausa:[^\n]*\n?/i

      if (reguaSecRegex.test(updatedText)) {
        updatedText = updatedText.replace(reguaSecRegex, blocoReguaRevisado + '\n\n')
      } else if (oldReguaRegex.test(updatedText)) {
        updatedText = updatedText.replace(oldReguaRegex, blocoReguaRevisado + '\n\n')
      } else {
        const fallbackTarget = '• Encerramento formal:'
        if (updatedText.includes(fallbackTarget)) {
          updatedText = updatedText.replace(
            fallbackTarget,
            blocoReguaRevisado + '\n\n' + fallbackTarget,
          )
        } else {
          updatedText = updatedText + '\n\n' + blocoReguaRevisado
        }
      }

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      targetRec.set('rule_text', updatedText)
      targetRec.set('last_reviewed_at', now)
      targetRec.set('reviewed_by', 'Mauro Fengler (Aprovado)')
      targetRec.set('updated', now)
      app.saveNoValidate(targetRec)

      try {
        app
          .db()
          .newQuery(
            'UPDATE users SET bia_instructions = {:rule_text}, ai_instructions = {:rule_text} WHERE 1=1',
          )
          .bind({ rule_text: updatedText })
          .execute()
      } catch (syncErr) {
        console.warn('[MIG_1760000128] Aviso ao sincronizar users:', String(syncErr))
      }
    }

    // 2. REATIVAR app_controls: regua_automations_active = true
    try {
      let reguaCtrl = null
      try {
        reguaCtrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
      } catch (_) {}

      if (!reguaCtrl) {
        const col = app.findCollectionByNameOrId('app_controls')
        reguaCtrl = new Record(col)
        reguaCtrl.set('key', 'regua_automations_active')
        reguaCtrl.set('name', 'Régua de Persistência e Remarketing Automático')
      }

      const nowIso = new Date().toISOString()
      reguaCtrl.set('is_active', true)
      reguaCtrl.set(
        'description',
        'Controle global da régua de persistência. ATIVA por autorização expressa do Mauro.',
      )
      reguaCtrl.set('resumed_at', nowIso)
      reguaCtrl.set('resumed_by', 'Mauro Fengler (Autorizado)')
      app.saveNoValidate(reguaCtrl)

      // Registrar auditoria em system_logs
      try {
        const logsCol = app.findCollectionByNameOrId('system_logs')
        const sysLog = new Record(logsCol)
        sysLog.set('type', 'regua_resumed')
        sysLog.set('message', 'Régua de automações foi RETOMADA por autorização do Mauro')
        sysLog.set(
          'details',
          JSON.stringify({
            key: 'regua_automations_active',
            is_active: true,
            operator: 'Mauro Fengler',
            timestamp: nowIso,
            reason: 'Textos revisados e autorização expressa de retomada',
          }),
        )
        app.saveNoValidate(sysLog)
      } catch (logErr) {
        console.warn('[MIG_1760000128] Aviso ao gravar log: ' + String(logErr))
      }
    } catch (cErr) {
      console.warn('[MIG_1760000128] Erro ao reativar app_controls: ' + String(cErr))
    }

    console.log(
      '[MIG_1760000128] Migração concluída com sucesso: 4 textos revisados aplicados e régua reativada!',
    )
  },
  (app) => {
    console.log('[MIG_1760000128] Rollback executado.')
  },
)
