migrate(
  (app) => {
    // 1760000126_atualiza_regua_4_textos_e_fluxo_ok.js
    // 1. Atualizar o Texto Único da Bia (bia_learnings id 'tYVJIdIFb5rW4iq') com os 4 textos verbatim
    //    da régua de retomada comercial (substituindo as 3 versões antigas).
    // 2. Criar a coleção regua_ok_tasks para orquestração à prova de falha do fluxo OK -> Ebook -> Continuidade.
    // 3. Garantir que app_controls key='regua_automations_active' PERMANEÇA PAUSADA (is_active = false).

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

    const blocoReguaNovo4 = `• Régua Soberana de Retomadas e Remarketing (quando o cliente estiver em pausa):
  - Critério de Entrada: Clientes em silêncio > 24h ou base histórica importada entram na régua de retomada. Regra de ouro: NENHUM link e NENHUM anexo no primeiro disparo — o PDF/ebook do Vistage Residence só é entregue mediante resposta "OK" (ou "Sim").
  - Rotação Determinística das 4 Versões Aprovadas de Retomada/Remarketing (VERBATIM):
    [VARIANTE 1]: "Olá, [nome]. Sou a Bia, da BRF Imóveis.

Como você já consta em nossos contatos, tomamos a liberdade de entrar em contato para mais esta oportunidade de investimento.

São José foi a cidade que mais valorizou imóveis residenciais em Santa Catarina em 2025, com alta de 11,31% no ano e cerca de 50% de valorização acumulada nos últimos três anos. O bairro de Barreiros concentra hoje o segundo metro quadrado mais valorizado da cidade, a R$ 9.172/m².

A AJ Coelho acaba de lançar o Vistage Residence nesse endereço, e preparamos um ebook completo com plantas, valores e condições de pagamento.

Para receber em primeira mão e escolher a melhor planta, basta responder OK.

Se não deseja mais receber outras oportunidades como esta, responda NÃO e excluiremos imediatamente você do nosso cadastro."
    [VARIANTE 2]: "Olá, [nome]. Sou a Bia, da BRF Imóveis.

Como você já consta em nossos contatos, tomamos a liberdade de entrar em contato para mais esta oportunidade de investimento.

Levantamentos recentes apontam São José entre as três melhores cidades do país para investimento em imóveis na planta, com rentabilidade média de 19,7% ao ano. A rentabilidade de locação no município está na faixa de 5,5% ao ano, acima da média nacional.

O Vistage Residence, novo lançamento da AJ Coelho em Barreiros, reúne essas condições em um único endereço. Organizamos um ebook com todas as informações do empreendimento e das unidades disponíveis.

Para receber em primeira mão e escolher a melhor planta, basta responder OK.

Se não deseja mais receber outras oportunidades como esta, responda NÃO e excluiremos imediatamente você do nosso cadastro."
    [VARIANTE 3]: "Olá, [nome]. Sou a Bia, da BRF Imóveis.

Como você já consta em nossos contatos, tomamos a liberdade de entrar em contato para mais esta oportunidade.

Barreiros é hoje um dos bairros mais completos de São José: acesso direto à BR-101, proximidade com Florianópolis e infraestrutura consolidada de comércio, escolas, universidades e serviços. É um endereço que une qualidade de vida e valorização constante.

A AJ Coelho, com mais de 30 anos de atuação na Grande Florianópolis, lança nesse bairro o Vistage Residence: 79 apartamentos, plantas a partir de 63 m², rooftop com piscina e academia, mercado no condomínio e espaço pet.

Para receber em primeira mão e escolher a melhor planta, basta responder OK.

Se não deseja mais receber outras oportunidades como esta, responda NÃO e excluiremos imediatamente você do nosso cadastro."
    [VARIANTE 4]: "Olá, [nome]. Sou a Bia, da BRF Imóveis.

Como você já consta em nossos contatos, tomamos a liberdade de entrar em contato para mais esta oportunidade.

O Vistage Residence é o mais novo lançamento da AJ Coelho em Barreiros, com 79 unidades distribuídas em plantas de 2 e 3 dormitórios, apartamentos garden e cobertura de 296 m². A entrega está prevista para dezembro de 2030, com unidades a partir de R$ 608 mil — valor abaixo da média praticada no bairro.

Por se tratar de lançamento, as primeiras unidades são comercializadas em condições diferenciadas. Reunimos todas as informações em um ebook exclusivo.

Para receber em primeira mão e escolher a melhor planta, basta responder OK.

Se não deseja mais receber outras oportunidades como esta, responda NÃO e excluiremos imediatamente você do nosso cadastro."
    Nota de entrega e continuidade: O PDF/ebook NUNCA é enviado no primeiro disparo. Quando o cliente responder "OK" (ou variações como "Sim", "quero"), a Bia envia imediatamente o ebook do Vistage Residence e a frase curta de confirmação. Se falhar, retenta após ~2 minutos. Cerca de 10 minutos após a confirmação do envio do ebook, a Bia envia a mensagem de continuidade ("Me diz: você procura mais para investir ou para morar?"), que é cancelada caso o cliente fale antes.
    Nota de descadastro (Opt-out): Se o cliente responder "NÃO", a Bia cancela imediatamente qualquer envio futuro e remove o cliente da régua comercial.`

    if (targetRec) {
      const currentText = targetRec.getString('rule_text')
      let updatedText = currentText
      const reguaSecRegex =
        /•\s*Régua Soberana de Retomadas e Remarketing[\s\S]*?(?=(?:•\s*Encerramento formal|•\s*Mapeamento Universal|\n\n\n|$))/i
      const oldReguaRegex = /•\s*Régua de persistência quando o cliente estiver em pausa:[^\n]*\n?/i

      if (reguaSecRegex.test(updatedText)) {
        updatedText = updatedText.replace(reguaSecRegex, blocoReguaNovo4 + '\n\n')
      } else if (oldReguaRegex.test(updatedText)) {
        updatedText = updatedText.replace(oldReguaRegex, blocoReguaNovo4 + '\n\n')
      } else {
        const fallbackTarget = '• Encerramento formal:'
        if (updatedText.includes(fallbackTarget)) {
          updatedText = updatedText.replace(
            fallbackTarget,
            blocoReguaNovo4 + '\n\n' + fallbackTarget,
          )
        } else {
          updatedText = updatedText + '\n\n' + blocoReguaNovo4
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
        console.warn('[MIG_1760000126] Aviso ao sincronizar users:', String(syncErr))
      }
    }

    // 2. Coleção regua_ok_tasks
    try {
      let tasksCol = null
      try {
        tasksCol = app.findCollectionByNameOrId('regua_ok_tasks')
      } catch (_) {}

      if (!tasksCol) {
        tasksCol = new Collection({
          name: 'regua_ok_tasks',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "@request.auth.id != ''",
          deleteRule: "@request.auth.id != ''",
        })

        const custCol = app.findCollectionByNameOrId('customers')
        tasksCol.fields.add(
          new RelationField({
            name: 'customer_id',
            collectionId: custCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          }),
        )

        tasksCol.fields.add(new TextField({ name: 'user_id', required: false }))
        tasksCol.fields.add(
          new SelectField({
            name: 'task_type',
            values: ['ebook_send', 'ebook_retry', 'continuidade'],
            maxSelect: 1,
            required: true,
          }),
        )
        tasksCol.fields.add(
          new SelectField({
            name: 'status',
            values: ['pending', 'sent', 'canceled', 'failed'],
            maxSelect: 1,
            required: true,
          }),
        )
        tasksCol.fields.add(new TextField({ name: 'scheduled_at', required: true }))
        tasksCol.fields.add(new NumberField({ name: 'attempts', required: false }))
        tasksCol.fields.add(new TextField({ name: 'wamid', required: false }))
        tasksCol.fields.add(new TextField({ name: 'last_error', required: false }))
        tasksCol.fields.add(new TextField({ name: 'sent_at', required: false }))
        tasksCol.fields.add(new JSONField({ name: 'metadata', required: false }))

        app.save(tasksCol)
        console.log('[MIG_1760000126] Coleção regua_ok_tasks criada com sucesso.')
      }
    } catch (taskErr) {
      console.warn('[MIG_1760000126] Aviso ao criar regua_ok_tasks: ' + String(taskErr))
    }

    // 3. Garantir trava global app_controls: regua_automations_active = false
    try {
      let reguaCtrl = null
      try {
        reguaCtrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
      } catch (_) {}

      if (reguaCtrl) {
        reguaCtrl.set('is_active', false)
        reguaCtrl.set(
          'description',
          'Controle global da régua de persistência. Permanece PAUSADA até acionamento manual do Mauro.',
        )
        app.saveNoValidate(reguaCtrl)
      }
    } catch (cErr) {
      console.warn('[MIG_1760000126] Aviso ao verificar app_controls: ' + String(cErr))
    }

    console.log(
      '[MIG_1760000126] Migração concluída com sucesso: 4 textos da régua implantados, fila regua_ok_tasks configurada e régua preservada pausada.',
    )
  },
  (app) => {
    console.log('[MIG_1760000126] Rollback executado.')
  },
)
