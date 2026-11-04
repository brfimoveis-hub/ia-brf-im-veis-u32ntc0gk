migrate(
  (app) => {
    // 1760000095_criar_lead_vilson_lm327_chaves_na_mao.js
    //
    // Criação idempotente do lead Vilson, originado do portal Chaves na Mão:
    // Nome: Vilson
    // Telefone: 5548992084821 ((48) 99208-4821)
    // Imóvel de interesse: LM327 (Solar Di Plaza Residencial - Capoeiras, 3 suítes, R$ 1.097.876,78)
    // Usuário corretor: g5jto8bhulw01bz

    console.log('[MIG_1760000095] Iniciando criação do lead Vilson (LM327 - Chaves na Mão)...')

    const phoneDigits = '5548992084821'
    const name = 'Vilson'
    const source = 'Portal Chaves na Mão'
    const propertyRef = 'LM327'
    const propertyTitle = 'Solar Di Plaza - Capoeiras (3 suítes + demi-suíte, R$ 1.097.876,78)'
    const notes =
      'Lead recebido via Portal Chaves na Mão.\nInteresse: LM327 - ' +
      propertyTitle +
      '\nContato: (48) 99208-4821'
    const userId = 'g5jto8bhulw01bz'
    const receivedAtIso = new Date().toISOString()

    // 1. Coleção leads (Pipeline)
    const leadsCol = app.findCollectionByNameOrId('leads')
    let leadRec = null

    try {
      const existingLeads = app.findRecordsByFilter(
        'leads',
        `phone ~ '992084821' || phone ~ '99208-4821'`,
        '-created',
        1,
        0,
      )
      if (existingLeads && existingLeads.length > 0) {
        leadRec = existingLeads[0]
        console.log('[MIG_1760000095] Lead já existia na coleção leads com id:', leadRec.id)
      }
    } catch (eLead) {
      console.warn('[MIG_1760000095] Aviso ao buscar em leads:', eLead.message)
    }

    if (!leadRec) {
      leadRec = new Record(leadsCol)
      leadRec.set('assigned_to', userId)
      leadRec.set('name', name)
      leadRec.set('phone', phoneDigits)
      leadRec.set('source', source)
      leadRec.set('status', 'Novo')
      leadRec.set('notes', notes)
      app.saveNoValidate(leadRec)
      console.log('[MIG_1760000095] Lead Vilson criado em leads com id:', leadRec.id)
    }

    // 2. Coleção customers (Base Geral do CRM e Bia)
    const customersCol = app.findCollectionByNameOrId('customers')
    let customerRec = null

    try {
      const existingCusts = app.findRecordsByFilter(
        'customers',
        `phone ~ '992084821' || phone_1_value ~ '992084821'`,
        '-created',
        1,
        0,
      )
      if (existingCusts && existingCusts.length > 0) {
        customerRec = existingCusts[0]
        console.log('[MIG_1760000095] Customer já existia com id:', customerRec.id)
      }
    } catch (eCust) {
      console.warn('[MIG_1760000095] Aviso ao buscar em customers:', eCust.message)
    }

    const originHistoryEntry = {
      date: receivedAtIso,
      source: source,
      type: 'portal',
      property_ref: propertyRef,
      lead_id: leadRec ? leadRec.id : null,
    }

    if (!customerRec) {
      customerRec = new Record(customersCol)
      customerRec.set('user_id', userId)
      customerRec.set('name', name)
      customerRec.set('first_name', name)
      customerRec.set('phone', phoneDigits)
      customerRec.set('phone_1_value', phoneDigits)
      customerRec.set('status', '1. Acolhimento')
      customerRec.set('source', source)
      customerRec.set('last_origin', source)
      customerRec.set('last_origin_at', receivedAtIso)
      customerRec.set('notes', notes)
      customerRec.set('tags', ['lead_quente', 'portal_externo', 'chaves_na_mao', 'lm327'])
      customerRec.set('origin_history', [originHistoryEntry])
      customerRec.set('persistence_status', 'ativo')
      customerRec.set('follow_up_count', 0)
      customerRec.set('rejection_count', 0)
      customerRec.set('urgency', 3)
      app.saveNoValidate(customerRec)
      console.log('[MIG_1760000095] Customer criado para Vilson com id:', customerRec.id)
    }

    // 3. Registrar auditoria em system_logs
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('user_id', userId)
      log.set('type', 'chaves_na_mao_webhook_success')
      log.set(
        'message',
        'Lead Vilson (LM327 - Solar Di Plaza) integrado com sucesso no CRM via migração',
      )
      log.set(
        'details',
        JSON.stringify({
          phone: phoneDigits,
          property_ref: propertyRef,
          lead_id: leadRec ? leadRec.id : null,
          customer_id: customerRec ? customerRec.id : null,
        }),
      )
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {
    // Revert opcional no-op
  },
)
