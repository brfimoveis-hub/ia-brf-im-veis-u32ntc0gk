/**
 * AUDITORIA COMPLETA DE TELEFONES DA BASE (CUSTOMERS)
 *
 * Endpoints:
 * - GET  /backend/v1/phone-audit
 * - POST /backend/v1/phone-audit/scan
 *
 * REGRA DO POCKETBASE JSVM: Cada callback do routerAdd roda em isolamento estrito.
 * Todas as funções auxiliares devem estar definidas internamente no corpo de cada handler.
 */

// ============================================================================
// GET /backend/v1/phone-audit
// ============================================================================
routerAdd('GET', '/backend/v1/phone-audit', (c) => {
  const app = $app

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

    // Trata duplicatas espelhadas (ex: 20 a 28 dígitos repetidos)
    if (digits.length >= 20 && digits.length <= 28 && digits.length % 2 === 0) {
      const half = digits.length / 2
      const firstHalf = digits.substring(0, half)
      const secondHalf = digits.substring(half)
      if (firstHalf === secondHalf) {
        digits = firstHalf
      }
    }

    // Se começar com 55041 (15 ou 16 dígitos), raspa 55041 (prefixo operadora 041 após DDI)
    if (digits.startsWith('55041') && (digits.length === 15 || digits.length === 16)) {
      const ddd = parseInt(digits.substring(5, 7), 10)
      if (ddd >= 11 && ddd <= 99) {
        digits = digits.substring(5)
      }
    }

    // Se começar com 041 e tiver 13 ou 14 dígitos (041 + DDD + 8 ou 9 dígitos), raspa 041
    if (digits.startsWith('041') && (digits.length === 13 || digits.length === 14)) {
      const ddd = parseInt(digits.substring(3, 5), 10)
      if (ddd >= 11 && ddd <= 99) {
        digits = digits.substring(3)
      }
    }

    if (digits.startsWith('0') && digits.length >= 11) {
      digits = digits.substring(1)
    }

    if (digits.length === 8 || digits.length === 9) {
      digits = '48' + digits
    }

    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = '55' + digits
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

  let allRecords = []
  try {
    allRecords = app.findRecordsByFilter('customers', '1=1', '-created', 5000, 0)
  } catch (err) {
    console.error('[PHONE_AUDIT] Erro ao buscar customers: ' + err.message)
    return c.json(500, { success: false, error: err.message })
  }

  const queryInfo = c.requestInfo().query || {}
  const autoTag = queryInfo.auto_tag === 'true' || queryInfo.auto_tag === '1'

  let validCount = 0
  let invalidCount = 0
  let taggedCount = 0
  const invalidList = []
  const reasonCounts = {}

  for (let i = 0; i < allRecords.length; i++) {
    const cust = allRecords[i]
    const rawPhone = cust.getString('phone') || cust.getString('phone_1_value') || ''
    const res = validateAndCleanBrazilianPhone(rawPhone)

    if (res.valid) {
      validCount++
    } else {
      invalidCount++
      const reason = res.errorReason || 'Telefone inválido'
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1

      invalidList.push({
        id: cust.id,
        name: cust.getString('name') || 'Sem nome',
        raw_phone: rawPhone,
        normalized_digits: res.phone || '',
        reason: reason,
        created: cust.getString('created'),
        updated: cust.getString('updated'),
        status: cust.getString('status') || '',
      })

      if (autoTag) {
        try {
          const rawTags = cust.get('tags') || []
          let tagsList = []
          if (Array.isArray(rawTags)) {
            tagsList = rawTags.filter((t) => typeof t === 'string')
          } else if (typeof rawTags === 'string') {
            try {
              const parsed = JSON.parse(rawTags)
              if (Array.isArray(parsed)) {
                tagsList = parsed.filter((t) => typeof t === 'string')
              }
            } catch (_) {}
          }

          let needsSave = false
          if (!tagsList.includes('telefone_invalido')) {
            tagsList.push('telefone_invalido')
            needsSave = true
          }
          if (!tagsList.includes('erro_numero_whatsapp')) {
            tagsList.push('erro_numero_whatsapp')
            needsSave = true
          }

          if (needsSave) {
            cust.set('tags', tagsList)
            app.saveNoValidate(cust)
            taggedCount++
          }
        } catch (tagErr) {
          console.warn('[PHONE_AUDIT] Erro ao gravar tags para ' + cust.id + ': ' + tagErr.message)
        }
      }
    }
  }

  return c.json(200, {
    success: true,
    auto_tag: autoTag,
    audit: {
      total_customers: allRecords.length,
      valid_phones_count: validCount,
      invalid_phones_count: invalidCount,
      tagged_now_count: taggedCount,
      reason_breakdown: reasonCounts,
      invalid_phones: invalidList,
      sample_invalid: invalidList.slice(0, 15),
    },
    timestamp: new Date().toISOString(),
  })
})

// ============================================================================
// POST /backend/v1/phone-audit/scan — Executa a varredura e aplica as tags nos inválidos imediatamente
// ============================================================================
routerAdd('POST', '/backend/v1/phone-audit/scan', (c) => {
  const app = $app

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

    // Trata duplicatas espelhadas (ex: 20 a 28 dígitos repetidos)
    if (digits.length >= 20 && digits.length <= 28 && digits.length % 2 === 0) {
      const half = digits.length / 2
      const firstHalf = digits.substring(0, half)
      const secondHalf = digits.substring(half)
      if (firstHalf === secondHalf) {
        digits = firstHalf
      }
    }

    // Se começar com 55041 (15 ou 16 dígitos), raspa 55041
    if (digits.startsWith('55041') && (digits.length === 15 || digits.length === 16)) {
      const ddd = parseInt(digits.substring(5, 7), 10)
      if (ddd >= 11 && ddd <= 99) {
        digits = digits.substring(5)
      }
    }

    // Se começar com 041 e tiver 13 ou 14 dígitos (041 + DDD + 8 ou 9 dígitos), raspa 041
    if (digits.startsWith('041') && (digits.length === 13 || digits.length === 14)) {
      const ddd = parseInt(digits.substring(3, 5), 10)
      if (ddd >= 11 && ddd <= 99) {
        digits = digits.substring(3)
      }
    }

    if (digits.startsWith('0') && digits.length >= 11) {
      digits = digits.substring(1)
    }

    if (digits.length === 8 || digits.length === 9) {
      digits = '48' + digits
    }

    if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = '55' + digits
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

  let allRecords = []
  try {
    allRecords = app.findRecordsByFilter('customers', '1=1', '-created', 5000, 0)
  } catch (err) {
    return c.json(500, { success: false, error: err.message })
  }

  let validCount = 0
  let invalidCount = 0
  let newlyTaggedCount = 0
  let alreadyTaggedCount = 0
  const invalidList = []
  const reasonCounts = {}

  for (let i = 0; i < allRecords.length; i++) {
    const cust = allRecords[i]
    const rawPhone = cust.getString('phone') || cust.getString('phone_1_value') || ''
    const res = validateAndCleanBrazilianPhone(rawPhone)

    if (res.valid) {
      validCount++
      // Se tiver tag antiga de erro mas agora é válido, remove idempotentemente
      try {
        const rawTags = cust.get('tags') || []
        let tagsList = Array.isArray(rawTags) ? rawTags.filter((t) => typeof t === 'string') : []
        if (tagsList.includes('telefone_invalido') || tagsList.includes('erro_numero_whatsapp')) {
          const cleanedTags = tagsList.filter(
            (t) => t !== 'telefone_invalido' && t !== 'erro_numero_whatsapp',
          )
          cust.set('tags', cleanedTags)
          app.saveNoValidate(cust)
        }
      } catch (_) {}
    } else {
      invalidCount++
      const reason = res.errorReason || 'Telefone inválido'
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1

      invalidList.push({
        id: cust.id,
        name: cust.getString('name') || 'Sem nome',
        raw_phone: rawPhone,
        normalized_digits: res.phone || '',
        reason: reason,
      })

      try {
        const rawTags = cust.get('tags') || []
        let tagsList = []
        if (Array.isArray(rawTags)) {
          tagsList = rawTags.filter((t) => typeof t === 'string')
        } else if (typeof rawTags === 'string') {
          try {
            const parsed = JSON.parse(rawTags)
            if (Array.isArray(parsed)) {
              tagsList = parsed.filter((t) => typeof t === 'string')
            }
          } catch (_) {}
        }

        const hasTag1 = tagsList.includes('telefone_invalido')
        const hasTag2 = tagsList.includes('erro_numero_whatsapp')

        if (!hasTag1 || !hasTag2) {
          if (!hasTag1) tagsList.push('telefone_invalido')
          if (!hasTag2) tagsList.push('erro_numero_whatsapp')
          cust.set('tags', tagsList)
          app.saveNoValidate(cust)
          newlyTaggedCount++
        } else {
          alreadyTaggedCount++
        }
      } catch (saveErr) {
        console.warn(
          '[PHONE_AUDIT_SCAN] Erro ao salvar tags do cliente ' + cust.id + ': ' + saveErr.message,
        )
      }
    }
  }

  return c.json(200, {
    success: true,
    summary: {
      total_customers: allRecords.length,
      valid_phones_count: validCount,
      invalid_phones_count: invalidCount,
      newly_tagged_count: newlyTaggedCount,
      already_tagged_count: alreadyTaggedCount,
      reason_breakdown: reasonCounts,
    },
    sample_invalid: invalidList.slice(0, 20),
    message:
      'Varredura completa concluída: ' +
      invalidCount +
      ' inválidos identificados na base (' +
      newlyTaggedCount +
      ' recém-etiquetados, ' +
      alreadyTaggedCount +
      ' já etiquetados).',
  })
})
