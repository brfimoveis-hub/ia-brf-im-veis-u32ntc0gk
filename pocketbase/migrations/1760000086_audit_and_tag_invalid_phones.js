/**
 * Migração 1760000086: Varredura Completa da Base de Clientes (Auditoria de Telefones Brasileiros)
 *
 * Aplica a mesma regra de validação estrita (validateAndCleanBrazilianPhone):
 * - Exige 12 a 13 dígitos: 55 + DDD 11–99 + 8/9 dígitos
 * - Desfaz duplicações coladas (ex: 55489998103785548999810378)
 * - Suporta separadores ':::' pegando o primeiro válido
 * - Se inválido: marca tags 'telefone_invalido' e 'erro_numero_whatsapp' (sem excluir o cliente)
 * - O registro permanece na base intacto para correção manual pelo corretor
 * - Idempotente: só grava se a tag ainda não estiver presente
 */

migrate(
  (app) => {
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

    let allCustomers = []
    try {
      allCustomers = app.findRecordsByFilter('customers', '1=1', '-created', 5000, 0)
    } catch (err) {
      console.warn('[MIGRATION 1760000086] Aviso ao buscar clientes: ' + err.message)
      return
    }

    console.log(
      '[MIGRATION 1760000086] Iniciando varredura em ' + allCustomers.length + ' clientes...',
    )

    let validCount = 0
    let invalidCount = 0
    let newlyTaggedCount = 0
    let alreadyTaggedCount = 0
    const reasonTally = {}

    for (let i = 0; i < allCustomers.length; i++) {
      const cust = allCustomers[i]
      const rawPhone = cust.getString('phone') || cust.getString('phone_1_value') || ''
      const res = validateAndCleanBrazilianPhone(rawPhone)

      if (res.valid) {
        validCount++
      } else {
        invalidCount++
        const reason = res.errorReason || 'Telefone inválido'
        reasonTally[reason] = (reasonTally[reason] || 0) + 1

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
            '[MIGRATION 1760000086] Erro ao salvar tags para ' + cust.id + ': ' + saveErr.message,
          )
        }
      }
    }

    console.log(
      '[MIGRATION 1760000086] Varredura concluída! Total: ' +
        allCustomers.length +
        ' | Válidos: ' +
        validCount +
        ' | Inválidos: ' +
        invalidCount +
        ' (Recém-marcados: ' +
        newlyTaggedCount +
        ', Já marcados: ' +
        alreadyTaggedCount +
        ').',
    )
    console.log('[MIGRATION 1760000086] Motivos: ' + JSON.stringify(reasonTally))
  },
  (app) => {
    // Reversão segura: migração de anotação/auditoria de dados
  },
)
