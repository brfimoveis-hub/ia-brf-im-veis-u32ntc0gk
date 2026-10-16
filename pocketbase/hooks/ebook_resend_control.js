/**
 * REENVIO DIRIGIDO DO E-BOOK / BOOK OFICIAL (VISTAGE RESIDENCE)
 *
 * Endpoints:
 * - GET  /backend/v1/ebook-resend/audit
 *   Varre a base e identifica com precisão:
 *   1. Clientes que já receberam mensagem da Bia/régua/remarketing/correção.
 *   2. Clientes que NUNCA receberam o material com link oficial legítimo no corpo.
 *   3. Aplica filtros obrigatórios de proteção:
 *      - Não bloqueados (is_blocked = false)
 *      - Não pausados (persistence_status != 'pausado')
 *      - Não frios / desinteressados (sem 'frio'/'não é o momento' nas tags/status)
 *      - Sem diálogo vivo nas últimas 24h
 *      - Sem e-book já entregue (dedup estrito: link do Drive na conversa ou tag 'ebook_vistage_entregue')
 *   Retorna contagem total de abordados, quantos já têm e-book, quantos estão pendentes elegíveis,
 *   quantos foram desqualificados (bloqueados, pausados, 24h viva) e a lista detalhada para conferência.
 *
 * - POST /backend/v1/ebook-resend/batch
 *   Dispara um lote controlado (máximo 15 por ciclo, anti-flood) para os clientes pendentes:
 *   - Formato padronizado e consertado:
 *     Identificação oficial Bia ("Bia da BRF Imóveis — bom dia/boa tarde, [primeiro nome], tudo bem?"),
 *     apresentação da oportunidade (Vistage Residence Barreiros - AJ Coelho, Barreiros, São José/SC),
 *     link do book NO CORPO da mensagem,
 *     legenda "Material oficial: Vistage Residence",
 *     pergunta leve no final ("Faz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?").
 *     SEM link de site, SEM preço cheio, SEM tabelas/políticas (blacklist preservada).
 *   - Validação da janela comercial de Brasília (8h às 18h seg a sáb).
 *   - Respeita trava de 3 min (ai_processing).
 *   - Registra em conversations (channel: 'whatsapp', sender: 'ai').
 *   - Marca o cliente com a tag 'ebook_vistage_entregue' após envio bem-sucedido.
 *   - Registra auditoria completa em system_logs (type: 'ebook_resend_item' e 'ebook_resend_batch').
 */

// ============================================================================
// ENDPOINT: GET /backend/v1/ebook-resend/audit
// ============================================================================
routerAdd('GET', '/backend/v1/ebook-resend/audit', (c) => {
  const app = $app

  function getBrasiliaHourAndWindow() {
    const now = new Date()
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    const brTime = new Date(utcTime - 3 * 3600000)
    const brHour = brTime.getHours()
    const brDay = brTime.getDay() // 0 = Domingo
    const isWindow = brDay !== 0 && brHour >= 8 && brHour < 18
    return {
      hour: brHour,
      minute: brTime.getMinutes(),
      dayOfWeek: brDay,
      isCommercialWindow: isWindow,
      iso: now.toISOString(),
    }
  }

  function resolveCustomerCleanPhone(rawPhone) {
    if (!rawPhone) return ''
    let toPhone = String(rawPhone).replace(/\D/g, '')
    if (toPhone.startsWith('0') && toPhone.length >= 11) {
      toPhone = toPhone.substring(1)
    }
    if (toPhone.length === 8 || toPhone.length === 9) {
      toPhone = '48' + toPhone
    }
    if (toPhone.length < 10) return ''
    if (!toPhone.startsWith('55') && toPhone.length <= 11) {
      toPhone = '55' + toPhone
    }
    return toPhone
  }

  function resolveCustomerFirstName(cust) {
    if (!cust) return ''
    const fName = (cust.getString('first_name') || '').trim()
    const fullName = (cust.getString('name') || '').trim()
    const candidate = fName || fullName
    if (!candidate) return ''
    if (
      candidate.includes('+') ||
      candidate.includes('@') ||
      /^\d+$/.test(candidate.replace(/[\s\(\)\-\.]/g, ''))
    ) {
      return ''
    }
    if (
      /^(lead|cliente|contato|teste|whatsapp|meta|novo|usuario|usuário|imóvel|imovel|sem nome)\b/i.test(
        candidate,
      )
    ) {
      return ''
    }
    const parts = candidate.split(/\s+/).filter(Boolean)
    const first = parts[0]
    if (!first || first.length < 2 || /[0-9_#\*\/\\]/.test(first)) return ''
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
  }

  function isBlacklistedAttachment(nameStr) {
    if (!nameStr) return false
    const s = String(nameStr).toLowerCase().trim()
    return (
      s.includes('tabela') ||
      s.includes('politica') ||
      s.includes('política') ||
      s.includes('preco') ||
      s.includes('preço') ||
      s.includes('valores')
    )
  }

  function resolveVistageLocalDocument(app) {
    const pbBaseUrl =
      $os.getenv('POCKETBASE_URL') ||
      $os.getenv('VITE_POCKETBASE_URL') ||
      'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev'

    try {
      const bookRec = app.findRecordById('ai_knowledge_files', 'fcvyoatlxt56do2')
      if (bookRec && bookRec.getBool('is_active')) {
        const rName = (bookRec.getString('name') || '').trim()
        const physFile = (bookRec.getString('file') || '').trim()
        const fSize = bookRec.getInt('file_size') || 0

        if (!isBlacklistedAttachment(rName) && physFile && fSize > 0) {
          const publicUrl =
            pbBaseUrl + '/api/files/' + bookRec.collectionId + '/' + bookRec.id + '/' + physFile
          return {
            valid: true,
            record_id: bookRec.id,
            filename: rName.endsWith('.pdf') ? rName : rName + '.pdf',
            stored_file: physFile,
            file_size: fSize,
            public_url: publicUrl,
            caption: 'Material oficial: Vistage Residence',
          }
        }
      }
    } catch (_) {}

    return {
      valid: false,
      record_id: '',
      filename: '',
      stored_file: '',
      file_size: 0,
      public_url: '',
      caption: '',
    }
  }

  function hasCustomerReceivedOfficialEbook(cust, convs, docInfo) {
    if (cust) {
      const rawTags = cust.get('tags') || []
      let tags = []
      if (Array.isArray(rawTags)) {
        tags = rawTags.map((t) => String(t).toLowerCase())
      } else if (typeof rawTags === 'string') {
        try {
          const parsed = JSON.parse(rawTags)
          if (Array.isArray(parsed)) {
            tags = parsed.map((t) => String(t).toLowerCase())
          }
        } catch (_) {}
      }
      if (
        tags.indexOf('ebook_vistage_entregue') !== -1 ||
        tags.indexOf('ebook_vistage_documento_entregue') !== -1
      ) {
        return true
      }
    }

    if (!convs || convs.length === 0) return false
    const pubUrl = (docInfo && docInfo.public_url ? docInfo.public_url : '').trim()

    for (let i = 0; i < convs.length; i++) {
      const c = convs[i]
      const content = c.getString('content') || ''
      if (
        content.indexOf('1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG') !== -1 ||
        (pubUrl && content.indexOf(pubUrl) !== -1) ||
        content.indexOf('Material oficial: Vistage Residence') !== -1 ||
        content.indexOf('book_vistage_residence') !== -1
      ) {
        return true
      }
    }
    return false
  }

  function checkCustomerExclusions(cust, convs, nowMs) {
    const status = (cust.getString('status') || '').toLowerCase()
    const phase = (cust.getString('phase') || '').toLowerCase()
    const pStatus = (cust.getString('persistence_status') || '').toLowerCase()
    const followUpStep = (cust.getString('follow_up_step') || '').toLowerCase()
    const isBlocked = !!cust.getBool('is_blocked')

    const rawTags = cust.get('tags') || []
    let tagsList = []
    if (Array.isArray(rawTags)) {
      tagsList = rawTags.filter((t) => typeof t === 'string').map((t) => t.toLowerCase())
    } else if (typeof rawTags === 'string') {
      try {
        const parsed = JSON.parse(rawTags)
        if (Array.isArray(parsed)) {
          tagsList = parsed.map((t) => String(t).toLowerCase())
        }
      } catch (_) {}
    }

    if (isBlocked || status.includes('bloqueado') || tagsList.includes('bloqueado')) {
      return { excluded: true, reason: 'bloqueado' }
    }
    if (pStatus === 'pausado' || tagsList.includes('ai_paused')) {
      return { excluded: true, reason: 'pausado' }
    }
    if (
      status.includes('perdido') ||
      phase.includes('perdido') ||
      tagsList.includes('frio') ||
      tagsList.includes('não é o momento') ||
      tagsList.includes('nao e o momento')
    ) {
      return { excluded: true, reason: 'frio_ou_perdido' }
    }
    if (followUpStep === 'finalizado') {
      return { excluded: true, reason: 'finalizado' }
    }

    // Guarda 24h: não atropelar atendimento humano recente se o CLIENTE respondeu nas últimas 24h
    const oneDayMs = 24 * 60 * 60 * 1000
    if (convs && convs.length > 0) {
      for (let cIdx = 0; cIdx < convs.length; cIdx++) {
        const convItem = convs[cIdx]
        const sender = convItem.getString('sender') || ''
        const cTime = new Date(convItem.getString('created')).getTime()
        if (nowMs - cTime < oneDayMs && sender === 'customer') {
          return {
            excluded: true,
            reason: 'conversa_viva_24h',
            last_sender: 'customer',
          }
        }
      }
    }

    return { excluded: false, reason: null }
  }

  const windowInfo = getBrasiliaHourAndWindow()
  const localDoc = resolveVistageLocalDocument(app)
  const now = new Date()
  const nowMs = now.getTime()

  // Buscar clientes abordados elegíveis de forma rápida e otimizada (sem carregar 1000 registros pesados)
  // Um cliente abordado tem last_sent_at != '' || last_follow_up_at != '' || follow_up_count > 0 || follow_up_step != ''
  let approachedCustomers = []
  try {
    const rows = app
      .db()
      .newQuery(
        "SELECT id, name, first_name, phone, status, phase, persistence_status, follow_up_step, follow_up_count, is_blocked, tags, last_sent_at, last_follow_up_at FROM customers WHERE phone IS NOT NULL AND phone != '' AND (last_sent_at != '' OR last_follow_up_at != '' OR follow_up_count > 0 OR follow_up_step != '') ORDER BY updated DESC LIMIT 1000",
      )
      .all()
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const r = rows[rIdx]
      approachedCustomers.push({
        id: r.id,
        getString: (field) => (r[field] != null ? String(r[field]) : ''),
        getInt: (field) => parseInt(r[field] || 0, 10),
        getBool: (field) => !!r[field],
        get: (field) => r[field],
      })
    }
  } catch (err) {
    console.error('[EBOOK_RESEND] Erro ao buscar clientes por SQL otimizado: ' + err.message)
    try {
      approachedCustomers = app.findRecordsByFilter(
        'customers',
        "phone != '' && (last_sent_at != '' || last_follow_up_at != '' || follow_up_count > 0 || follow_up_step != '')",
        '-updated',
        600,
        0,
      )
    } catch (e2) {
      return c.json(500, { success: false, error: e2.message })
    }
  }

  const approachedList = []
  const alreadyDeliveredList = []
  const excludedList = []
  const eligiblePendingList = []

  for (let i = 0; i < approachedCustomers.length; i++) {
    const cust = approachedCustomers[i]
    const custId = cust.id
    const phone = resolveCustomerCleanPhone(cust.getString('phone'))
    if (!phone || phone.length < 10) continue

    const lastSentAt = cust.getString('last_sent_at') || ''
    const lastFollowUpAt = cust.getString('last_follow_up_at') || ''
    const followUpCount = cust.getInt('follow_up_count') || 0
    const followUpStep = cust.getString('follow_up_step') || ''

    const greetingName = resolveCustomerFirstName(cust)
    const clientSummary = {
      id: custId,
      name: cust.getString('name') || 'Sem nome',
      greeting_name: greetingName,
      phone: phone,
      status: cust.getString('status') || '',
      follow_up_step: followUpStep,
      follow_up_count: followUpCount,
      last_conv_date: null,
    }

    approachedList.push(clientSummary)

    // Checagem rápida de tags antes de carregar conversas
    const rawTags = cust.get('tags') || []
    let tagsList = []
    if (Array.isArray(rawTags)) {
      tagsList = rawTags.filter((t) => typeof t === 'string').map((t) => t.toLowerCase())
    } else if (typeof rawTags === 'string') {
      try {
        const parsed = JSON.parse(rawTags)
        if (Array.isArray(parsed)) {
          tagsList = parsed.map((t) => String(t).toLowerCase())
        }
      } catch (_) {}
    }

    if (
      tagsList.includes('ebook_vistage_entregue') ||
      tagsList.includes('ebook_vistage_documento_entregue')
    ) {
      alreadyDeliveredList.push(clientSummary)
      continue
    }

    let convs = []
    try {
      convs = app.findRecordsByFilter(
        'conversations',
        "customer_id = '" + custId + "'",
        '-created',
        15,
        0,
      )
      if (convs.length > 0) {
        clientSummary.last_conv_date = convs[0].getString('created')
      }
    } catch (_) {}

    // Checar se já recebeu o e-book legítimo (por conversa ou tag)
    if (hasCustomerReceivedOfficialEbook(cust, convs, localDoc)) {
      alreadyDeliveredList.push(clientSummary)
      continue
    }

    // Checar exclusões (bloqueado, pausado, frio, conversa viva 24h com cliente)
    const exclusionCheck = checkCustomerExclusions(cust, convs, nowMs)
    if (exclusionCheck.excluded) {
      clientSummary.exclusion_reason = exclusionCheck.reason
      excludedList.push(clientSummary)
      continue
    }

    eligiblePendingList.push(clientSummary)
  }

  return c.json(200, {
    success: true,
    commercial_window: windowInfo,
    local_document: localDoc,
    book_link: localDoc.public_url || '',
    storage_source: 'ai_knowledge_files:fcvyoatlxt56do2',
    delivery_mechanism: localDoc.valid ? 'whatsapp_document_attached' : 'none_corrupted_storage',
    summary: {
      total_approached: approachedList.length,
      already_delivered: alreadyDeliveredList.length,
      excluded_count: excludedList.length,
      eligible_pending_count: eligiblePendingList.length,
    },
    eligible_pending: eligiblePendingList,
    excluded_sample: excludedList.slice(0, 10),
    checked_at: new Date().toISOString(),
  })
})

// ============================================================================
// ENDPOINT: POST /backend/v1/ebook-resend/batch
// ============================================================================
routerAdd('POST', '/backend/v1/ebook-resend/batch', (c) => {
  const app = $app

  function getBrasiliaHourAndWindow() {
    const now = new Date()
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    const brTime = new Date(utcTime - 3 * 3600000)
    const brHour = brTime.getHours()
    const brDay = brTime.getDay()
    const isWindow = brDay !== 0 && brHour >= 8 && brHour < 18
    return {
      hour: brHour,
      minute: brTime.getMinutes(),
      dayOfWeek: brDay,
      isCommercialWindow: isWindow,
      iso: now.toISOString(),
    }
  }

  function resolveCustomerCleanPhone(rawPhone) {
    if (!rawPhone) return ''
    let toPhone = String(rawPhone).replace(/\D/g, '')
    if (toPhone.startsWith('0') && toPhone.length >= 11) {
      toPhone = toPhone.substring(1)
    }
    if (toPhone.length === 8 || toPhone.length === 9) {
      toPhone = '48' + toPhone
    }
    if (toPhone.length < 10) return ''
    if (!toPhone.startsWith('55') && toPhone.length <= 11) {
      toPhone = '55' + toPhone
    }
    return toPhone
  }

  function resolveCustomerFirstName(cust) {
    if (!cust) return ''
    const fName = (cust.getString('first_name') || '').trim()
    const fullName = (cust.getString('name') || '').trim()
    const candidate = fName || fullName
    if (!candidate) return ''
    if (
      candidate.includes('+') ||
      candidate.includes('@') ||
      /^\d+$/.test(candidate.replace(/[\s\(\)\-\.]/g, ''))
    ) {
      return ''
    }
    if (
      /^(lead|cliente|contato|teste|whatsapp|meta|novo|usuario|usuário|imóvel|imovel|sem nome)\b/i.test(
        candidate,
      )
    ) {
      return ''
    }
    const parts = candidate.split(/\s+/).filter(Boolean)
    const first = parts[0]
    if (!first || first.length < 2 || /[0-9_#\*\/\\]/.test(first)) return ''
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
  }

  function resolveOfficialVistageBookLink() {
    return 'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
  }

  function hasCustomerReceivedOfficialEbook(cust, convs, docInfo) {
    if (cust) {
      const rawTags = cust.get('tags') || []
      let tags = []
      if (Array.isArray(rawTags)) {
        tags = rawTags.map((t) => String(t).toLowerCase())
      } else if (typeof rawTags === 'string') {
        try {
          const parsed = JSON.parse(rawTags)
          if (Array.isArray(parsed)) {
            tags = parsed.map((t) => String(t).toLowerCase())
          }
        } catch (_) {}
      }
      if (
        tags.indexOf('ebook_vistage_entregue') !== -1 ||
        tags.indexOf('ebook_vistage_documento_entregue') !== -1
      ) {
        return true
      }
    }

    if (!convs || convs.length === 0) return false
    const pubUrl = (docInfo && docInfo.public_url ? docInfo.public_url : '').trim()

    for (let i = 0; i < convs.length; i++) {
      const c = convs[i]
      const content = c.getString('content') || ''
      if (
        content.indexOf('1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG') !== -1 ||
        (pubUrl && content.indexOf(pubUrl) !== -1) ||
        content.indexOf('Material oficial: Vistage Residence') !== -1 ||
        content.indexOf('book_vistage_residence') !== -1
      ) {
        return true
      }
    }
    return false
  }

  function checkCustomerExclusions(cust, convs, nowMs) {
    const status = (cust.getString('status') || '').toLowerCase()
    const phase = (cust.getString('phase') || '').toLowerCase()
    const pStatus = (cust.getString('persistence_status') || '').toLowerCase()
    const followUpStep = (cust.getString('follow_up_step') || '').toLowerCase()
    const isBlocked = !!cust.getBool('is_blocked')

    const rawTags = cust.get('tags') || []
    let tagsList = []
    if (Array.isArray(rawTags)) {
      tagsList = rawTags.filter((t) => typeof t === 'string').map((t) => t.toLowerCase())
    } else if (typeof rawTags === 'string') {
      try {
        const parsed = JSON.parse(rawTags)
        if (Array.isArray(parsed)) {
          tagsList = parsed.map((t) => String(t).toLowerCase())
        }
      } catch (_) {}
    }

    if (isBlocked || status.includes('bloqueado') || tagsList.includes('bloqueado')) {
      return { excluded: true, reason: 'bloqueado' }
    }
    if (pStatus === 'pausado' || tagsList.includes('ai_paused')) {
      return { excluded: true, reason: 'pausado' }
    }
    if (
      status.includes('perdido') ||
      phase.includes('perdido') ||
      tagsList.includes('frio') ||
      tagsList.includes('não é o momento') ||
      tagsList.includes('nao e o momento')
    ) {
      return { excluded: true, reason: 'frio_ou_perdido' }
    }
    if (followUpStep === 'finalizado') {
      return { excluded: true, reason: 'finalizado' }
    }

    const oneDayMs = 24 * 60 * 60 * 1000
    if (convs && convs.length > 0) {
      for (let cIdx = 0; cIdx < convs.length; cIdx++) {
        const convItem = convs[cIdx]
        const sender = convItem.getString('sender') || ''
        const cTime = new Date(convItem.getString('created')).getTime()
        if (nowMs - cTime < oneDayMs && sender === 'customer') {
          return {
            excluded: true,
            reason: 'conversa_viva_24h',
            last_sender: 'customer',
          }
        }
      }
    }

    return { excluded: false, reason: null }
  }

  const windowInfo = getBrasiliaHourAndWindow()

  // 1. Verificar credenciais Meta WhatsApp
  let metaToken = ''
  let metaPhoneId = ''
  let activeUserId = ''

  try {
    const authRec = c.requestInfo().auth
    if (authRec) {
      activeUserId = authRec.id
      metaToken = (authRec.getString('meta_whatsapp_access_token') || '').trim()
      metaPhoneId = (authRec.getString('meta_whatsapp_phone_number_id') || '').trim()
    }
  } catch (_) {}

  // Fallback caso venha com cabeçalho de auth alternativo ou request sem user direto
  if (!activeUserId) {
    try {
      const uRec = app.findFirstRecordByFilter('users', "email != ''")
      if (uRec) activeUserId = uRec.id
    } catch (_) {}
  }

  if (!metaToken || !metaPhoneId) {
    try {
      const usersWithMeta = app.findRecordsByFilter(
        'users',
        "meta_whatsapp_access_token != '' && meta_whatsapp_phone_number_id != ''",
        '-created',
        1,
        0,
      )
      if (usersWithMeta && usersWithMeta.length > 0) {
        metaToken = (usersWithMeta[0].getString('meta_whatsapp_access_token') || '').trim()
        metaPhoneId = (usersWithMeta[0].getString('meta_whatsapp_phone_number_id') || '').trim()
        if (!activeUserId) activeUserId = usersWithMeta[0].id
      }
    } catch (_) {}
  }

  if (!metaToken || !metaPhoneId) {
    return c.json(400, {
      success: false,
      error: 'Credenciais do Meta WhatsApp Cloud API não configuradas no sistema.',
    })
  }

  // 2. Parâmetros da requisição
  let body = {}
  try {
    body = c.requestInfo().body || {}
  } catch (_) {}

  const forceOutsideWindow = !!body.force_outside_window
  let maxBatchSize = parseInt(body.batch_size || 15, 10)
  if (isNaN(maxBatchSize) || maxBatchSize < 1) maxBatchSize = 15
  if (maxBatchSize > 15) maxBatchSize = 15 // Teto rígido anti-flood: 15 por ciclo

  if (!windowInfo.isCommercialWindow && !forceOutsideWindow) {
    return c.json(400, {
      success: false,
      error:
        'Fora do horário comercial de Brasília (8h às 18h, seg a sáb). Para enviar mesmo assim, marque a confirmação expressa.',
      commercial_window: windowInfo,
    })
  }

  // 3. Resolução do documento local e auditoria para lista dos pendentes
  const localDoc = resolveVistageLocalDocument(app)
  const hasValidLocalFile = localDoc.valid && localDoc.file_size > 0
  const now = new Date()
  const nowMs = now.getTime()

  let approachedCustomers = []
  try {
    // Usar db().newQuery para selecionar apenas as colunas necessárias e evitar timeout com tabela grande
    const rows = app
      .db()
      .newQuery(
        "SELECT id, name, first_name, phone, status, phase, persistence_status, follow_up_step, follow_up_count, is_blocked, tags, last_sent_at, last_follow_up_at FROM customers WHERE phone IS NOT NULL AND phone != '' AND (last_sent_at != '' OR last_follow_up_at != '' OR follow_up_count > 0 OR follow_up_step != '') ORDER BY updated DESC LIMIT 1000",
      )
      .all()
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const r = rows[rIdx]
      approachedCustomers.push({
        id: r.id,
        getString: (field) => (r[field] != null ? String(r[field]) : ''),
        getInt: (field) => parseInt(r[field] || 0, 10),
        getBool: (field) => !!r[field],
        get: (field) => r[field],
      })
    }
  } catch (fetchErr) {
    console.warn('[EBOOK_RESEND] Erro ao buscar customers via SQL otimizado: ' + fetchErr.message)
    try {
      approachedCustomers = app.findRecordsByFilter(
        'customers',
        "phone != '' && (last_sent_at != '' || last_follow_up_at != '' || follow_up_count > 0 || follow_up_step != '')",
        '-updated',
        600,
        0,
      )
    } catch (e2) {
      return c.json(500, { success: false, error: e2.message })
    }
  }

  const pendingList = []
  for (let i = 0; i < approachedCustomers.length; i++) {
    const cust = approachedCustomers[i]
    const custId = cust.id
    const phone = resolveCustomerCleanPhone(cust.getString('phone'))
    if (!phone || phone.length < 10) continue

    // Checagem rápida de tags
    const rawTags = cust.get('tags') || []
    let tagsList = []
    if (Array.isArray(rawTags)) {
      tagsList = rawTags.filter((t) => typeof t === 'string').map((t) => t.toLowerCase())
    } else if (typeof rawTags === 'string') {
      try {
        const parsed = JSON.parse(rawTags)
        if (Array.isArray(parsed)) tagsList = parsed.map((t) => String(t).toLowerCase())
      } catch (_) {}
    }

    if (
      tagsList.includes('ebook_vistage_entregue') ||
      tagsList.includes('ebook_vistage_documento_entregue')
    ) {
      continue
    }

    let convs = []
    try {
      convs = app.findRecordsByFilter(
        'conversations',
        "customer_id = '" + custId + "'",
        '-created',
        15,
        0,
      )
    } catch (_) {}

    if (hasCustomerReceivedOfficialEbook(cust, convs, localDoc)) continue

    const exclusionCheck = checkCustomerExclusions(cust, convs, nowMs)
    if (exclusionCheck.excluded) continue

    pendingList.push({
      id: custId,
      name: cust.getString('name') || 'Sem nome',
      greeting_name: resolveCustomerFirstName(cust),
      phone: phone,
    })
  }

  if (pendingList.length === 0) {
    return c.json(200, {
      success: true,
      dispatched_count: 0,
      remaining_pending: 0,
      message: 'Nenhum cliente elegível pendente de e-book no momento!',
    })
  }

  const batch = pendingList.slice(0, maxBatchSize)
  const salutationWord =
    windowInfo.hour < 12 ? 'bom dia' : windowInfo.hour < 18 ? 'boa tarde' : 'boa noite'
  const metaUrl = 'https://graph.facebook.com/v21.0/' + metaPhoneId + '/messages'

  const dispatched = []
  const failed = []

  for (let bIdx = 0; bIdx < batch.length; bIdx++) {
    const item = batch[bIdx]
    const custId = item.id
    const phoneNum = item.phone
    const gName = item.greeting_name

    // Trava blindada ai_processing (3 min)
    let lockAcquired = false
    try {
      const custRec = app.findRecordById('customers', custId)
      const rawTags = custRec.get('tags') || []
      let tags = []
      if (Array.isArray(rawTags)) {
        tags = rawTags.filter((t) => typeof t === 'string')
      }
      const lockNowMs = Date.now()
      const lockPrefix = 'ai_processing:'
      let isLocked = false
      for (let tIdx = 0; tIdx < tags.length; tIdx++) {
        const t = tags[tIdx]
        if (t.indexOf(lockPrefix) === 0) {
          const lockTime = parseInt(t.substring(lockPrefix.length), 10)
          if (!isNaN(lockTime) && lockNowMs - lockTime < 180000) {
            isLocked = true
            break
          }
        }
      }
      if (isLocked) {
        failed.push({ id: custId, phone: phoneNum, error: 'Locked (ai_processing ativa)' })
        continue
      }

      const newTags = tags.filter((t) => t !== 'ai_processing' && t.indexOf('ai_processing:') !== 0)
      newTags.push('ai_processing:' + lockNowMs)
      custRec.set('tags', newTags)
      app.saveNoValidate(custRec)
      lockAcquired = true
    } catch (lockErr) {
      failed.push({ id: custId, phone: phoneNum, error: 'Erro de trava: ' + lockErr.message })
      continue
    }

    // Montagem do texto consertado conforme especificação:
    // Identificação oficial Bia ("Bia da BRF Imóveis — bom dia/boa tarde, [primeiro nome], tudo bem?"),
    // Apresentação da oportunidade (Vistage Residence Barreiros - AJ Coelho em Barreiros, São José/SC).
    // REGRA QUE PERMANECE:
    // Se NÃO houver arquivo físico íntegro (tamanho > 0), a mensagem sai SEM promessa de e-book e SEM link.
    // Se houver arquivo físico íntegro:
    // PRIORIDADE 1: enviar como DOCUMENTO via WhatsApp Cloud API usando a URL pública do binário do nosso storage.
    // E no corpo, texto limpo de apresentação e convite para ver o documento anexo.
    // O link do Google Drive NUNCA mais aparece no corpo das mensagens de reenvio.
    const greetingPart = gName
      ? 'Bia da BRF Imóveis — ' + salutationWord + ', ' + gName + ', tudo bem?'
      : 'Bia da BRF Imóveis — ' + salutationWord + ', tudo bem?'

    let fullMessageText = ''
    if (hasValidLocalFile) {
      fullMessageText =
        greetingPart +
        '\n\nComo você já demonstrou interesse em oportunidades imobiliárias por aqui, tomei a liberdade de te apresentar esta novidade do Vistage Residence Barreiros - AJ Coelho em Barreiros, São José/SC (Grande Florianópolis).' +
        '\n\nEnvio em anexo o Book oficial completo em alta definição para você conhecer os detalhes do projeto.' +
        '\n\nFaz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?'
    } else {
      // Sem arquivo físico íntegro: NUNCA prometer o que não vai e SEM link
      fullMessageText =
        greetingPart +
        '\n\nComo você já demonstrou interesse em oportunidades imobiliárias por aqui, passei para te apresentar novidades da região de Barreiros, São José/SC.' +
        '\n\nFaz sentido para você conhecer as opções disponíveis de 2 ou 3 dormitórios?'
    }

    let sendSuccess = false
    let sendError = ''
    let documentSent = false
    let documentError = ''

    // 1. Envio da mensagem de texto
    try {
      const sendRes = $http.send({
        url: metaUrl,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + metaToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNum,
          type: 'text',
          text: { preview_url: false, body: fullMessageText },
        }),
        timeout: 25,
      })

      if (sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300) {
        sendSuccess = true
      } else {
        let errBody = ''
        try {
          errBody = JSON.stringify(sendRes ? sendRes.json || sendRes.body : '')
        } catch (_) {}
        sendError = 'HTTP ' + (sendRes ? sendRes.statusCode : 0) + ': ' + errBody
      }
    } catch (httpErr) {
      sendError = 'Exceção HTTP Texto: ' + httpErr.message
    }

    // 2. Prioridade 1: Enviar como DOCUMENTO via WhatsApp Cloud API usando a URL pública do binário do storage local
    if (sendSuccess && hasValidLocalFile) {
      try {
        const docPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNum,
          type: 'document',
          document: {
            link: localDoc.public_url,
            filename: localDoc.filename || 'BOOK VISTAGE RESIDENCE.pdf',
            caption: localDoc.caption || 'Material oficial: Vistage Residence',
          },
        }

        const docRes = $http.send({
          url: metaUrl,
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + metaToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(docPayload),
          timeout: 30,
        })

        if (docRes && docRes.statusCode >= 200 && docRes.statusCode < 300) {
          documentSent = true
          console.log('[EBOOK_RESEND] Documento WhatsApp enviado com sucesso para ' + phoneNum)
        } else {
          let dErrBody = ''
          try {
            dErrBody = JSON.stringify(docRes ? docRes.json || docRes.body : '')
          } catch (_) {}
          documentError = 'HTTP ' + (docRes ? docRes.statusCode : 0) + ': ' + dErrBody
          console.warn(
            '[EBOOK_RESEND] Envio de documento WhatsApp falhou para ' +
              phoneNum +
              ': ' +
              documentError +
              '. Acionando Prioridade 2 (URL pública própria no corpo)...',
          )

          // PRIORIDADE 2: Se documento anexado falhar, envia mensagem com a URL pública do storage próprio
          try {
            const fallbackMsg =
              '📄 *Material oficial: Vistage Residence*\n' +
              'Acesse o book completo em alta definição no link seguro do nosso storage:\n' +
              localDoc.public_url

            const fallbackRes = $http.send({
              url: metaUrl,
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + metaToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phoneNum,
                type: 'text',
                text: { preview_url: true, body: fallbackMsg },
              }),
              timeout: 25,
            })

            if (fallbackRes && fallbackRes.statusCode >= 200 && fallbackRes.statusCode < 300) {
              documentSent = true // Entregue via URL própria
              fullMessageText += '\n\n' + fallbackMsg
            }
          } catch (fallbackErr) {
            console.warn('[EBOOK_RESEND] Falha no fallback de URL própria: ' + fallbackErr.message)
          }
        }
      } catch (docErr) {
        documentError = 'Exceção HTTP Doc: ' + docErr.message
        console.warn('[EBOOK_RESEND] Exceção no envio de documento: ' + docErr.message)
      }
    }

    // Liberação do lock, tag de entrega e gravação
    try {
      const cUpdate = app.findRecordById('customers', custId)
      const cRawTags = cUpdate.get('tags') || []
      let cTags = []
      if (Array.isArray(cRawTags)) {
        cTags = cRawTags.filter((t) => typeof t === 'string' && t.indexOf('ai_processing') !== 0)
      }

      if (sendSuccess) {
        if (cTags.indexOf('ebook_vistage_entregue') === -1) {
          cTags.push('ebook_vistage_entregue')
        }
        if (documentSent && cTags.indexOf('ebook_vistage_documento_entregue') === -1) {
          cTags.push('ebook_vistage_documento_entregue')
        }
        cUpdate.set('tags', cTags)
        cUpdate.set('last_follow_up_at', new Date().toISOString())
        cUpdate.set('next_follow_up_at', new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString())
        cUpdate.set('follow_up_step', 'd3')
        cUpdate.set('follow_up_count', (cUpdate.getInt('follow_up_count') || 0) + 1)
        cUpdate.set('persistence_status', 'ativo')
        app.saveNoValidate(cUpdate)

        // Gravar conversa
        try {
          const convCol = app.findCollectionByNameOrId('conversations')
          const convRec = new Record(convCol)
          convRec.set('user_id', activeUserId || cUpdate.getString('user_id') || '')
          convRec.set('customer_id', custId)
          convRec.set('sender', 'ai')
          convRec.set(
            'content',
            fullMessageText +
              (documentSent ? '\n\n[Documento WhatsApp Anexado: ' + localDoc.filename + ']' : ''),
          )
          convRec.set('channel', 'whatsapp')
          app.saveNoValidate(convRec)
        } catch (_) {}

        // Gravar log estruturado de auditoria individual em system_logs
        try {
          const logsCol = app.findCollectionByNameOrId('system_logs')
          const logRec = new Record(logsCol)
          logRec.set('user_id', activeUserId)
          logRec.set('type', 'ebook_resend_item')
          logRec.set(
            'message',
            'E-book Vistage reenviado com sucesso para ' +
              phoneNum +
              ' [' +
              (gName || 'Sem nome') +
              ']' +
              (documentSent ? ' [com documento anexo]' : ''),
          )
          logRec.set(
            'details',
            JSON.stringify({
              customer_id: custId,
              phone: phoneNum,
              name: item.name,
              document_sent: documentSent,
              document_file: localDoc.stored_file,
              document_size: localDoc.file_size,
              storage_url: localDoc.public_url,
              delivery_mechanism: documentSent
                ? 'whatsapp_document_attached'
                : 'text_only_fallback',
              status: 'sucesso',
            }),
          )
          logRec.set('payload', JSON.stringify({ message: fullMessageText }))
          app.saveNoValidate(logRec)
        } catch (_) {}

        dispatched.push({
          id: custId,
          phone: phoneNum,
          name: item.name,
          document_sent: documentSent,
        })
      } else {
        cUpdate.set('tags', cTags)
        app.saveNoValidate(cUpdate)
        failed.push({ id: custId, phone: phoneNum, error: sendError })
      }
    } catch (cleanupErr) {
      console.warn('[EBOOK_RESEND] Erro pós-envio: ' + cleanupErr.message)
    }
  }

  // Gravar log de resumo do lote em system_logs
  try {
    const sLogsCol = app.findCollectionByNameOrId('system_logs')
    const batchLog = new Record(sLogsCol)
    batchLog.set('user_id', activeUserId)
    batchLog.set('type', 'ebook_resend_batch')
    batchLog.set(
      'message',
      'Lote de reenvio de e-book concluído: ' +
        dispatched.length +
        ' enviados com sucesso, ' +
        failed.length +
        ' falhas.',
    )
    batchLog.set(
      'details',
      JSON.stringify({
        dispatched_count: dispatched.length,
        failed_count: failed.length,
        total_attempted: batch.length,
        remaining_pending: Math.max(0, pendingList.length - dispatched.length),
        dispatched: dispatched,
        failed: failed,
        operator: activeUserId,
      }),
    )
    app.saveNoValidate(batchLog)
  } catch (_) {}

  return c.json(200, {
    success: true,
    dispatched_count: dispatched.length,
    failed_count: failed.length,
    remaining_pending: Math.max(0, pendingList.length - dispatched.length),
    dispatched: dispatched,
    failed: failed,
    message:
      dispatched.length +
      ' clientes receberam o material oficial Vistage com o link no corpo com sucesso!',
  })
})
