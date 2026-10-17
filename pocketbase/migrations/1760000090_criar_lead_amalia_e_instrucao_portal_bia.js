migrate(
  (app) => {
    // 1760000090_criar_lead_amalia_e_instrucao_portal_bia.js
    //
    // 1. CRIAR O LEAD PERDIDO (AMALIA) - IDEMPOTENTE
    //    Portal "Chaves na Mão", recebido 16/10 às 12:04
    //    phone: '5567998576043'
    //    email: 'acmanfio@gmail.com'
    //    name: 'Amalia'
    //    source: 'Portal Chaves na Mão'
    //    notes: "Mensagem: Eu posso visitar? Qual andar? Tenho interesse, está disponível? Me retorne no whatsapp! Qual o valor do condomínio? (lead recebido às 12:04 de 16/10)"
    //    assigned_to / user_id: 'g5jto8bhulw01bz'
    //    customer: last_origin 'Portal Chaves na Mão', last_origin_at '2026-10-16 12:04:00.000Z'
    //
    // 2. INSTRUÇÃO PARA A BIA (bia_learnings id='tYVJIdIFb5rW4iq', Constituição v3.1, prioridade 1000)
    //    Lead de portal externo = LEAD QUENTE.
    //    Responder rápido no WhatsApp, acolher e responder as perguntas dele (visita, andar, condomínio)
    //    sem oferecer outro lançamento na 1ª resposta (regra existente do Mauro). Nada de cadência nova.

    console.log('[MIG_1760000090] Iniciando migração do lead Amalia e instrução Bia...')

    const phone = '5567998576043'
    const email = 'acmanfio@gmail.com'
    const name = 'Amalia'
    const source = 'Portal Chaves na Mão'
    const notes =
      'Mensagem: Eu posso visitar? Qual andar? Tenho interesse, está disponível? Me retorne no whatsapp! Qual o valor do condomínio? (lead recebido às 12:04 de 16/10)'
    const userId = 'g5jto8bhulw01bz'
    const receivedAtIso = '2026-10-16 12:04:00.000Z'

    // =========================================================================
    // PARTE 1: VERIFICAÇÃO / CRIAÇÃO EM LEADS (IDEMPOTENTE)
    // =========================================================================
    const leadsCol = app.findCollectionByNameOrId('leads')
    let leadRec = null

    try {
      const existingLeads = app.findRecordsByFilter(
        'leads',
        `phone = '${phone}' || email = '${email}'`,
        '-created',
        1,
        0,
      )
      if (existingLeads && existingLeads.length > 0) {
        leadRec = existingLeads[0]
        console.log('[MIG_1760000090] Lead já existia na coleção leads com id:', leadRec.id)
      }
    } catch (eLeadFind) {
      console.warn('[MIG_1760000090] Aviso ao buscar lead existente:', eLeadFind.message)
    }

    if (!leadRec) {
      leadRec = new Record(leadsCol)
      leadRec.set('assigned_to', userId)
      leadRec.set('name', name)
      leadRec.set('phone', phone)
      leadRec.set('email', email)
      leadRec.set('source', source)
      leadRec.set('status', 'Novo')
      leadRec.set('notes', notes)
      app.saveNoValidate(leadRec)
      console.log('[MIG_1760000090] Registro criado em leads com id:', leadRec.id)
    }

    // =========================================================================
    // PARTE 2: VERIFICAÇÃO / CRIAÇÃO EM CUSTOMERS (IDEMPOTENTE)
    // =========================================================================
    const customersCol = app.findCollectionByNameOrId('customers')
    let customerRec = null

    try {
      const existingCusts = app.findRecordsByFilter(
        'customers',
        `phone = '${phone}' || phone_1_value = '${phone}' || email = '${email}' || email_1_value = '${email}'`,
        '-created',
        1,
        0,
      )
      if (existingCusts && existingCusts.length > 0) {
        customerRec = existingCusts[0]
        console.log('[MIG_1760000090] Customer já existia com id:', customerRec.id)
      }
    } catch (eCustFind) {
      console.warn('[MIG_1760000090] Aviso ao buscar customer existente:', eCustFind.message)
    }

    const originHistoryEntry = {
      date: receivedAtIso,
      source: source,
      type: 'portal',
      lead_id: leadRec ? leadRec.id : null,
    }

    if (!customerRec) {
      customerRec = new Record(customersCol)
      customerRec.set('user_id', userId)
      customerRec.set('name', name)
      customerRec.set('first_name', name)
      customerRec.set('phone', phone)
      customerRec.set('phone_1_value', phone)
      customerRec.set('email', email)
      customerRec.set('email_1_value', email)
      customerRec.set('status', '1. Acolhimento')
      customerRec.set('phase', '')
      customerRec.set('source', source)
      customerRec.set('notes', notes)
      customerRec.set('tags', ['lead_quente', 'portal_externo', 'chaves_na_mao'])
      customerRec.set('last_origin', source)
      customerRec.set('last_origin_at', receivedAtIso)
      customerRec.set('origin_history', [originHistoryEntry])
      customerRec.set('persistence_status', 'ativo')
      customerRec.set('follow_up_count', 0)
      customerRec.set('rejection_count', 0)
      customerRec.set('urgency', 3) // lead quente
      app.saveNoValidate(customerRec)
      console.log('[MIG_1760000090] Registro criado em customers com id:', customerRec.id)
    } else {
      // Atualiza last_origin e last_origin_at se estiver em branco
      let updatedCust = false
      if (!customerRec.getString('last_origin')) {
        customerRec.set('last_origin', source)
        updatedCust = true
      }
      if (!customerRec.getString('last_origin_at')) {
        customerRec.set('last_origin_at', receivedAtIso)
        updatedCust = true
      }
      if (!customerRec.getString('source')) {
        customerRec.set('source', source)
        updatedCust = true
      }
      if (updatedCust) {
        app.saveNoValidate(customerRec)
        console.log('[MIG_1760000090] Customer existente atualizado com origem do portal.')
      }
    }

    // =========================================================================
    // PARTE 3: INSTRUÇÃO PARA A BIA NA CONSTITUIÇÃO v3.1 (bia_learnings)
    // =========================================================================
    const targetRecordId = 'tYVJIdIFb5rW4iq'
    let biaRec = null

    try {
      const foundRecs = app.findRecordsByFilter(
        'bia_learnings',
        `id = '${targetRecordId}' || is_active = true`,
        '-priority,-created',
        1,
        0,
      )
      if (foundRecs && foundRecs.length > 0) {
        biaRec = foundRecs[0]
      }
    } catch (_) {}

    if (biaRec) {
      let currentText = biaRec.getString('rule_text') || ''

      const instrucaoPortalQuente = `• REGRA SOBERANA PARA LEADS DE PORTAIS IMOBILIÁRIOS EXTERNOS (CHAVES NA MÃO, ZAP, VIVAREAL, ETC.):
  1. CLASSIFICAÇÃO: LEAD QUENTE DE ALTA INTENÇÃO.
     - Leads que chegam com formulário ou mensagem de portais (como "Portal Chaves na Mão", VivaReal, Zap Imóveis) procuraram ativamente um imóvel específico e têm altíssima intenção de compra.
     - Devem ser acolhidos de imediato no WhatsApp com agilidade, tom caloroso, consultivo e objetivo.
  2. ACOLHIMENTO E RESPOSTA DIRETA ÀS PERGUNTAS DO CLIENTE:
     - Responda pontualmente e com clareza a TODAS as dúvidas imediatas trazidas pelo lead no primeiro contato (ex.: possibilidade de visita, andar/posição solar, valor de condomínio, IPTU e disponibilidade).
     - Se o dado específico não estiver no cadastro do imóvel (ex.: valor exato do condomínio ou andar exato), confirme a disponibilidade geral, responda o que já tem com segurança e diga com naturalidade que vai checar o número exato com o Mauro e já retorna, mantendo o diálogo aberto e acolhedor.
  3. FOCO TOTAL NO IMÓVEL DO LEAD (REGRA DO MAURO):
     - NUNCA ofereça outro lançamento ou alternativa na 1ª resposta ao lead de portal.
     - Trabalhe 100% no imóvel pelo qual o cliente demonstrou interesse. Alternativas só podem ser citadas depois que o cliente expressamente disser que aquele imóvel não se encaixa nas necessidades dele.
  4. SEM CADÊNCIA NOVA:
     - O atendimento segue o Mapa de Movimento universal da Constituição v3.1 (Estágio 1. Acolhimento → Estágio 2. Qualificação e Convite de Visita). Não crie nem acione cadências paralelas.`

      if (currentText.includes('• REGRA SOBERANA PARA LEADS DE PORTAIS IMOBILIÁRIOS EXTERNOS')) {
        currentText = currentText.replace(
          /•\s*REGRA SOBERANA PARA LEADS DE PORTAIS IMOBILIÁRIOS EXTERNOS.*?(?=\n•|\n\d+\.|$)/s,
          instrucaoPortalQuente + '\n',
        )
      } else {
        // Inserir após a regra soberana de captura de e-mail ou antes de ROTEAMENTO
        const pontoInsercaoEmail = '• REGRA SOBERANA DE CAPTURA DE E-MAIL'
        if (currentText.includes(pontoInsercaoEmail)) {
          const posEmail = currentText.indexOf(pontoInsercaoEmail)
          const proximoBloco = currentText.indexOf('\n•', posEmail + pontoInsercaoEmail.length)
          if (proximoBloco !== -1) {
            currentText =
              currentText.substring(0, proximoBloco) +
              '\n\n' +
              instrucaoPortalQuente +
              currentText.substring(proximoBloco)
          } else {
            currentText = currentText + '\n\n' + instrucaoPortalQuente
          }
        } else {
          currentText = currentText + '\n\n' + instrucaoPortalQuente
        }
      }

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      biaRec.set('rule_text', currentText)
      biaRec.set('last_reviewed_at', now)
      biaRec.set('reviewed_by', 'Mauro Fengler (Regra Lead Portal Quente)')
      biaRec.set('updated', now)
      app.saveNoValidate(biaRec)

      // Sincroniza users.bia_instructions e users.ai_instructions
      try {
        app
          .db()
          .newQuery(
            'UPDATE users SET bia_instructions = {:rule_text}, ai_instructions = {:rule_text} WHERE 1=1',
          )
          .bind({ rule_text: currentText })
          .execute()
      } catch (syncErr) {
        console.warn('[MIG_1760000090] Aviso ao sincronizar users:', String(syncErr))
      }

      console.log(
        '[MIG_1760000090] Instrução de leads de portal gravada no Texto Único da Bia com sucesso!',
      )
    } else {
      console.warn('[MIG_1760000090] Registro de bia_learnings não encontrado.')
    }
  },
  (app) => {
    console.log('[MIG_1760000090] Reversão executada.')
  },
)
