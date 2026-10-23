migrate(
  (app) => {
    let user = null
    try {
      user = app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {}
    if (!user) {
      try {
        const users = app.findRecordsByFilter('users', '', 'created', 1, 0)
        if (users.length > 0) user = users[0]
      } catch (_) {}
    }
    if (!user) return

    const userId = user.id
    const nowIso = new Date().toISOString()
    const nowBrStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const luanaPhone = '+5548984636494'
    const luanaEmail = 'luanamaravieira@gmail.com'
    const luanaName = 'Luana Mara Vieira'

    // Verificar se já existe por telefone exato ou email exato
    let existingLuana = null
    try {
      const match = app.findRecordsByFilter(
        'customers',
        "phone = '+5548984636494' || phone = '5548984636494' || phone = '48984636494' || email = 'luanamaravieira@gmail.com'",
        '-created',
        1,
        0,
      )
      if (match.length > 0) existingLuana = match[0]
    } catch (_) {}

    if (existingLuana) return

    // Buscar imóvel TR 338
    let tr338Prop = null
    try {
      const props = app.findRecordsByFilter(
        'properties',
        "code ~ '338' || title ~ '338' || title ~ 'Guaporanga'",
        '-created',
        1,
        0,
      )
      if (props.length > 0) tr338Prop = props[0]
    } catch (_) {}

    // Cadastrar Luana em customers
    const custCol = app.findCollectionByNameOrId('customers')
    const luanaRecord = new Record(custCol)
    luanaRecord.set('user_id', userId)
    luanaRecord.set('name', luanaName)
    luanaRecord.set('first_name', 'Luana')
    luanaRecord.set('phone', luanaPhone)
    luanaRecord.set('phone_1_value', luanaPhone)
    luanaRecord.set('email', luanaEmail)
    luanaRecord.set('email_1_value', luanaEmail)
    luanaRecord.set('status', '1. Acolhimento')
    luanaRecord.set('source', 'Facebook Ads')
    luanaRecord.set('last_origin', 'Facebook Ads — TR 338 (Terreno Guaporanga)')
    luanaRecord.set('last_origin_at', nowIso)
    luanaRecord.set('lead_profile', 'Investidor')
    luanaRecord.set('price_range', 'R$ 6.360.000,00')
    luanaRecord.set('neighborhood', 'Guaporanga')
    luanaRecord.set('tags', [
      'leadgen',
      'facebook_ads',
      'meta_ads',
      'imovel_tr338',
      'no_auto_outbound',
    ])

    const luanaNotes =
      '[Lead de Anúncio Meta (Lead Ads)]\n' +
      'Nome: Luana (Luana Mara Vieira)\n' +
      'Telefone: (48) 98463-6494 (' +
      luanaPhone +
      ')\n' +
      'E-mail: ' +
      luanaEmail +
      '\n' +
      'Anúncio: TR 338 — Terreno/Lote à venda no Tijuquinhas (Guaporanga), R$ 6.360.000,00\n' +
      'Imóvel Foco: TR 338 (Terreno de 10.817 m² frente BR-101 Km 183, Biguaçu/Guaporanga)\n' +
      'Link Oficial: https://www.brfimoveis.com.br/338/imoveis/venda-area-tijuquinhas-guaporanga-biguacu-sc\n' +
      'Valor: R$ 6.360.000,00\n' +
      'Origem: Formulário Meta Lead Ads (notificação Meta recebida por Mauro em 23/10/2026)\n' +
      'Status Inicial: 1. Acolhimento\n' +
      'Data de entrada: ' +
      nowBrStr +
      '\n' +
      'Diretriz: Cadastrado no CRM aguardando atendimento. Tag no_auto_outbound aplicada (sem envio de mensagem externa).'

    luanaRecord.set('notes', luanaNotes)
    luanaRecord.set('origin_history', [
      {
        source: 'Facebook Ads — TR 338',
        type: 'meta_leadgen',
        date: nowIso,
        ad_title: 'TR 338 — Terreno/Lote à venda no Tijuquinhas (Guaporanga), R$ 6.360.000,00',
        property_code: 'TR338',
      },
    ])

    app.save(luanaRecord)
    const luanaCustId = luanaRecord.id

    // Registrar em leads
    try {
      const leadsCol = app.findCollectionByNameOrId('leads')
      const luanaLead = new Record(leadsCol)
      luanaLead.set('assigned_to', userId)
      luanaLead.set('customer_id', luanaCustId)
      luanaLead.set('name', luanaName)
      luanaLead.set('phone', luanaPhone)
      luanaLead.set('email', luanaEmail)
      luanaLead.set('status', 'Novo')
      luanaLead.set('source', 'Facebook Ads')
      luanaLead.set('type', 'Venda')
      luanaLead.set('budget', 6360000)
      if (tr338Prop) {
        luanaLead.set('property_id', tr338Prop.id)
      }
      luanaLead.set(
        'notes',
        'Lead de Anúncio Meta: TR 338 — Terreno/Lote à venda no Tijuquinhas (Guaporanga), R$ 6.360.000,00',
      )
      app.save(luanaLead)
    } catch (errLead) {
      console.log('Erro ao salvar em leads: ' + String(errLead))
    }

    // Registrar em conversations como evento de entrada de sistema (sem mensagem externa)
    try {
      const convCol = app.findCollectionByNameOrId('conversations')
      const convNote = new Record(convCol)
      convNote.set('user_id', userId)
      convNote.set('customer_id', luanaCustId)
      convNote.set('sender', 'system')
      convNote.set('channel', 'meta_leadgen')
      convNote.set(
        'content',
        '[Origem Meta Lead Ads]: Lead capturado via formulário de anúncio da Meta. Anúncio: TR 338 — Terreno/Lote Tijuquinhas (Guaporanga), R$ 6.360.000,00. Contato: (48) 98463-6494 | luanamaravieira@gmail.com.',
      )
      app.save(convNote)
    } catch (_) {}

    // Registrar em system_logs (type leadgen)
    try {
      const sLogsCol = app.findCollectionByNameOrId('system_logs')
      const luanaLog = new Record(sLogsCol, {
        user_id: userId,
        type: 'leadgen',
        message: 'Lead de anúncio cadastrado no CRM: Luana (+5548984636494)',
        details:
          'Anúncio: TR 338 — Terreno/Lote à venda no Tijuquinhas (Guaporanga), R$ 6.360.000,00 | Status: 1. Acolhimento | Source: Facebook Ads | Email: luanamaravieira@gmail.com',
        payload: {
          customer_id: luanaCustId,
          name: luanaName,
          phone: luanaPhone,
          email: luanaEmail,
          ad_reference: 'TR 338 — Terreno/Lote à venda no Tijuquinhas (Guaporanga)',
          price: 'R$ 6.360.000,00',
          status: '1. Acolhimento',
          source: 'Facebook Ads',
        },
      })
      app.save(luanaLog)
    } catch (errLog) {
      console.log('Erro ao salvar system_log: ' + String(errLog))
    }
  },
  (app) => {},
)
