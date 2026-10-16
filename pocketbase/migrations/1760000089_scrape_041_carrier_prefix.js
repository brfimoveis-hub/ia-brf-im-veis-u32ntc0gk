migrate(
  (app) => {
    console.log(
      '[MIGRATION 1760000089] Iniciando raspagem do prefixo 041 e normalização de telefones...',
    )

    function cleanAndNormalizePhone041(rawPhone) {
      if (!rawPhone) return { valid: false, phone: '', changed: false, error: 'Vazio' }
      let str = String(rawPhone).trim()
      if (str.includes('@')) return { valid: false, phone: '', changed: false, error: 'Email' }

      if (str.includes(':::')) {
        const parts = str
          .split(':::')
          .map((p) => p.trim())
          .filter(Boolean)
        for (let i = 0; i < parts.length; i++) {
          const res = cleanAndNormalizePhone041(parts[i])
          if (res.valid) return res
        }
        str = parts[0] || str
      }

      let digits = str.replace(/\D/g, '')
      let was041 = false

      // Trata duplicatas espelhadas (ex: 22 a 28 dígitos repetidos)
      if (digits.length >= 20 && digits.length <= 28 && digits.length % 2 === 0) {
        const half = digits.length / 2
        if (digits.substring(0, half) === digits.substring(half)) {
          digits = digits.substring(0, half)
        }
      }

      // Se começar com 55041 (15 ou 16 dígitos)
      if (digits.startsWith('55041') && (digits.length === 15 || digits.length === 16)) {
        const ddd = parseInt(digits.substring(5, 7), 10)
        if (ddd >= 11 && ddd <= 99) {
          digits = digits.substring(5) // remove 55041, resta DDD + número
          was041 = true
        }
      }

      // Se começar com 041 e tiver 13 ou 14 dígitos (041 + DDD + 8 ou 9 dígitos)
      if (digits.startsWith('041') && (digits.length === 13 || digits.length === 14)) {
        const ddd = parseInt(digits.substring(3, 5), 10)
        if (ddd >= 11 && ddd <= 99) {
          digits = digits.substring(3) // remove 041, resta DDD + número
          was041 = true
        }
      }

      // Se tiver zero à esquerda simples (ex: 0489999...)
      if (digits.startsWith('0') && digits.length >= 11) {
        digits = digits.substring(1)
      }

      // Se tiver 8 ou 9 dígitos (local SC 48)
      if (digits.length === 8 || digits.length === 9) {
        digits = '48' + digits
      }

      // Se tiver 10 ou 11 dígitos, prepende DDI 55 Brasil (independente de começar com 55)
      // Ex: DDD 55 (Santa Maria/RS) com 11 dígitos vira 55 + 55 + número = 13 dígitos
      if (digits.length === 10 || digits.length === 11) {
        digits = '55' + digits
      }

      // Validação estrita do formato E.164 brasileiro (55 + DDD 11-99 + 8 ou 9 dígitos)
      if (digits.length < 12 || digits.length > 13 || !digits.startsWith('55')) {
        return {
          valid: false,
          phone: digits,
          changed: was041,
          error: 'Comprimento ou formato inválido',
        }
      }

      const ddd = parseInt(digits.substring(2, 4), 10)
      if (isNaN(ddd) || ddd < 11 || ddd > 99) {
        return { valid: false, phone: digits, changed: was041, error: 'DDD inválido' }
      }

      return { valid: true, phone: digits, changed: true, error: null }
    }

    let candidates = []
    try {
      candidates = app.findRecordsByFilter(
        'customers',
        "tags ~ 'telefone_invalido' || tags ~ 'erro_numero_whatsapp' || phone ~ '041' || phone_1_value ~ '041'",
        '-created',
        5000,
        0,
      )
    } catch (e) {
      console.warn('[MIGRATION 1760000089] Erro ao buscar candidatos:', e.message)
      return
    }

    let repairedCount = 0
    let stillInvalidCount = 0
    const repairedList = []
    const stillInvalidList = []

    for (let i = 0; i < candidates.length; i++) {
      const cust = candidates[i]
      const rawPhone = cust.getString('phone') || cust.getString('phone_1_value') || ''
      const res = cleanAndNormalizePhone041(rawPhone)

      const rawTags = cust.get('tags') || []
      let tagsList = []
      if (Array.isArray(rawTags)) {
        tagsList = rawTags.filter((t) => typeof t === 'string')
      } else if (typeof rawTags === 'string') {
        try {
          const parsed = JSON.parse(rawTags)
          if (Array.isArray(parsed)) tagsList = parsed.filter((t) => typeof t === 'string')
        } catch (_) {}
      }

      if (res.valid) {
        // Normaliza número e remove as tags de erro
        cust.set('phone', res.phone)
        cust.set('phone_1_value', res.phone)

        const cleanedTags = tagsList.filter(
          (t) => t !== 'telefone_invalido' && t !== 'erro_numero_whatsapp',
        )
        cust.set('tags', cleanedTags)
        app.saveNoValidate(cust)

        repairedCount++
        repairedList.push({
          id: cust.id,
          name: cust.getString('name'),
          raw: rawPhone,
          clean: res.phone,
        })
      } else {
        // Permanece inválido; garante que continue marcado
        stillInvalidCount++
        stillInvalidList.push({
          id: cust.id,
          name: cust.getString('name'),
          raw: rawPhone,
          error: res.error,
        })

        let needsTag = false
        if (!tagsList.includes('telefone_invalido')) {
          tagsList.push('telefone_invalido')
          needsTag = true
        }
        if (!tagsList.includes('erro_numero_whatsapp')) {
          tagsList.push('erro_numero_whatsapp')
          needsTag = true
        }
        if (needsTag) {
          cust.set('tags', tagsList)
          app.saveNoValidate(cust)
        }
      }
    }

    console.log(
      '[MIGRATION 1760000089] Concluído! Corrigidos:',
      repairedCount,
      '| Permanecem inválidos:',
      stillInvalidCount,
    )

    // Agendamento do Modo Contínuo para Segunda-feira 08h00 BRT
    try {
      const ctrl = app.findFirstRecordByFilter('app_controls', "key = 'ebook_continuous_mode'")
      if (ctrl) {
        // Segunda-feira 19/10/2026 às 08:00:00 BRT = 11:00:00 UTC
        const mondayIso = '2026-10-19T11:00:00.000Z'

        // Contar quantos pendentes reais existem agora
        const baseFilter =
          "phone != '' && is_blocked = false && persistence_status != 'pausado' && " +
          "status !~ 'bloqueado' && tags !~ 'bloqueado' && tags !~ 'ai_paused' && " +
          "status !~ 'perdido' && phase !~ 'perdido' && tags !~ 'frio' && " +
          "tags !~ 'não é o momento' && tags !~ 'nao e o momento' && follow_up_step != 'finalizado' && " +
          "tags !~ 'telefone_invalido' && tags !~ 'erro_numero_whatsapp' && " +
          "tags !~ 'ebook_vistage_entregue' && tags !~ 'ebook_vistage_documento_entregue' && " +
          "(last_sent_at != '' || last_follow_up_at != '' || follow_up_count > 0 || follow_up_step != '')"

        let pendingCount = 0
        try {
          const pRecs = app.findRecordsByFilter('customers', baseFilter, '', 1000, 0)
          pendingCount = pRecs.length
        } catch (_) {}

        ctrl.set('is_active', true)
        ctrl.set('resumed_at', new Date().toISOString())
        ctrl.set('resumed_by', 'Mauro (Agendamento Segunda 08h BRT)')
        ctrl.set('metadata', {
          next_batch_at: mondayIso,
          last_dispatched_at: null,
          last_dispatched_count: 0,
          remaining_pending: pendingCount,
          stop_reason: null,
        })
        app.saveNoValidate(ctrl)
        console.log(
          '[MIGRATION 1760000089] Modo Contínuo ativado e agendado para',
          mondayIso,
          'com',
          pendingCount,
          'pendentes.',
        )
      }
    } catch (eCtrl) {
      console.warn('[MIGRATION 1760000089] Erro ao agendar modo contínuo:', eCtrl.message)
    }

    // Gravar log de auditoria em system_logs
    try {
      const sCol = app.findCollectionByNameOrId('system_logs')
      const sRec = new Record(sCol)
      sRec.set('type', 'ebook_041_prefix_scrape')
      sRec.set(
        'message',
        'Raspagem de prefixo 041 concluída: ' +
          repairedCount +
          ' clientes recuperados e devolvidos à fila; ' +
          stillInvalidCount +
          ' permanecem inválidos. Modo Contínuo agendado para Segunda-feira 08h BRT.',
      )
      sRec.set(
        'details',
        JSON.stringify({
          repaired_count: repairedCount,
          still_invalid_count: stillInvalidCount,
          repaired_sample: repairedList.slice(0, 10),
          still_invalid_sample: stillInvalidList.slice(0, 10),
          next_batch_at: '2026-10-19T11:00:00.000Z',
          timestamp: new Date().toISOString(),
        }),
      )
      app.saveNoValidate(sRec)
    } catch (_) {}
  },
  (app) => {
    // Reversão no-op para integridade dos dados
  },
)
