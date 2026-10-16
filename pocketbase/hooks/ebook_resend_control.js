/**
 * REENVIO DIRIGIDO DO E-BOOK / BOOK OFICIAL (VISTAGE RESIDENCE)
 *
 * Endpoints:
 * - GET  /backend/v1/ebook-resend/audit
 * - POST /backend/v1/ebook-resend/batch
 * - POST /backend/v1/ebook-resend/continuous-toggle
 * - CRON ebook_continuous_dispatcher
 *
 * REGRA DO POCKETBASE JSVM: Cada callback do routerAdd e cronAdd roda em isolamento.
 * Todas as funções auxiliares devem estar definidas internamente no corpo de cada handler.
 */

// ============================================================================
// ENDPOINT: GET /backend/v1/ebook-resend/audit
// ============================================================================
routerAdd('GET', '/backend/v1/ebook-resend/audit', (c) => {
  const app = $app

  function getBrasiliaHourAndWindow(dateObj) {
    const now = dateObj || new Date()
    const brTime = new Date(now.getTime() - 3 * 3600000)
    const brHour = brTime.getUTCHours()
    const brMinute = brTime.getUTCMinutes()
    const brDay = brTime.getUTCDay() // 0 = Domingo, 6 = Sábado
    const isWindow = brDay !== 0 && brHour >= 8 && brHour < 18
    return {
      hour: brHour,
      minute: brMinute,
      dayOfWeek: brDay,
      isCommercialWindow: isWindow,
      iso: now.toISOString(),
      brTimeString: String(brHour).padStart(2, '0') + ':' + String(brMinute).padStart(2, '0'),
    }
  }

  function validateAndCleanBrazilianPhone(rawPhone) {
    if (!rawPhone) {
      return { valid: false, phone: '', errorReason: 'Telefone vazio ou ausente' }
    }
    let str = String(rawPhone).trim()

    if (str.includes(':::')) {
      const parts = str
        .split(':::')
        .map((p) => p.trim())
        .filter(Boolean)
      for (let i = 0; i < parts.length; i++) {
        const partRes = validateAndCleanBrazilianPhone(parts[i])
        if (partRes.valid) return partRes
      }
      str = parts[0] || str
    }

    let digits = str.replace(/\D/g, '')
    if (digits.startsWith('0') && digits.length >= 11) {
      digits = digits.substring(1)
    }
    if (digits.length === 8 || digits.length === 9) {
      digits = '48' + digits
    }
    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = '55' + digits
    }

    // Duplicações coladas (ex: 55489998103785548999810378)
    if (digits.length >= 20 && digits.length <= 26 && digits.length % 2 === 0) {
      const half = digits.length / 2
      const firstHalf = digits.substring(0, half)
      const secondHalf = digits.substring(half)
      if (firstHalf === secondHalf) {
        const subRes = validateAndCleanBrazilianPhone(firstHalf)
        if (subRes.valid) return subRes
      }
    }

    if (digits.length < 12) {
      return {
        valid: false,
        phone: digits,
        errorReason:
          'Número incompleto (' + digits.length + ' dígitos, mínimo 12 com DDI 55 + DDD)',
      }
    }
    if (digits.length > 13) {
      return {
        valid: false,
        phone: digits,
        errorReason: 'Número corrompido / duplicado (' + digits.length + ' dígitos, máx 13)',
      }
    }
    if (!digits.startsWith('55')) {
      return {
        valid: false,
        phone: digits,
        errorReason: 'DDI inválido (esperado 55 Brasil)',
      }
    }

    const ddd = parseInt(digits.substring(2, 4), 10)
    if (isNaN(ddd) || ddd < 11 || ddd > 99) {
      return {
        valid: false,
        phone: digits,
        errorReason: 'DDD brasileiro inválido: ' + digits.substring(2, 4),
      }
    }

    return {
      valid: true,
      phone: digits,
      errorReason: null,
    }
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

  function resolveOfficialVistageBookDriveLink() {
    return 'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
  }

  function resolveVistageLocalDocument() {
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

    if (tagsList.includes('telefone_invalido') || tagsList.includes('erro_numero_whatsapp')) {
      return { excluded: true, reason: 'telefone_invalido' }
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

  function getContinuousModeState() {
    try {
      const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'ebook_continuous_mode'")
      if (ctrl) {
        const meta = ctrl.get('metadata') || {}
        return {
          is_active: !!ctrl.getBool('is_active'),
          next_batch_at: meta.next_batch_at || null,
          last_dispatched_at: meta.last_dispatched_at || null,
          last_dispatched_count: meta.last_dispatched_count || 0,
          remaining_pending: meta.remaining_pending || 0,
          stop_reason: meta.stop_reason || null,
          updated: ctrl.getString('updated'),
        }
      }
    } catch (_) {}
    return {
      is_active: false,
      next_batch_at: null,
      last_dispatched_at: null,
      last_dispatched_count: 0,
      remaining_pending: 0,
      stop_reason: null,
      updated: null,
    }
  }

  function isReguaAutomationsActive() {
    try {
      const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
      if (ctrl) {
        return !!ctrl.getBool('is_active')
      }
    } catch (_) {}
    return false
  }

  const windowInfo = getBrasiliaHourAndWindow()
  const localDoc = resolveVistageLocalDocument()
  const driveBookLink = resolveOfficialVistageBookDriveLink()
  const now = new Date()
  const nowMs = now.getTime()

  let approachedCustomers = []
  try {
    approachedCustomers = app.findRecordsByFilter(
      'customers',
      "phone != '' && (last_sent_at != '' || last_follow_up_at != '' || follow_up_count > 0 || follow_up_step != '')",
      '-updated',
      800,
      0,
    )
  } catch (err) {
    console.error('[EBOOK_RESEND] Erro ao buscar customers: ' + err.message)
    return c.json(500, { success: false, error: err.message })
  }

  const approachedList = []
  const alreadyDeliveredList = []
  const excludedList = []
  const eligiblePendingList = []
  const invalidPhonesList = []

  // Carregar todos os clientes da base que estão marcados como telefone inválido
  // ou cujo número não passa na validação brasileira
  try {
    const invalidTagged = app.findRecordsByFilter(
      'customers',
      "tags ~ 'telefone_invalido' || tags ~ 'erro_numero_whatsapp'",
      '-updated',
      1000,
      0,
    )
    for (let invIdx = 0; invIdx < invalidTagged.length; invIdx++) {
      const invCust = invalidTagged[invIdx]
      const rPhone = invCust.getString('phone') || invCust.getString('phone_1_value') || ''
      const chk = validateAndCleanBrazilianPhone(rPhone)
      invalidPhonesList.push({
        id: invCust.id,
        name: invCust.getString('name') || 'Sem nome',
        raw_phone: rPhone,
        reason: chk.valid
          ? 'Marcado como inválido anteriormente'
          : chk.errorReason || 'Telefone inválido',
      })
    }
  } catch (_) {}

  const seenInvalidIds = {}
  for (let sIdx = 0; sIdx < invalidPhonesList.length; sIdx++) {
    seenInvalidIds[invalidPhonesList[sIdx].id] = true
  }

  for (let i = 0; i < approachedCustomers.length; i++) {
    const cust = approachedCustomers[i]
    const custId = cust.id
    const rawPhone = cust.getString('phone') || cust.getString('phone_1_value') || ''

    // 1. Validação estrita do telefone brasileiro
    const phoneCheck = validateAndCleanBrazilianPhone(rawPhone)
    if (!phoneCheck.valid) {
      if (!seenInvalidIds[custId]) {
        invalidPhonesList.push({
          id: custId,
          name: cust.getString('name') || 'Sem nome',
          raw_phone: rawPhone,
          reason: phoneCheck.errorReason || 'Telefone inválido',
        })
        seenInvalidIds[custId] = true
      }

      // Marcar tag no cliente de forma idempotente
      try {
        const rawTags = cust.get('tags') || []
        let tagsList = []
        if (Array.isArray(rawTags)) {
          tagsList = rawTags.filter((t) => typeof t === 'string')
        }
        if (!tagsList.includes('telefone_invalido') && !tagsList.includes('erro_numero_whatsapp')) {
          tagsList.push('telefone_invalido')
          tagsList.push('erro_numero_whatsapp')
          cust.set('tags', tagsList)
          app.saveNoValidate(cust)
        }
      } catch (_) {}

      // EXCLUI DA CONTAGEM DE PENDENTES! Nunca mais tenta enviar para esse número.
      continue
    }

    const cleanPhone = phoneCheck.phone
    const followUpCount = cust.getInt('follow_up_count') || 0
    const followUpStep = cust.getString('follow_up_step') || ''
    const greetingName = resolveCustomerFirstName(cust)

    const clientSummary = {
      id: custId,
      name: cust.getString('name') || 'Sem nome',
      greeting_name: greetingName,
      phone: cleanPhone,
      raw_phone: rawPhone,
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

  const continuousState = getContinuousModeState()
  const isReguaActive = isReguaAutomationsActive()

  return c.json(200, {
    success: true,
    commercial_window: windowInfo,
    local_document: localDoc,
    book_link: driveBookLink,
    storage_url: localDoc.public_url || '',
    storage_source: 'ai_knowledge_files:fcvyoatlxt56do2',
    delivery_mechanism: 'text_with_drive_link_and_doc_attachment',
    summary: {
      total_approached: approachedList.length,
      already_delivered: alreadyDeliveredList.length,
      excluded_count: excludedList.length,
      eligible_pending_count: eligiblePendingList.length,
      invalid_phones_count: invalidPhonesList.length,
    },
    eligible_pending: eligiblePendingList,
    invalid_phones: invalidPhonesList,
    excluded_sample: excludedList.slice(0, 10),
    continuous_mode: {
      is_active: continuousState.is_active,
      next_batch_at: continuousState.next_batch_at,
      last_dispatched_at: continuousState.last_dispatched_at,
      last_dispatched_count: continuousState.last_dispatched_count,
      remaining_pending: continuousState.is_active
        ? continuousState.remaining_pending || eligiblePendingList.length
        : eligiblePendingList.length,
      stop_reason: continuousState.stop_reason,
      regua_is_active: isReguaActive,
    },
    checked_at: new Date().toISOString(),
  })
})

// ============================================================================
// ENDPOINT: POST /backend/v1/ebook-resend/batch
// ============================================================================
routerAdd('POST', '/backend/v1/ebook-resend/batch', (c) => {
  const app = $app

  function getBrasiliaHourAndWindow(dateObj) {
    const now = dateObj || new Date()
    const brTime = new Date(now.getTime() - 3 * 3600000)
    const brHour = brTime.getUTCHours()
    const brMinute = brTime.getUTCMinutes()
    const brDay = brTime.getUTCDay()
    const isWindow = brDay !== 0 && brHour >= 8 && brHour < 18
    return {
      hour: brHour,
      minute: brMinute,
      dayOfWeek: brDay,
      isCommercialWindow: isWindow,
      iso: now.toISOString(),
    }
  }

  function validateAndCleanBrazilianPhone(rawPhone) {
    if (!rawPhone) {
      return { valid: false, phone: '', errorReason: 'Telefone vazio ou ausente' }
    }
    let str = String(rawPhone).trim()

    if (str.includes(':::')) {
      const parts = str
        .split(':::')
        .map((p) => p.trim())
        .filter(Boolean)
      for (let i = 0; i < parts.length; i++) {
        const partRes = validateAndCleanBrazilianPhone(parts[i])
        if (partRes.valid) return partRes
      }
      str = parts[0] || str
    }

    let digits = str.replace(/\D/g, '')
    if (digits.startsWith('0') && digits.length >= 11) {
      digits = digits.substring(1)
    }
    if (digits.length === 8 || digits.length === 9) {
      digits = '48' + digits
    }
    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = '55' + digits
    }

    if (digits.length >= 20 && digits.length <= 26 && digits.length % 2 === 0) {
      const half = digits.length / 2
      const firstHalf = digits.substring(0, half)
      const secondHalf = digits.substring(half)
      if (firstHalf === secondHalf) {
        const subRes = validateAndCleanBrazilianPhone(firstHalf)
        if (subRes.valid) return subRes
      }
    }

    if (digits.length < 12) {
      return {
        valid: false,
        phone: digits,
        errorReason:
          'Número incompleto (' + digits.length + ' dígitos, mínimo 12 com DDI 55 + DDD)',
      }
    }
    if (digits.length > 13) {
      return {
        valid: false,
        phone: digits,
        errorReason: 'Número corrompido / duplicado (' + digits.length + ' dígitos, máx 13)',
      }
    }
    if (!digits.startsWith('55')) {
      return {
        valid: false,
        phone: digits,
        errorReason: 'DDI inválido (esperado 55 Brasil)',
      }
    }

    const ddd = parseInt(digits.substring(2, 4), 10)
    if (isNaN(ddd) || ddd < 11 || ddd > 99) {
      return {
        valid: false,
        phone: digits,
        errorReason: 'DDD brasileiro inválido: ' + digits.substring(2, 4),
      }
    }

    return {
      valid: true,
      phone: digits,
      errorReason: null,
    }
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

  function resolveOfficialVistageBookDriveLink() {
    return 'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
  }

  function resolveVistageLocalDocument() {
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

  function isReguaAutomationsActive() {
    try {
      const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'regua_automations_active'")
      if (ctrl) {
        return !!ctrl.getBool('is_active')
      }
    } catch (_) {}
    return false
  }

  const windowInfo = getBrasiliaHourAndWindow()
  const driveBookLink = resolveOfficialVistageBookDriveLink()
  const localDoc = resolveVistageLocalDocument()
  const hasValidLocalFile = localDoc.valid && localDoc.file_size > 0
  const now = new Date()
  const nowMs = now.getTime()

  // 1. Checagem informativa da régua geral (disparo manual funciona mesmo com régua automática pausada)
  const isReguaActive = isReguaAutomationsActive()

  // 2. Credenciais Meta WhatsApp
  function resolveMetaWhatsAppCredentials(authRec) {
    let metaToken = ''
    let metaPhoneId = ''
    let activeUserId = ''

    if (authRec) {
      try {
        activeUserId = authRec.id || ''
        metaToken = (authRec.getString('meta_whatsapp_access_token') || '').trim()
        metaPhoneId = (authRec.getString('meta_whatsapp_phone_number_id') || '').trim()
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

    if (!activeUserId) {
      try {
        const uRec = app.findFirstRecordByFilter('users', "email != ''")
        if (uRec) activeUserId = uRec.id
      } catch (_) {}
    }

    return {
      valid: !!(metaToken && metaPhoneId),
      token: metaToken,
      phoneId: metaPhoneId,
      userId: activeUserId,
    }
  }

  let authRecord = null
  try {
    authRecord = c.requestInfo().auth
  } catch (_) {}
  const metaCreds = resolveMetaWhatsAppCredentials(authRecord)
  const metaToken = metaCreds.token
  const metaPhoneId = metaCreds.phoneId
  const activeUserId = metaCreds.userId

  if (!metaCreds.valid) {
    return c.json(400, {
      success: false,
      error: 'Credenciais do Meta WhatsApp Cloud API não configuradas no sistema.',
    })
  }

  // 3. Parâmetros da requisição
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
      outside_window: true,
      error:
        'Fora do horário comercial de Brasília (8h às 18h, seg a sáb). Para enviar mesmo assim, marque a confirmação expressa.',
      commercial_window: windowInfo,
    })
  }

  // 4. Seleção enxuta e eficiente dos clientes pendentes elegíveis
  // Usamos filtro direto no banco para evitar loops pesados em centenas de clientes
  const baseFilter =
    "phone != '' && is_blocked = false && persistence_status != 'pausado' && " +
    "status !~ 'bloqueado' && tags !~ 'bloqueado' && tags !~ 'ai_paused' && " +
    "status !~ 'perdido' && phase !~ 'perdido' && tags !~ 'frio' && " +
    "tags !~ 'não é o momento' && tags !~ 'nao e o momento' && follow_up_step != 'finalizado' && " +
    "tags !~ 'telefone_invalido' && tags !~ 'erro_numero_whatsapp' && " +
    "tags !~ 'ebook_vistage_entregue' && tags !~ 'ebook_vistage_documento_entregue' && " +
    "(last_sent_at != '' || last_follow_up_at != '' || follow_up_count > 0 || follow_up_step != '')"

  let approachedCandidates = []
  try {
    approachedCandidates = app.findRecordsByFilter('customers', baseFilter, '-updated', 80, 0)
  } catch (err) {
    console.error('[EBOOK_RESEND] Erro ao buscar customers: ' + err.message)
    return c.json(500, { success: false, error: err.message })
  }

  const pendingList = []
  for (let i = 0; i < approachedCandidates.length; i++) {
    const cust = approachedCandidates[i]
    const custId = cust.id
    const rawPhone = cust.getString('phone') || cust.getString('phone_1_value') || ''

    const phoneCheck = validateAndCleanBrazilianPhone(rawPhone)
    if (!phoneCheck.valid) {
      try {
        const rawTags = cust.get('tags') || []
        let tagsList = []
        if (Array.isArray(rawTags)) tagsList = rawTags.filter((t) => typeof t === 'string')
        if (!tagsList.includes('telefone_invalido')) {
          tagsList.push('telefone_invalido')
          cust.set('tags', tagsList)
          app.saveNoValidate(cust)
        }
      } catch (_) {}
      continue
    }

    let convs = []
    try {
      convs = app.findRecordsByFilter(
        'conversations',
        "customer_id = '" + custId + "'",
        '-created',
        5,
        0,
      )
    } catch (_) {}

    if (hasCustomerReceivedOfficialEbook(cust, convs, localDoc)) continue
    if (checkCustomerExclusions(cust, convs, nowMs).excluded) continue

    pendingList.push({
      id: custId,
      name: cust.getString('name') || 'Sem nome',
      greeting_name: resolveCustomerFirstName(cust),
      phone: phoneCheck.phone,
    })

    if (pendingList.length >= maxBatchSize) {
      break
    }
  }

  if (pendingList.length === 0) {
    return c.json(200, {
      success: true,
      dispatched_count: 0,
      failed_count: 0,
      remaining_pending: 0,
      message: 'Nenhum cliente elegível pendente de e-book no momento!',
      dispatched: [],
      failed: [],
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

    const greetingPart = gName
      ? 'Bia da BRF Imóveis — ' + salutationWord + ', ' + gName + ', tudo bem?'
      : 'Bia da BRF Imóveis — ' + salutationWord + ', tudo bem?'

    const fullMessageText =
      greetingPart +
      '\n\nComo você já demonstrou interesse em oportunidades imobiliárias por aqui, tomei a liberdade de te apresentar esta novidade do Vistage Residence Barreiros - AJ Coelho em Barreiros, São José/SC (Grande Florianópolis):' +
      '\n\n📄 *Material oficial: Vistage Residence*' +
      '\n' +
      driveBookLink +
      '\n\nFaz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?'

    let sendSuccess = false
    let sendError = ''
    let documentSent = false
    let documentError = ''

    // 1. Envio de texto com o link oficial no corpo
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
          text: { preview_url: true, body: fullMessageText },
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
        console.warn('[EBOOK_RESEND] Envio de texto falhou para ' + phoneNum + ': ' + sendError)
      }
    } catch (httpErr) {
      sendError = 'Exceção HTTP Texto: ' + httpErr.message
      console.warn('[EBOOK_RESEND] Exceção no envio de texto: ' + httpErr.message)
    }

    // 2. Anexo adicional do arquivo PDF se disponível
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
          timeout: 25,
        })

        if (docRes && docRes.statusCode >= 200 && docRes.statusCode < 300) {
          documentSent = true
          console.log('[EBOOK_RESEND] Documento WhatsApp anexado com sucesso para ' + phoneNum)
        } else {
          let dErrBody = ''
          try {
            dErrBody = JSON.stringify(docRes ? docRes.json || docRes.body : '')
          } catch (_) {}
          documentError = 'HTTP ' + (docRes ? docRes.statusCode : 0) + ': ' + dErrBody
          console.info(
            '[EBOOK_RESEND] Documento anexado não enviado para ' +
              phoneNum +
              ' (' +
              documentError +
              ') — link oficial entregue no corpo do texto.',
          )
        }
      } catch (docErr) {
        documentError = 'Exceção HTTP Doc: ' + docErr.message
      }
    }

    // Liberação de lock e gravação
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
        cUpdate.set('last_sent_at', new Date().toISOString())
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

        // Gravar log estruturado em system_logs
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
              book_link: driveBookLink,
              document_sent: documentSent,
              document_file: localDoc.stored_file,
              document_size: localDoc.file_size,
              storage_url: localDoc.public_url,
              delivery_mechanism: documentSent
                ? 'text_with_drive_link_and_doc_attachment'
                : 'text_with_drive_link',
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

  // Contar pendentes restantes usando count rápido
  let remaining = 0
  try {
    const remRecs = app.findRecordsByFilter('customers', baseFilter, '', 1000, 0)
    remaining = remRecs.length
  } catch (_) {
    remaining = Math.max(0, pendingList.length - dispatched.length)
  }
  // Gravar resumo do lote em system_logs
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
        remaining_pending: remaining,
        dispatched: dispatched,
        failed: failed,
        operator: activeUserId,
      }),
    )
    app.saveNoValidate(batchLog)
  } catch (_) {}

  // Se o modo contínuo estiver ativo, atualiza remaining_pending em app_controls
  try {
    const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'ebook_continuous_mode'")
    if (ctrl && ctrl.getBool('is_active')) {
      const prevMeta = ctrl.get('metadata') || {}
      prevMeta.remaining_pending = remaining
      prevMeta.last_dispatched_at = new Date().toISOString()
      prevMeta.last_dispatched_count = dispatched.length
      ctrl.set('metadata', prevMeta)
      app.saveNoValidate(ctrl)
    }
  } catch (_) {}

  return c.json(200, {
    success: true,
    dispatched_count: dispatched.length,
    failed_count: failed.length,
    remaining_pending: remaining,
    dispatched: dispatched,
    failed: failed,
    message:
      dispatched.length +
      ' clientes receberam o material oficial Vistage com o link no corpo com sucesso!' +
      (failed.length > 0 ? ' (' + failed.length + ' falhas registradas).' : ''),
  })
})

// ============================================================================
// ENDPOINT: POST /backend/v1/ebook-resend/continuous-toggle
// ============================================================================
routerAdd('POST', '/backend/v1/ebook-resend/continuous-toggle', (c) => {
  const app = $app

  function getBrasiliaComponents(dateObj) {
    const d = dateObj || new Date()
    const brDate = new Date(d.getTime() - 3 * 3600000)
    return {
      year: brDate.getUTCFullYear(),
      month: brDate.getUTCMonth(),
      date: brDate.getUTCDate(),
      day: brDate.getUTCDay(), // 0 = Domingo, 6 = Sábado
      hour: brDate.getUTCHours(),
      minute: brDate.getUTCMinutes(),
      second: brDate.getUTCSeconds(),
      isWindow: brDate.getUTCDay() !== 0 && brDate.getUTCHours() >= 8 && brDate.getUTCHours() < 18,
    }
  }

  function computeNextBatchScheduleDate(fromMs) {
    const baseMs = fromMs || Date.now()
    const candidateUtcMs = baseMs + 15 * 60 * 1000
    const brComp = getBrasiliaComponents(new Date(candidateUtcMs))

    // Se a data candidate já cai dentro do horário comercial (seg-sáb 8h-18h), agenda exatamente para daqui a 15 min!
    if (brComp.day !== 0 && brComp.hour >= 8 && brComp.hour < 18) {
      return new Date(candidateUtcMs).toISOString()
    }

    // Se caiu fora da janela (domingo, antes das 8h ou a partir das 18h):
    // Calcular o próximo dia útil às 08:00:00 BRT (= 11:00:00 UTC)
    let daysToAdd = 0
    if (brComp.day === 0) {
      // Domingo -> Segunda-feira às 08h BRT
      daysToAdd = 1
    } else if (brComp.day === 6 && brComp.hour >= 18) {
      // Sábado a partir das 18h -> Segunda-feira às 08h BRT
      daysToAdd = 2
    } else if (brComp.hour >= 18) {
      // Seg-Sex a partir das 18h -> Próximo dia às 08h BRT (se sexta, vai pra sábado)
      daysToAdd = 1
    } else if (brComp.hour < 8) {
      // Seg-Sáb antes das 8h da manhã -> mesmo dia às 08h BRT
      daysToAdd = 0
    } else {
      daysToAdd = 1
    }

    const nextBrDateMs = Date.UTC(brComp.year, brComp.month, brComp.date + daysToAdd, 8, 0, 0, 0)
    // 08:00 BRT equivale a 11:00 UTC (+3h)
    const targetUtcMs = nextBrDateMs + 3 * 3600000
    return new Date(targetUtcMs).toISOString()
  }

  let body = {}
  let activeUserId = ''
  try {
    const info = c.requestInfo()
    if (info) {
      body = info.body || {}
      if (info.auth) activeUserId = info.auth.id
    }
  } catch (_) {}

  const action = (body.action || '').toLowerCase().trim() // 'start' | 'stop' | 'toggle'
  let col = null
  let ctrl = null
  try {
    col = app.findCollectionByNameOrId('app_controls')
    ctrl = app.findFirstRecordByFilter('app_controls', "key = 'ebook_continuous_mode'")
  } catch (_) {}

  if (!ctrl) {
    ctrl = new Record(col)
    ctrl.set('key', 'ebook_continuous_mode')
    ctrl.set('name', 'Modo Contínuo de Reenvio de E-book (Vistage)')
    ctrl.set('is_active', false)
  }

  const currentActive = !!ctrl.getBool('is_active')
  let targetActive = false
  if (action === 'start') {
    targetActive = true
  } else if (action === 'stop') {
    targetActive = false
  } else {
    targetActive = !currentActive
  }

  // Se for PARAR
  if (!targetActive) {
    const meta = ctrl.get('metadata') || {}
    meta.next_batch_at = null
    meta.stop_reason = body.reason || 'Parado manualmente pelo operador'
    ctrl.set('is_active', false)
    ctrl.set('metadata', meta)
    ctrl.set('paused_at', new Date().toISOString())
    ctrl.set('paused_by', activeUserId || 'Mauro')
    app.saveNoValidate(ctrl)

    // Auditoria em system_logs
    try {
      const sLogsCol = app.findCollectionByNameOrId('system_logs')
      const stopLog = new Record(sLogsCol)
      stopLog.set('user_id', activeUserId)
      stopLog.set('type', 'ebook_continuous_stopped')
      stopLog.set('message', 'Modo Contínuo de Reenvio de E-book foi PARADO manualmente.')
      stopLog.set(
        'details',
        JSON.stringify({
          action: 'stop',
          operator: activeUserId,
          reason: meta.stop_reason,
          stopped_at: new Date().toISOString(),
        }),
      )
      app.saveNoValidate(stopLog)
    } catch (_) {}

    return c.json(200, {
      success: true,
      is_active: false,
      message: 'Modo Contínuo PARADO com sucesso.',
      continuous_mode: {
        is_active: false,
        next_batch_at: null,
        stop_reason: meta.stop_reason,
      },
    })
  }

  // Se for INICIAR
  // A pausa da régua automática (regua_automations_active = false) bloqueia apenas retomadas da Bia (D+3, D+7 etc.)
  // e remarketing — NUNCA o Disparo Contínuo do E-book, que é ativado explicitamente pelo dono e tem seu próprio controle.
  function getBrasiliaHourAndWindowForStart(dateObj) {
    const now = dateObj || new Date()
    const brTime = new Date(now.getTime() - 3 * 3600000)
    const brHour = brTime.getUTCHours()
    const brMinute = brTime.getUTCMinutes()
    const brDay = brTime.getUTCDay()
    const isWindow = brDay !== 0 && brHour >= 8 && brHour < 18
    return {
      hour: brHour,
      minute: brMinute,
      dayOfWeek: brDay,
      isCommercialWindow: isWindow,
      iso: now.toISOString(),
    }
  }

  function validateAndCleanBrazilianPhoneForStart(rawPhone) {
    if (!rawPhone) return { valid: false, phone: '', errorReason: 'Vazio' }
    let str = String(rawPhone).trim()
    if (str.includes(':::')) {
      const parts = str
        .split(':::')
        .map((p) => p.trim())
        .filter(Boolean)
      for (let i = 0; i < parts.length; i++) {
        const pRes = validateAndCleanBrazilianPhoneForStart(parts[i])
        if (pRes.valid) return pRes
      }
      str = parts[0] || str
    }
    let digits = str.replace(/\D/g, '')
    if (digits.startsWith('0') && digits.length >= 11) digits = digits.substring(1)
    if (digits.length === 8 || digits.length === 9) digits = '48' + digits
    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = '55' + digits
    }
    if (digits.length >= 20 && digits.length <= 26 && digits.length % 2 === 0) {
      const half = digits.length / 2
      if (digits.substring(0, half) === digits.substring(half)) {
        const subRes = validateAndCleanBrazilianPhoneForStart(digits.substring(0, half))
        if (subRes.valid) return subRes
      }
    }
    if (digits.length < 12 || digits.length > 13 || !digits.startsWith('55')) {
      return { valid: false, phone: digits, errorReason: 'Inválido' }
    }
    const ddd = parseInt(digits.substring(2, 4), 10)
    if (isNaN(ddd) || ddd < 11 || ddd > 99) {
      return { valid: false, phone: digits, errorReason: 'DDD inválido' }
    }
    return { valid: true, phone: digits, errorReason: null }
  }

  function resolveCustomerFirstNameForStart(cust) {
    if (!cust) return ''
    const candidate = (cust.getString('first_name') || cust.getString('name') || '').trim()
    if (!candidate || candidate.includes('+') || candidate.includes('@')) return ''
    if (
      /^(lead|cliente|contato|teste|whatsapp|meta|novo|usuario|usuário|imóvel|imovel|sem nome)\b/i.test(
        candidate,
      )
    )
      return ''
    const parts = candidate.split(/\s+/).filter(Boolean)
    const first = parts[0]
    if (!first || first.length < 2 || /[0-9_#\*\/\\]/.test(first)) return ''
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
  }

  function resolveOfficialVistageBookDriveLinkForStart() {
    return 'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
  }

  function resolveVistageLocalDocumentForStart() {
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
        const s = rName.toLowerCase()
        const isBlacklisted =
          s.includes('tabela') ||
          s.includes('politica') ||
          s.includes('política') ||
          s.includes('preco') ||
          s.includes('preço') ||
          s.includes('valores')

        if (!isBlacklisted && physFile && fSize > 0) {
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

    return { valid: false, public_url: '', file_size: 0 }
  }

  function hasCustomerReceivedOfficialEbookForStart(cust, convs, docInfo) {
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
      const content = convs[i].getString('content') || ''
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

  function checkCustomerExclusionsForStart(cust, convs, nowMs) {
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
        if (Array.isArray(parsed)) tagsList = parsed.map((t) => String(t).toLowerCase())
      } catch (_) {}
    }

    if (tagsList.includes('telefone_invalido') || tagsList.includes('erro_numero_whatsapp')) {
      return { excluded: true, reason: 'telefone_invalido' }
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
          return { excluded: true, reason: 'conversa_viva_24h' }
        }
      }
    }
    return { excluded: false, reason: null }
  }

  // 1. Ativa imediatamente o registro em app_controls
  const startWindowInfo = getBrasiliaHourAndWindowForStart()
  const forceOutsideWindow = !!body.force_outside_window
  const nextIso = computeNextBatchScheduleDate(Date.now())
  const meta = ctrl.get('metadata') || {}
  meta.next_batch_at = nextIso
  meta.stop_reason = null
  ctrl.set('is_active', true)
  ctrl.set('metadata', meta)
  ctrl.set('resumed_at', new Date().toISOString())
  ctrl.set('resumed_by', activeUserId || 'Mauro')
  app.saveNoValidate(ctrl)

  // 2. DISPARO IMEDIATO DO 1º LOTE ao ativar (se na janela ou se forceOutsideWindow)
  let firstBatchDispatchedCount = 0
  let firstBatchFailedCount = 0
  let remainingAfterFirst = 0

  if (startWindowInfo.isCommercialWindow || forceOutsideWindow) {
    function resolveMetaWhatsAppCredentialsForStart(authRec) {
      let metaToken = ''
      let metaPhoneId = ''
      let resolvedUserId = ''

      if (authRec) {
        try {
          resolvedUserId = authRec.id || ''
          metaToken = (authRec.getString('meta_whatsapp_access_token') || '').trim()
          metaPhoneId = (authRec.getString('meta_whatsapp_phone_number_id') || '').trim()
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
            if (!resolvedUserId) resolvedUserId = usersWithMeta[0].id
          }
        } catch (_) {}
      }

      if (!resolvedUserId) {
        try {
          const uRec = app.findFirstRecordByFilter('users', "email != ''")
          if (uRec) resolvedUserId = uRec.id
        } catch (_) {}
      }

      return {
        valid: !!(metaToken && metaPhoneId),
        token: metaToken,
        phoneId: metaPhoneId,
        userId: resolvedUserId,
      }
    }

    let authRecStart = null
    try {
      authRecStart = c.requestInfo().auth
    } catch (_) {}
    const startCreds = resolveMetaWhatsAppCredentialsForStart(authRecStart)
    const metaToken = startCreds.token
    const metaPhoneId = startCreds.phoneId
    if (!activeUserId && startCreds.userId) activeUserId = startCreds.userId

    if (!startCreds.valid) {
      try {
        const sLogsCol = app.findCollectionByNameOrId('system_logs')
        const errLog = new Record(sLogsCol)
        errLog.set('user_id', activeUserId)
        errLog.set('type', 'ebook_continuous_credentials_missing')
        errLog.set(
          'message',
          'Credenciais Meta WhatsApp Cloud API não encontradas ao disparar 1º lote do Modo Contínuo.',
        )
        errLog.set(
          'details',
          JSON.stringify({
            mode: 'continuous_start',
            error: 'meta_whatsapp_access_token ou meta_whatsapp_phone_number_id ausente',
            timestamp: new Date().toISOString(),
          }),
        )
        app.saveNoValidate(errLog)
      } catch (_) {}
    } else {
      const baseFilter =
        "phone != '' && is_blocked = false && persistence_status != 'pausado' && " +
        "status !~ 'bloqueado' && tags !~ 'bloqueado' && tags !~ 'ai_paused' && " +
        "status !~ 'perdido' && phase !~ 'perdido' && tags !~ 'frio' && " +
        "tags !~ 'não é o momento' && tags !~ 'nao e o momento' && follow_up_step != 'finalizado' && " +
        "tags !~ 'telefone_invalido' && tags !~ 'erro_numero_whatsapp' && " +
        "tags !~ 'ebook_vistage_entregue' && tags !~ 'ebook_vistage_documento_entregue' && " +
        "(last_sent_at != '' || last_follow_up_at != '' || follow_up_count > 0 || follow_up_step != '')"

      let approachedCandidates = []
      try {
        approachedCandidates = app.findRecordsByFilter('customers', baseFilter, '-updated', 80, 0)
      } catch (_) {}

      const localDoc = resolveVistageLocalDocumentForStart()
      const hasValidLocalFile = localDoc.valid && localDoc.file_size > 0
      const driveBookLink = resolveOfficialVistageBookDriveLinkForStart()
      const startNowMs = Date.now()
      const pending = []

      for (let i = 0; i < approachedCandidates.length; i++) {
        const cust = approachedCandidates[i]
        const rawPhone = cust.getString('phone') || cust.getString('phone_1_value') || ''
        const pCheck = validateAndCleanBrazilianPhoneForStart(rawPhone)
        if (!pCheck.valid) {
          try {
            const rawTags = cust.get('tags') || []
            let tList = Array.isArray(rawTags) ? rawTags.filter((t) => typeof t === 'string') : []
            if (!tList.includes('telefone_invalido')) {
              tList.push('telefone_invalido')
              cust.set('tags', tList)
              app.saveNoValidate(cust)
            }
          } catch (_) {}
          continue
        }

        const cleanPhone = pCheck.phone
        let convs = []
        try {
          convs = app.findRecordsByFilter(
            'conversations',
            "customer_id = '" + cust.id + "'",
            '-created',
            5,
            0,
          )
        } catch (_) {}

        if (hasCustomerReceivedOfficialEbookForStart(cust, convs, localDoc)) continue
        if (checkCustomerExclusionsForStart(cust, convs, startNowMs).excluded) continue

        pending.push({
          id: cust.id,
          name: cust.getString('name') || 'Sem nome',
          greeting_name: resolveCustomerFirstNameForStart(cust),
          phone: cleanPhone,
        })

        if (pending.length >= 15) {
          break
        }
      }

      if (pending.length === 0) {
        meta.next_batch_at = null
        meta.remaining_pending = 0
        meta.stop_reason = 'Concluído: 0 pendentes restantes'
        ctrl.set('is_active', false)
        ctrl.set('metadata', meta)
        app.saveNoValidate(ctrl)
      } else {
        const batch = pending.slice(0, 15)
        const salutationWord =
          startWindowInfo.hour < 12
            ? 'bom dia'
            : startWindowInfo.hour < 18
              ? 'boa tarde'
              : 'boa noite'
        const metaUrl = 'https://graph.facebook.com/v21.0/' + metaPhoneId + '/messages'
        const dispatched = []
        const failed = []

        for (let b = 0; b < batch.length; b++) {
          const item = batch[b]
          const custId = item.id
          const phoneNum = item.phone
          const gName = item.greeting_name

          try {
            const custRec = app.findRecordById('customers', custId)
            const rawTags = custRec.get('tags') || []
            let tags = Array.isArray(rawTags) ? rawTags.filter((t) => typeof t === 'string') : []
            const lockNow = Date.now()
            let isLocked = false
            for (let t = 0; t < tags.length; t++) {
              if (tags[t].indexOf('ai_processing:') === 0) {
                const lTime = parseInt(tags[t].substring(14), 10)
                if (!isNaN(lTime) && lockNow - lTime < 180000) {
                  isLocked = true
                  break
                }
              }
            }
            if (isLocked) {
              failed.push({ id: custId, phone: phoneNum, error: 'Locked' })
              continue
            }
            const newTags = tags.filter(
              (t) => t !== 'ai_processing' && t.indexOf('ai_processing:') !== 0,
            )
            newTags.push('ai_processing:' + lockNow)
            custRec.set('tags', newTags)
            app.saveNoValidate(custRec)
          } catch (_) {
            continue
          }

          const greetingPart = gName
            ? 'Bia da BRF Imóveis — ' + salutationWord + ', ' + gName + ', tudo bem?'
            : 'Bia da BRF Imóveis — ' + salutationWord + ', tudo bem?'

          const fullMessageText =
            greetingPart +
            '\n\nComo você já demonstrou interesse em oportunidades imobiliárias por aqui, tomei a liberdade de te apresentar esta novidade do Vistage Residence Barreiros - AJ Coelho em Barreiros, São José/SC (Grande Florianópolis):' +
            '\n\n📄 *Material oficial: Vistage Residence*' +
            '\n' +
            driveBookLink +
            '\n\nFaz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?'

          let sendSuccess = false
          let sendError = ''
          let documentSent = false

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
                text: { preview_url: true, body: fullMessageText },
              }),
              timeout: 25,
            })
            if (sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300) {
              sendSuccess = true
            } else {
              sendError = 'HTTP ' + (sendRes ? sendRes.statusCode : 0)
            }
          } catch (httpErr) {
            sendError = 'Exceção HTTP: ' + httpErr.message
          }

          if (sendSuccess && hasValidLocalFile) {
            try {
              const docRes = $http.send({
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
                  type: 'document',
                  document: {
                    link: localDoc.public_url,
                    filename: localDoc.filename || 'BOOK VISTAGE RESIDENCE.pdf',
                    caption: localDoc.caption || 'Material oficial: Vistage Residence',
                  },
                }),
                timeout: 25,
              })
              if (docRes && docRes.statusCode >= 200 && docRes.statusCode < 300) {
                documentSent = true
                console.log(
                  '[EBOOK_RESEND] Documento WhatsApp anexado com sucesso para ' + phoneNum,
                )
              }
            } catch (_) {}
          }

          try {
            const cUp = app.findRecordById('customers', custId)
            const rawT = cUp.get('tags') || []
            let cT = Array.isArray(rawT)
              ? rawT.filter((t) => typeof t === 'string' && t.indexOf('ai_processing') !== 0)
              : []
            if (sendSuccess) {
              if (cT.indexOf('ebook_vistage_entregue') === -1) cT.push('ebook_vistage_entregue')
              if (documentSent && cT.indexOf('ebook_vistage_documento_entregue') === -1) {
                cT.push('ebook_vistage_documento_entregue')
              }
              cUp.set('tags', cT)
              cUp.set('last_sent_at', new Date().toISOString())
              cUp.set('last_follow_up_at', new Date().toISOString())
              cUp.set(
                'next_follow_up_at',
                new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
              )
              cUp.set('follow_up_step', 'd3')
              cUp.set('follow_up_count', (cUp.getInt('follow_up_count') || 0) + 1)
              cUp.set('persistence_status', 'ativo')
              app.saveNoValidate(cUp)

              try {
                const convCol = app.findCollectionByNameOrId('conversations')
                const cRec = new Record(convCol)
                cRec.set('user_id', activeUserId || '')
                cRec.set('customer_id', custId)
                cRec.set('sender', 'ai')
                cRec.set(
                  'content',
                  fullMessageText +
                    (documentSent
                      ? '\n\n[Documento WhatsApp Anexado: ' + localDoc.filename + ']'
                      : ''),
                )
                cRec.set('channel', 'whatsapp')
                app.saveNoValidate(cRec)
              } catch (_) {}

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
                    book_link: driveBookLink,
                    document_sent: documentSent,
                    status: 'sucesso',
                    mode: 'continuous_first_batch',
                  }),
                )
                logRec.set('payload', JSON.stringify({ message: fullMessageText }))
                app.saveNoValidate(logRec)
              } catch (_) {}

              dispatched.push({ id: custId, phone: phoneNum })
            } else {
              cUp.set('tags', cT)
              app.saveNoValidate(cUp)
              failed.push({ id: custId, phone: phoneNum, error: sendError })
            }
          } catch (_) {}
        }

        firstBatchDispatchedCount = dispatched.length
        firstBatchFailedCount = failed.length

        let countRemaining = 0
        try {
          const remRecs = app.findRecordsByFilter('customers', baseFilter, '', 1000, 0)
          countRemaining = remRecs.length
        } catch (_) {
          countRemaining = Math.max(0, pending.length - dispatched.length)
        }
        remainingAfterFirst = countRemaining
        meta.last_dispatched_at = new Date().toISOString()
        meta.last_dispatched_count = dispatched.length
        meta.remaining_pending = remainingAfterFirst
        if (remainingAfterFirst === 0) {
          meta.next_batch_at = null
          meta.stop_reason = 'Concluído: 0 pendentes restantes'
          ctrl.set('is_active', false)
        } else {
          meta.next_batch_at = nextIso
        }
        ctrl.set('metadata', meta)
        app.saveNoValidate(ctrl)

        try {
          const sLogsCol = app.findCollectionByNameOrId('system_logs')
          const batchLog = new Record(sLogsCol)
          batchLog.set('user_id', activeUserId)
          batchLog.set('type', 'ebook_resend_batch')
          batchLog.set(
            'message',
            'Modo Contínuo iniciado: 1º lote concluído com ' +
              dispatched.length +
              ' enviados com sucesso, ' +
              failed.length +
              ' falhas. Restam ' +
              remainingAfterFirst +
              ' pendentes.',
          )
          batchLog.set(
            'details',
            JSON.stringify({
              dispatched_count: dispatched.length,
              failed_count: failed.length,
              total_attempted: batch.length,
              remaining_pending: remainingAfterFirst,
              mode: 'continuous_start',
              next_batch_at: meta.next_batch_at,
              operator: activeUserId,
            }),
          )
          app.saveNoValidate(batchLog)
        } catch (_) {}
      }
    }
  }

  // Auditoria em system_logs
  try {
    const sLogsCol = app.findCollectionByNameOrId('system_logs')
    const startLog = new Record(sLogsCol)
    startLog.set('user_id', activeUserId)
    startLog.set('type', 'ebook_continuous_started')
    startLog.set(
      'message',
      'Modo Contínuo de Reenvio de E-book ATIVADO. Próximo lote agendado para ' + nextIso,
    )
    startLog.set(
      'details',
      JSON.stringify({
        action: 'start',
        operator: activeUserId,
        next_batch_at: nextIso,
        started_at: new Date().toISOString(),
      }),
    )
    app.saveNoValidate(startLog)
  } catch (_) {}

  return c.json(200, {
    success: true,
    is_active: true,
    next_batch_at: nextIso,
    message: 'Modo Contínuo ATIVADO com sucesso! Próximo lote em ' + nextIso,
    continuous_mode: {
      is_active: true,
      next_batch_at: nextIso,
      stop_reason: null,
    },
  })
})

// ============================================================================
// CRON: Agendador automático do Modo Contínuo (executa a cada minuto)
// ============================================================================
cronAdd('ebook_continuous_dispatcher', '* * * * *', () => {
  const app = $app

  function getBrasiliaComponents(dateObj) {
    const d = dateObj || new Date()
    const brDate = new Date(d.getTime() - 3 * 3600000)
    return {
      year: brDate.getUTCFullYear(),
      month: brDate.getUTCMonth(),
      date: brDate.getUTCDate(),
      day: brDate.getUTCDay(), // 0 = Domingo, 6 = Sábado
      hour: brDate.getUTCHours(),
      minute: brDate.getUTCMinutes(),
      second: brDate.getUTCSeconds(),
      isWindow: brDate.getUTCDay() !== 0 && brDate.getUTCHours() >= 8 && brDate.getUTCHours() < 18,
    }
  }

  function getBrasiliaHourAndWindow(dateObj) {
    const comp = getBrasiliaComponents(dateObj)
    return {
      hour: comp.hour,
      minute: comp.minute,
      dayOfWeek: comp.day,
      isCommercialWindow: comp.isWindow,
      iso: (dateObj || new Date()).toISOString(),
      brTimeString: String(comp.hour).padStart(2, '0') + ':' + String(comp.minute).padStart(2, '0'),
    }
  }

  function computeNextBatchScheduleDate(fromMs) {
    const baseMs = fromMs || Date.now()
    const candidateUtcMs = baseMs + 15 * 60 * 1000
    const brComp = getBrasiliaComponents(new Date(candidateUtcMs))

    // Se o próximo lote cai dentro do horário comercial (seg-sáb 8h-18h), agenda exatamente para daqui a 15 min!
    if (brComp.day !== 0 && brComp.hour >= 8 && brComp.hour < 18) {
      return new Date(candidateUtcMs).toISOString()
    }

    // Se caiu fora da janela (domingo, antes das 8h ou a partir das 18h):
    // Calcular o próximo dia útil às 08:00:00 BRT (= 11:00:00 UTC)
    let daysToAdd = 0
    if (brComp.day === 0) {
      daysToAdd = 1
    } else if (brComp.day === 6 && brComp.hour >= 18) {
      daysToAdd = 2
    } else if (brComp.hour >= 18) {
      daysToAdd = 1
    } else if (brComp.hour < 8) {
      daysToAdd = 0
    } else {
      daysToAdd = 1
    }

    const nextBrDateMs = Date.UTC(brComp.year, brComp.month, brComp.date + daysToAdd, 8, 0, 0, 0)
    const targetUtcMs = nextBrDateMs + 3 * 3600000
    return new Date(targetUtcMs).toISOString()
  }

  function validateAndCleanBrazilianPhone(rawPhone) {
    if (!rawPhone) return { valid: false, phone: '', errorReason: 'Vazio' }
    let str = String(rawPhone).trim()
    if (str.includes(':::')) {
      const parts = str
        .split(':::')
        .map((p) => p.trim())
        .filter(Boolean)
      for (let i = 0; i < parts.length; i++) {
        const pRes = validateAndCleanBrazilianPhone(parts[i])
        if (pRes.valid) return pRes
      }
      str = parts[0] || str
    }
    let digits = str.replace(/\D/g, '')
    if (digits.startsWith('0') && digits.length >= 11) digits = digits.substring(1)
    if (digits.length === 8 || digits.length === 9) digits = '48' + digits
    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = '55' + digits
    }
    if (digits.length >= 20 && digits.length <= 26 && digits.length % 2 === 0) {
      const half = digits.length / 2
      if (digits.substring(0, half) === digits.substring(half)) {
        const subRes = validateAndCleanBrazilianPhone(digits.substring(0, half))
        if (subRes.valid) return subRes
      }
    }
    if (digits.length < 12 || digits.length > 13 || !digits.startsWith('55')) {
      return { valid: false, phone: digits, errorReason: 'Inválido' }
    }
    return { valid: true, phone: digits, errorReason: null }
  }

  function resolveCustomerFirstName(cust) {
    if (!cust) return ''
    const candidate = (cust.getString('first_name') || cust.getString('name') || '').trim()
    if (!candidate || candidate.includes('+') || candidate.includes('@')) return ''
    if (
      /^(lead|cliente|contato|teste|whatsapp|meta|novo|usuario|usuário|imóvel|imovel|sem nome)\b/i.test(
        candidate,
      )
    )
      return ''
    const parts = candidate.split(/\s+/).filter(Boolean)
    const first = parts[0]
    if (!first || first.length < 2 || /[0-9_#\*\/\\]/.test(first)) return ''
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
  }

  function resolveOfficialVistageBookDriveLink() {
    return 'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
  }

  function resolveVistageLocalDocument() {
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

        const s = rName.toLowerCase()
        const isBlacklisted =
          s.includes('tabela') ||
          s.includes('politica') ||
          s.includes('política') ||
          s.includes('preco') ||
          s.includes('preço') ||
          s.includes('valores')

        if (!isBlacklisted && physFile && fSize > 0) {
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

    return { valid: false, public_url: '', file_size: 0 }
  }

  function hasCustomerReceivedOfficialEbook(cust, convs, docInfo) {
    if (cust) {
      const rawTags = cust.get('tags') || []
      let tags = []
      if (Array.isArray(rawTags)) {
        tags = rawTags.map((t) => String(t).toLowerCase())
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
      const content = convs[i].getString('content') || ''
      if (
        content.indexOf('1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG') !== -1 ||
        (pubUrl && content.indexOf(pubUrl) !== -1) ||
        content.indexOf('Material oficial: Vistage Residence') !== -1
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
    }

    if (tagsList.includes('telefone_invalido') || tagsList.includes('erro_numero_whatsapp')) {
      return { excluded: true, reason: 'telefone_invalido' }
    }
    if (isBlocked || status.includes('bloqueado') || tagsList.includes('bloqueado')) {
      return { excluded: true, reason: 'bloqueado' }
    }
    if (pStatus === 'pausado' || tagsList.includes('ai_paused')) {
      return { excluded: true, reason: 'pausado' }
    }
    if (status.includes('perdido') || phase.includes('perdido') || tagsList.includes('frio')) {
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
          return { excluded: true, reason: 'conversa_viva_24h' }
        }
      }
    }
    return { excluded: false, reason: null }
  }

  // 1. Checa estado do contínuo
  let ctrl = null
  try {
    ctrl = app.findFirstRecordByFilter('app_controls', "key = 'ebook_continuous_mode'")
  } catch (_) {}

  if (!ctrl || !ctrl.getBool('is_active')) {
    return
  }

  // 2. O Modo Contínuo de Reenvio de E-book é INDEPENDENTE da régua de automações.
  // A pausa da régua geral (regua_automations_active = false) congela retomadas da Bia e remarketing,
  // mas NUNCA suspende o Modo Contínuo de reenvio de e-book ativado explicitamente pelo operador.

  // 3. Checa agendamento next_batch_at
  const meta = ctrl.get('metadata') || {}
  const nextBatchStr = meta.next_batch_at
  if (!nextBatchStr) return

  const nextBatchMs = new Date(nextBatchStr).getTime()
  const nowMs = Date.now()

  if (nowMs < nextBatchMs) {
    return // Ainda não atingiu o horário
  }

  // 4. Checa janela comercial
  const windowInfo = getBrasiliaHourAndWindow()
  if (!windowInfo.isCommercialWindow) {
    const adjustedNext = computeNextBatchScheduleDate(nowMs)
    console.log(
      '[EBOOK_CONTINUOUS_CRON] Fora da janela de Brasília. Reagendando para ' + adjustedNext,
    )
    meta.next_batch_at = adjustedNext
    ctrl.set('metadata', meta)
    app.saveNoValidate(ctrl)
    return
  }

  // 5. Resolução robusta de Credenciais Meta (compartilhada e à prova de falha silenciosa)
  function resolveMetaWhatsAppCredentials() {
    let metaToken = ''
    let metaPhoneId = ''
    let activeUserId = ''

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
        activeUserId = usersWithMeta[0].id
      }
    } catch (_) {}

    if (!activeUserId) {
      try {
        const uRec = app.findFirstRecordByFilter('users', "email != ''")
        if (uRec) activeUserId = uRec.id
      } catch (_) {}
    }

    return {
      valid: !!(metaToken && metaPhoneId),
      token: metaToken,
      phoneId: metaPhoneId,
      userId: activeUserId,
    }
  }

  const metaCreds = resolveMetaWhatsAppCredentials()
  const metaToken = metaCreds.token
  const metaPhoneId = metaCreds.phoneId
  const activeUserId = metaCreds.userId

  if (!metaCreds.valid) {
    console.error('[EBOOK_CONTINUOUS_CRON] Credenciais Meta não encontradas no cron!')
    try {
      const sLogsCol = app.findCollectionByNameOrId('system_logs')
      const errLog = new Record(sLogsCol)
      errLog.set('user_id', activeUserId)
      errLog.set('type', 'ebook_continuous_credentials_missing')
      errLog.set(
        'message',
        'Credenciais Meta WhatsApp Cloud API não encontradas no cron do Modo Contínuo. Ciclo adiado por 15 min.',
      )
      errLog.set(
        'details',
        JSON.stringify({
          error: 'meta_whatsapp_access_token ou meta_whatsapp_phone_number_id ausente',
          timestamp: new Date().toISOString(),
        }),
      )
      app.saveNoValidate(errLog)
    } catch (_) {}

    // Não desativa o modo contínuo; adia para tentar novamente no próximo ciclo de 15 minutos
    meta.next_batch_at = computeNextBatchScheduleDate(nowMs)
    meta.stop_reason = 'Aviso: Credenciais WhatsApp ausentes temporariamente; tentando novamente'
    ctrl.set('metadata', meta)
    app.saveNoValidate(ctrl)
    return
  }

  // 6. Varredura ultra-eficiente dos próximos 15 pendentes
  // Usa filtro indexado direto no banco — NUNCA carrega toda a base cliente por cliente
  const baseFilter =
    "phone != '' && is_blocked = false && persistence_status != 'pausado' && " +
    "status !~ 'bloqueado' && tags !~ 'bloqueado' && tags !~ 'ai_paused' && " +
    "status !~ 'perdido' && phase !~ 'perdido' && tags !~ 'frio' && " +
    "tags !~ 'não é o momento' && tags !~ 'nao e o momento' && follow_up_step != 'finalizado' && " +
    "tags !~ 'telefone_invalido' && tags !~ 'erro_numero_whatsapp' && " +
    "tags !~ 'ebook_vistage_entregue' && tags !~ 'ebook_vistage_documento_entregue' && " +
    "(last_sent_at != '' || last_follow_up_at != '' || follow_up_count > 0 || follow_up_step != '')"

  let approachedCandidates = []
  try {
    approachedCandidates = app.findRecordsByFilter('customers', baseFilter, '-updated', 80, 0)
  } catch (err) {
    console.error('[EBOOK_CONTINUOUS_CRON] Erro ao buscar customers: ' + err.message)
    try {
      const sLogsCol = app.findCollectionByNameOrId('system_logs')
      const errLog = new Record(sLogsCol)
      errLog.set('user_id', activeUserId)
      errLog.set('type', 'ebook_continuous_query_error')
      errLog.set('message', 'Erro ao consultar clientes no cron: ' + err.message)
      app.saveNoValidate(errLog)
    } catch (_) {}
    return
  }

  const localDoc = resolveVistageLocalDocument()
  const hasValidLocalFile = localDoc.valid && localDoc.file_size > 0
  const driveBookLink = resolveOfficialVistageBookDriveLink()
  const pending = []

  for (let i = 0; i < approachedCandidates.length; i++) {
    const cust = approachedCandidates[i]
    const rawPhone = cust.getString('phone') || cust.getString('phone_1_value') || ''
    const pCheck = validateAndCleanBrazilianPhone(rawPhone)
    if (!pCheck.valid) {
      try {
        const rawTags = cust.get('tags') || []
        let tList = Array.isArray(rawTags) ? rawTags.filter((t) => typeof t === 'string') : []
        if (!tList.includes('telefone_invalido')) {
          tList.push('telefone_invalido')
          cust.set('tags', tList)
          app.saveNoValidate(cust)
        }
      } catch (_) {}
      continue
    }

    const cleanPhone = pCheck.phone
    let convs = []
    try {
      convs = app.findRecordsByFilter(
        'conversations',
        "customer_id = '" + cust.id + "'",
        '-created',
        5,
        0,
      )
    } catch (_) {}

    if (hasCustomerReceivedOfficialEbook(cust, convs, localDoc)) continue
    if (checkCustomerExclusions(cust, convs, nowMs).excluded) continue

    pending.push({
      id: cust.id,
      name: cust.getString('name') || 'Sem nome',
      greeting_name: resolveCustomerFirstName(cust),
      phone: cleanPhone,
    })

    if (pending.length >= 15) {
      break
    }
  }

  // Condição de parada (a): 0 pendentes
  if (pending.length === 0) {
    console.log('[EBOOK_CONTINUOUS_CRON] 0 pendentes restantes! Desativando Modo Contínuo.')
    meta.next_batch_at = null
    meta.remaining_pending = 0
    meta.stop_reason = 'Concluído: 0 pendentes restantes'
    ctrl.set('is_active', false)
    ctrl.set('metadata', meta)
    app.saveNoValidate(ctrl)
    return
  }

  const batch = pending.slice(0, 15)
  const salutationWord =
    windowInfo.hour < 12 ? 'bom dia' : windowInfo.hour < 18 ? 'boa tarde' : 'boa noite'
  const metaUrl = 'https://graph.facebook.com/v21.0/' + metaPhoneId + '/messages'
  const dispatched = []
  const failed = []

  for (let b = 0; b < batch.length; b++) {
    const item = batch[b]
    const custId = item.id
    const phoneNum = item.phone
    const gName = item.greeting_name

    // Trava de 3 min
    try {
      const custRec = app.findRecordById('customers', custId)
      const rawTags = custRec.get('tags') || []
      let tags = Array.isArray(rawTags) ? rawTags.filter((t) => typeof t === 'string') : []
      const lockNow = Date.now()
      let isLocked = false
      for (let t = 0; t < tags.length; t++) {
        if (tags[t].indexOf('ai_processing:') === 0) {
          const lTime = parseInt(tags[t].substring(14), 10)
          if (!isNaN(lTime) && lockNow - lTime < 180000) {
            isLocked = true
            break
          }
        }
      }
      if (isLocked) {
        failed.push({ id: custId, phone: phoneNum, error: 'Locked' })
        continue
      }
      const newTags = tags.filter((t) => t !== 'ai_processing' && t.indexOf('ai_processing:') !== 0)
      newTags.push('ai_processing:' + lockNow)
      custRec.set('tags', newTags)
      app.saveNoValidate(custRec)
    } catch (_) {
      continue
    }

    const greetingPart = gName
      ? 'Bia da BRF Imóveis — ' + salutationWord + ', ' + gName + ', tudo bem?'
      : 'Bia da BRF Imóveis — ' + salutationWord + ', tudo bem?'

    const fullMessageText =
      greetingPart +
      '\n\nComo você já demonstrou interesse em oportunidades imobiliárias por aqui, tomei a liberdade de te apresentar esta novidade do Vistage Residence Barreiros - AJ Coelho em Barreiros, São José/SC (Grande Florianópolis):' +
      '\n\n📄 *Material oficial: Vistage Residence*' +
      '\n' +
      driveBookLink +
      '\n\nFaz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?'

    let sendSuccess = false
    let documentSent = false

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
          text: { preview_url: true, body: fullMessageText },
        }),
        timeout: 25,
      })
      if (sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300) {
        sendSuccess = true
      }
    } catch (_) {}

    if (sendSuccess && hasValidLocalFile) {
      try {
        const docRes = $http.send({
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
            type: 'document',
            document: {
              link: localDoc.public_url,
              filename: localDoc.filename || 'BOOK VISTAGE RESIDENCE.pdf',
              caption: localDoc.caption || 'Material oficial: Vistage Residence',
            },
          }),
          timeout: 25,
        })
        if (docRes && docRes.statusCode >= 200 && docRes.statusCode < 300) {
          documentSent = true
        }
      } catch (_) {}
    }

    try {
      const cUp = app.findRecordById('customers', custId)
      const rawT = cUp.get('tags') || []
      let cT = Array.isArray(rawT)
        ? rawT.filter((t) => typeof t === 'string' && t.indexOf('ai_processing') !== 0)
        : []
      if (sendSuccess) {
        if (cT.indexOf('ebook_vistage_entregue') === -1) cT.push('ebook_vistage_entregue')
        if (documentSent && cT.indexOf('ebook_vistage_documento_entregue') === -1) {
          cT.push('ebook_vistage_documento_entregue')
        }
        cUp.set('tags', cT)
        cUp.set('last_sent_at', new Date().toISOString())
        cUp.set('last_follow_up_at', new Date().toISOString())
        cUp.set('next_follow_up_at', new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString())
        cUp.set('follow_up_step', 'd3')
        cUp.set('follow_up_count', (cUp.getInt('follow_up_count') || 0) + 1)
        cUp.set('persistence_status', 'ativo')
        app.saveNoValidate(cUp)

        try {
          const convCol = app.findCollectionByNameOrId('conversations')
          const cRec = new Record(convCol)
          cRec.set('user_id', activeUserId || '')
          cRec.set('customer_id', custId)
          cRec.set('sender', 'ai')
          cRec.set(
            'content',
            fullMessageText + (documentSent ? '\n\n[Documento WhatsApp Anexado]' : ''),
          )
          cRec.set('channel', 'whatsapp')
          app.saveNoValidate(cRec)
        } catch (_) {}

        dispatched.push({ id: custId, phone: phoneNum })
      } else {
        cUp.set('tags', cT)
        app.saveNoValidate(cUp)
        failed.push({ id: custId, phone: phoneNum })
      }
    } catch (_) {}
  }

  // Gravar resumo do lote em system_logs
  try {
    const sLogsCol = app.findCollectionByNameOrId('system_logs')
    const bLog = new Record(sLogsCol)
    bLog.set('user_id', activeUserId)
    bLog.set('type', 'ebook_continuous_batch')
    bLog.set(
      'message',
      'Lote automático do Modo Contínuo concluído: ' +
        dispatched.length +
        ' enviados com sucesso, ' +
        failed.length +
        ' falhas.',
    )
    bLog.set(
      'details',
      JSON.stringify({
        dispatched_count: dispatched.length,
        failed_count: failed.length,
        total_attempted: batch.length,
        dispatched: dispatched,
        failed: failed,
        mode: 'continuous_cron',
      }),
    )
    app.saveNoValidate(bLog)
  } catch (_) {}

  // Contagem real dos pendentes restantes
  let remainingAfter = 0
  try {
    const remRecs = app.findRecordsByFilter('customers', baseFilter, '', 1000, 0)
    remainingAfter = remRecs.length
  } catch (_) {
    remainingAfter = Math.max(0, pending.length - dispatched.length)
  }

  console.log(
    '[EBOOK_CONTINUOUS_CRON] Lote finalizado. Enviados: ' +
      dispatched.length +
      ' | Falhas: ' +
      failed.length +
      ' | Restam: ' +
      remainingAfter,
  )

  // Atualiza estado do contínuo
  if (remainingAfter === 0) {
    meta.next_batch_at = null
    meta.last_dispatched_at = new Date().toISOString()
    meta.last_dispatched_count = dispatched.length
    meta.remaining_pending = 0
    meta.stop_reason = 'Concluído: 0 pendentes restantes'
    ctrl.set('is_active', false)
    ctrl.set('metadata', meta)
    app.saveNoValidate(ctrl)
  } else {
    const nextSchedule = computeNextBatchScheduleDate(Date.now())
    meta.next_batch_at = nextSchedule
    meta.last_dispatched_at = new Date().toISOString()
    meta.last_dispatched_count = dispatched.length
    meta.remaining_pending = remainingAfter
    meta.stop_reason = null
    ctrl.set('metadata', meta)
    app.saveNoValidate(ctrl)
    console.log('[EBOOK_CONTINUOUS_CRON] Próximo lote agendado para ' + nextSchedule)
  }
})
