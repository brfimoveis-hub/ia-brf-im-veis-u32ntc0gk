/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Garantir campos do perfil do cliente na coleção customers
    try {
      const customersCol = app.findCollectionByNameOrId('customers')

      if (!customersCol.fields.getByName('neighborhood')) {
        customersCol.fields.add(
          new TextField({
            name: 'neighborhood',
            required: false,
          }),
        )
      }

      if (!customersCol.fields.getByName('price_range')) {
        customersCol.fields.add(
          new TextField({
            name: 'price_range',
            required: false,
          }),
        )
      }

      if (!customersCol.fields.getByName('notes')) {
        customersCol.fields.add(
          new TextField({
            name: 'notes',
            required: false,
          }),
        )
      }

      if (!customersCol.fields.getByName('lead_profile')) {
        customersCol.fields.add(
          new SelectField({
            name: 'lead_profile',
            values: ['Investidor', 'Morador', 'Primeiro Imóvel', 'Veranista'],
            maxSelect: 1,
            required: false,
          }),
        )
      }

      app.save(customersCol)
      console.log('[MIG_0279] Campos de perfil em customers verificados.')
    } catch (custErr) {
      console.warn('[MIG_0279] Aviso ao verificar campos de customers: ' + custErr.message)
    }

    // 2. Garantir coleção follow_ups_scheduled com fields.add
    try {
      let followUpsCol = null
      try {
        followUpsCol = app.findCollectionByNameOrId('follow_ups_scheduled')
      } catch (_) {}

      const usersColId = '_pb_users_auth_'
      let custColId = ''
      let propsColId = ''
      try {
        custColId = app.findCollectionByNameOrId('customers').id
      } catch (_) {}
      try {
        propsColId = app.findCollectionByNameOrId('properties').id
      } catch (_) {}

      if (!followUpsCol) {
        followUpsCol = new Collection({
          name: 'follow_ups_scheduled',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "@request.auth.id != ''",
          deleteRule: "@request.auth.id != ''",
        })
      }

      if (!followUpsCol.fields.getByName('user_id')) {
        followUpsCol.fields.add(
          new RelationField({
            name: 'user_id',
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
            required: false,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('customer_id')) {
        followUpsCol.fields.add(
          new RelationField({
            name: 'customer_id',
            collectionId: custColId,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('property_id')) {
        followUpsCol.fields.add(
          new RelationField({
            name: 'property_id',
            collectionId: propsColId,
            cascadeDelete: false,
            maxSelect: 1,
            required: false,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('type')) {
        followUpsCol.fields.add(
          new SelectField({
            name: 'type',
            values: ['d1', 'd3', 'd7', 'd14', 'promised_followup', 'manual'],
            maxSelect: 1,
            required: true,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('scheduled_date')) {
        followUpsCol.fields.add(
          new TextField({
            name: 'scheduled_date',
            required: true,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('status')) {
        followUpsCol.fields.add(
          new SelectField({
            name: 'status',
            values: ['pending', 'sent', 'canceled', 'skipped'],
            maxSelect: 1,
            required: true,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('message_template')) {
        followUpsCol.fields.add(
          new TextField({
            name: 'message_template',
            required: false,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('promise_context')) {
        followUpsCol.fields.add(
          new TextField({
            name: 'promise_context',
            required: false,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('last_error')) {
        followUpsCol.fields.add(
          new TextField({
            name: 'last_error',
            required: false,
          }),
        )
      }

      if (!followUpsCol.fields.getByName('sent_at')) {
        followUpsCol.fields.add(
          new TextField({
            name: 'sent_at',
            required: false,
          }),
        )
      }

      app.save(followUpsCol)
      console.log(
        '[MIG_0279] Coleção follow_ups_scheduled configurada com sucesso com todos os campos.',
      )
    } catch (fErr) {
      console.warn('[MIG_0279] Erro ao configurar follow_ups_scheduled: ' + fErr.message)
    }

    // 3. Gravar os 4 aprendizados bia_learnings (Prioridades 950, 940, 930, 920)
    // Autor: Mauro Fengler
    const persistLearnings = [
      {
        title: 'Pilar A — Cadência Temporal de Retomadas (D+1, D+3, D+7, D+14)',
        category: 'comportamento',
        priority: 950,
        rule_text: `PILAR A — CADÊNCIA TEMPORAL DE RETOMADAS (SILÊNCIO DO LEAD):
1. Quando o cliente parar de responder após uma proposta, envio de material ou resposta da Bia, a persistência é ativada respeitando rigorosamente os intervalos:
   - D+1 (após ~24 horas): Gancho consultivo leve sobre o imóvel em pauta ou dúvida pendente.
   - D+3 (após ~72 horas): Envio de um novo ângulo do imóvel ou diferenciais práticos (localização, lazer, vaga, rentabilidade).
   - D+7 (após ~7 dias): Pergunta de verificação de timing ("ainda está no seu radar para este mês?") ou sugestão de alternativa compatível do portfólio.
   - D+14 (após ~14 dias): Despedida elegante deixando a porta aberta para retomar quando for o momento.
2. Cada mensagem DEVE ter conteúdo diferente da anterior. NUNCA repetir a mesma cobrança ("conseguiu ver?", "aguardo retorno").
3. Todo follow-up deve ser consultivo, amigável, no estilo WhatsApp e terminando com UMA pergunta leve.`,
      },
      {
        title: 'Pilar B — Promessa Feita = Retomada Obrigatória (Follow-up de Compromisso)',
        category: 'comportamento',
        priority: 940,
        rule_text: `PILAR B — PROMESSA FEITA É COMPROMISSO DE RETOMADA OBRIGATÓRIO:
1. Sempre que a Bia disser ao cliente frases de promessa como:
   - "Vou verificar com o Mauro e te retorno"
   - "Estou levantando os detalhes e já te passo"
   - "Vou consultar a disponibilidade atualizada e te aviso"
   A Bia TEM a obrigação de registrar e executar o retorno. O cliente NUNCA pode ficar sem a resposta prometida.
2. Se a informação específica ainda não estiver disponível no catálogo ou com o corretor no momento do retorno:
   - A Bia envia satisfação pontual e honesta dentro do prazo: "Ainda estou alinhando os últimos detalhes com o Mauro para te passar com exatidão, já te trago o retorno!"
3. Toda promessa feita no chat agenda automaticamente um compromisso de follow-up prioritário.`,
      },
      {
        title: 'Pilar C — Persistência Estratégica, Pivô Imediato e Handoff Seguro',
        category: 'qualificacao',
        priority: 930,
        rule_text: `PILAR C — PERSISTÊNCIA ESTRATÉGICA, PIVÔ IMEDIATO E TRANSIÇÃO SEGURA:
1. Extração e gravação contínua do perfil do lead: objetivo (morar ou investir), faixa de valor, região/bairro e tipo de imóvel são persistidos na ficha do cliente.
2. Resposta imediata com as 2 melhores opções: quando o perfil é revelado pelo lead, apresente imediatamente no máximo 2 opções altamente compatíveis do catálogo BRF.
3. Pivô imediato em rejeição: se o cliente disser que o imóvel não se encaixa (preço, tamanho, localização), NUNCA insista no mesmo imóvel! Reconheça a objeção com empatia e apresente outra alternativa do portfólio.
4. Entrada direta com código/link: quando o lead chega informando código ou link de imóvel (ex: LM 289, AP 337, AP 318), responda DIRETO sobre o imóvel em pauta, sem rodeios ou perguntas de saudação demoradas.
5. Transbordo somente após esgotadas as alternativas: nunca transbordar na 1ª recusa. Trabalhe o catálogo com inteligência consultiva antes de envolver o corretor humano.`,
      },
      {
        title: 'Pilar D — Guarda de Formatação WhatsApp na Porta de Saída',
        category: 'apresentacao',
        priority: 920,
        rule_text: `PILAR D — GUARDA DE FORMATAÇÃO WHATSAPP NA PORTA DE SAÍDA:
1. Toda mensagem destinada ao WhatsApp DEVE ser processada pela guarda formatWhatsAppOutput antes do envio:
   - Proibido títulos com ###, ## ou # (remover marcadores).
   - Proibido negrito duplo **texto** (converter para negrito WhatsApp *texto* com asterisco simples).
   - Tabelas markdown convertidas em linhas de tópicos "• campo: valor — detalhe".
   - Colapsar 3 ou mais quebras de linha consecutivas em no máximo 2 quebras.
   - Limitar o texto em ~900 a 950 caracteres com truncagem limpa em final de frase (. ! ?), preservando a legibilidade.
2. A palavra "transbordo" ou "trasbordo" NUNCA é enviada ao cliente.
3. Frase de contato com corretor autorizada: "Vou pedir para o corretor Mauro entrar em contato com o senhor, ou se preferir, pode chamá-lo pelo telefone (48) 99972-8050."`,
      },
    ]

    for (let k = 0; k < persistLearnings.length; k++) {
      const item = persistLearnings[k]
      try {
        let existing = null
        try {
          existing = app.findFirstRecordByFilter(
            'bia_learnings',
            `title = '${item.title.replace(/'/g, "''")}' || priority = ${item.priority}`,
          )
        } catch (_) {}

        if (existing) {
          existing.set('title', item.title)
          existing.set('rule_text', item.rule_text)
          existing.set('category', item.category)
          existing.set('author', 'Mauro Fengler')
          existing.set('priority', item.priority)
          existing.set('is_active', true)
          existing.set('reviewed_by', 'Mauro')
          existing.set('last_reviewed_at', new Date().toISOString())
          app.save(existing)
          console.log(
            `[MIG_0279] Aprendizado atualizado: ${item.title} (priority ${item.priority})`,
          )
        } else {
          const lCol = app.findCollectionByNameOrId('bia_learnings')
          const nRec = new Record(lCol)
          nRec.set('title', item.title)
          nRec.set('rule_text', item.rule_text)
          nRec.set('category', item.category)
          nRec.set('author', 'Mauro Fengler')
          nRec.set('priority', item.priority)
          nRec.set('is_active', true)
          nRec.set('reviewed_by', 'Mauro')
          nRec.set('last_reviewed_at', new Date().toISOString())
          app.save(nRec)
          console.log(`[MIG_0279] Aprendizado criado: ${item.title} (priority ${item.priority})`)
        }
      } catch (lErr) {
        console.warn(`[MIG_0279] Erro ao gravar aprendizado ${item.title}: ` + lErr.message)
      }
    }
  },
  (app) => {
    // Rollback
  },
)
