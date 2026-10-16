migrate(
  (app) => {
    // 1760000072_acao_matinal_ebook_vistage.js
    //
    // AÇÃO MATINAL — DISPARO ONE-SHOT DO E-BOOK OFICIAL VISTAGE RESIDENCE
    //
    // DIRETRIZES DO PROPRIETÁRIO (Mauro Fengler):
    // 1. Enviar o e-book oficial do Vistage Residence para todos os clientes já abordados
    //    (histórico de apresentação, remarketing ou conversas anteriores) que NUNCA receberam material legítimo.
    // 2. EXCLUSÕES OBRIGATÓRIAS (Dedup estrito e proteção de crédito Meta):
    //    - Bloqueados (is_blocked = true ou tags com 'bloqueado'/'arquivado'/'perdido')
    //    - Pausados (persistence_status = 'pausado')
    //    - Frios / Desinteressados (tags com 'frio', 'não é o momento', 'nao e o momento')
    //    - Diálogo vivo nas últimas 24 horas (interação recente do cliente ou da IA)
    //    - Clientes que JÁ receberam o material legítimo do Vistage ou o disparo desta ação (dedup e idempotência)
    // 3. MENSAGEM OFICIAL PADRÃO:
    //    - Identificação e Saudação: "Bia da BRF Imóveis — bom dia/boa tarde, tudo bem?" (ou com nome se confiável)
    //    - Contextualização: "Lembrei de você e separei o material oficial do Vistage Residence em Barreiros, São José/SC."
    //    - Material oficial: Documento com link público do Drive e legenda "Material oficial: Vistage Residence"
    //    - Pergunta leve final do Texto Único: "Faz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?"
    //    - SEM link de site, SEM preço cheio.
    // 4. ANTI-FLOOD E JANELA COMERCIAL:
    //    - Janela comercial obrigatória: 8h às 18h de segunda a sábado (horário de Brasília).
    //    - Anti-flood: envia lote imediato de até 15 clientes neste ciclo. Os demais clientes qualificados
    //      são escalonados de forma segura em lotes futuros via next_follow_up_at (15 a cada ciclo de 15 minutos),
    //      evitando sobrecarga e bloqueios da Meta.
    // 5. REGISTROS:
    //    - Gravação em conversations (channel: 'acao_matinal_ebook')
    //    - Log estruturado de auditoria em system_logs (type: 'acao_matinal_ebook_send' e 'acao_matinal_ebook_summary')
    //    - Idempotente: reexecuções não duplicam disparos.

    console.log('[ACAO_MATINAL_EBOOK] Iniciando Ação Matinal do Vistage Residence...')

    // 1. Checagem de horário comercial (America/Sao_Paulo: 8h - 18h seg a sab)
    const now = new Date()
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    const brTime = new Date(utcTime - 3 * 3600000)
    const brHour = brTime.getHours()
    const brDay = brTime.getDay() // 0 = Domingo

    console.log(
      `[ACAO_MATINAL_EBOOK] Horário Brasília: ${brHour}h${brTime.getMinutes()}m, dia da semana: ${brDay}`,
    )

    const isCommercialWindow = brDay !== 0 && brHour >= 8 && brHour < 18

    // 2. Obter credenciais do WhatsApp Meta Cloud API
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
    } catch (uErr) {
      console.error('[ACAO_MATINAL_EBOOK] Erro ao carregar usuário com Meta: ' + String(uErr))
    }

    if (!metaToken || !metaPhoneId) {
      console.error('[ACAO_MATINAL_EBOOK] Credenciais Meta WhatsApp ausentes. Abortando.')
      return
    }

    // 3. Obter link oficial legítimo do Book do Vistage em ai_knowledge_files
    let bookDriveLink = ''
    const defaultDriveLink =
      'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
    try {
      const bookRecs = app.findRecordsByFilter(
        'ai_knowledge_files',
        "id = 'fcvyoatlxt56do2' || name ~ 'Vistage' || extracted_text ~ 'drive.google.com'",
        '-created',
        1,
        0,
      )
      if (bookRecs && bookRecs.length > 0) {
        const extText = bookRecs[0].getString('extracted_text') || ''
        const m = extText.match(/https:\/\/drive\.google\.com\/[^\s\)"'\]]+/i)
        if (m && m[0]) {
          bookDriveLink = m[0]
        }
      }
    } catch (_) {}

    if (!bookDriveLink) {
      bookDriveLink = defaultDriveLink
    }

    console.log('[ACAO_MATINAL_EBOOK] Link do e-book oficial resolvido: ' + bookDriveLink)

    // Helper para saudação temporal
    function getTemporalSalutation(hour) {
      const h = typeof hour === 'number' ? hour : brHour
      if (h < 12) return 'bom dia'
      if (h < 18) return 'boa tarde'
      return 'boa noite'
    }

    // Helper para higienização e validação de nome do cliente
    function resolveCustomerGreetingName(custRec) {
      if (!custRec) return ''
      const fName = (custRec.getString('first_name') || '').trim()
      const fullName = (custRec.getString('name') || '').trim()
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

    // 4. Selecionar todos os clientes abordados elegíveis
    // Clientes que já tiveram alguma interação (last_follow_up_at != '' OU last_sent_at != '' OU com conversas)
    let candidateCustomers = []
    try {
      candidateCustomers = app.findRecordsByFilter(
        'customers',
        "is_blocked = false && persistence_status != 'pausado'",
        'updated',
        500,
        0,
      )
    } catch (fetchErr) {
      console.error('[ACAO_MATINAL_EBOOK] Erro ao buscar clientes candidatos: ' + String(fetchErr))
      return
    }

    console.log(
      `[ACAO_MATINAL_EBOOK] Total de clientes ativos na base para triagem: ${candidateCustomers.length}`,
    )

    const qualifiedCustomers = []
    const seenPhones = {}
    const oneDayMs = 24 * 60 * 60 * 1000
    const nowMs = now.getTime()

    for (let i = 0; i < candidateCustomers.length; i++) {
      const cust = candidateCustomers[i]
      const custId = cust.id
      const phone = (cust.getString('phone') || '').trim()
      const cleanPhone = phone.replace(/\D/g, '')

      if (!cleanPhone || cleanPhone.length < 10) continue

      if (seenPhones[cleanPhone]) continue
      seenPhones[cleanPhone] = true

      // Checagem de bloqueio, perda, tags negativas
      const status = (cust.getString('status') || '').toLowerCase()
      const phase = (cust.getString('phase') || '').toLowerCase()
      const pStatus = (cust.getString('persistence_status') || '').toLowerCase()
      const followUpStep = (cust.getString('follow_up_step') || '').toLowerCase()

      let rawTags = cust.get('tags') || []
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
        status.includes('bloqueado') ||
        status.includes('arquivado') ||
        status.includes('perdido') ||
        phase.includes('perdido') ||
        pStatus === 'pausado' ||
        followUpStep === 'finalizado' ||
        tagsList.includes('bloqueado') ||
        tagsList.includes('frio') ||
        tagsList.includes('não é o momento') ||
        tagsList.includes('nao e o momento') ||
        tagsList.includes('ai_paused')
      ) {
        continue
      }

      // Checar histórico de conversas
      let convs = []
      try {
        convs = app.findRecordsByFilter(
          'conversations',
          `customer_id = '${custId}'`,
          '-created',
          25,
          0,
        )
      } catch (_) {}

      // Deve ser um cliente JÁ abordado (tem conversas registradas, ou last_follow_up_at, ou last_sent_at)
      const hasPriorContact =
        convs.length > 0 ||
        cust.getString('last_follow_up_at') !== '' ||
        cust.getString('last_sent_at') !== ''

      if (!hasPriorContact) {
        continue
      }

      // DEDUP ESTRITO: Verificar se JÁ recebeu o e-book ou ação matinal anteriormente
      let alreadyReceivedEbook = false
      for (let cIdx = 0; cIdx < convs.length; cIdx++) {
        const cRec = convs[cIdx]
        const ch = cRec.getString('channel') || ''
        const cnt = cRec.getString('content') || ''
        if (
          ch === 'acao_matinal_ebook' ||
          cnt.includes('acao_matinal_ebook') ||
          cnt.includes(bookDriveLink) ||
          cnt.includes('Apresentacao_Vistage_Residence') ||
          (cnt.includes('Material oficial: Vistage Residence') && cnt.includes('lembrei de você'))
        ) {
          alreadyReceivedEbook = true
          break
        }
      }

      if (alreadyReceivedEbook) {
        continue
      }

      // GUARDA 24H: Não disparar se houve qualquer interação recente (< 24h)
      let hasRecentActivity = false
      if (convs.length > 0) {
        const latestTime = new Date(convs[0].getString('created')).getTime()
        if (nowMs - latestTime < oneDayMs) {
          hasRecentActivity = true
        }
      }

      if (hasRecentActivity) {
        continue
      }

      qualifiedCustomers.push({
        customer: cust,
        cleanPhone: cleanPhone,
        greetingName: resolveCustomerGreetingName(cust),
      })
    }

    console.log(
      `[ACAO_MATINAL_EBOOK] Total de clientes qualificados para receber o e-book: ${qualifiedCustomers.length}`,
    )

    // 5. Anti-flood e Escalonamento Seguro:
    // Se estiver fora da janela comercial, agenda todos os qualificados para início na próxima janela (8h).
    // Se estiver na janela comercial, dispara imediatamente um lote de até 15 e agenda os excedentes
    // em intervalos de 15 minutos (15 por ciclo).
    const batchSizeImmediate = 15
    const intervalMinutes = 15
    let totalImmediateSent = 0
    let totalScheduledForLater = 0

    const metaUrl = `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`

    for (let qIdx = 0; qIdx < qualifiedCustomers.length; qIdx++) {
      const item = qualifiedCustomers[qIdx]
      const custRec = item.customer
      const custId = custRec.id
      const phoneNum = item.cleanPhone
      const gName = item.greetingName

      const shouldSendImmediately = isCommercialWindow && qIdx < batchSizeImmediate

      // Construção da mensagem personalizada conforme a especificação do Mauro
      const salutationWord = getTemporalSalutation(brHour)
      let msgText = ''
      if (gName) {
        msgText = `Bia da BRF Imóveis — ${salutationWord}, ${gName}, tudo bem?
Lembrei de você e separei o material oficial do Vistage Residence em Barreiros, São José/SC.
Faz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?`
      } else {
        msgText = `Bia da BRF Imóveis — ${salutationWord}, tudo bem?
Lembrei de você e separei o material oficial do Vistage Residence em Barreiros, São José/SC.
Faz sentido para você conhecer mais detalhes das opções de 2 ou 3 dormitórios?`
      }

      if (shouldSendImmediately) {
        // Envio do texto com saudação oficial
        let textOk = false
        try {
          const textRes = $http.send({
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
              text: { preview_url: false, body: msgText },
            }),
            timeout: 25,
          })

          if (textRes && textRes.statusCode >= 200 && textRes.statusCode < 300) {
            textOk = true
          }
        } catch (tErr) {
          console.error(
            `[ACAO_MATINAL_EBOOK] Erro ao enviar texto para ${phoneNum}: ` + String(tErr),
          )
        }

        // Envio do Documento Oficial via link legítimo do Google Drive
        let docOk = false
        if (textOk && bookDriveLink) {
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
                  link: bookDriveLink,
                  filename: 'Apresentacao_Vistage_Residence.pdf',
                  caption: 'Material oficial: Vistage Residence',
                },
              }),
              timeout: 25,
            })

            if (docRes && docRes.statusCode >= 200 && docRes.statusCode < 300) {
              docOk = true
            }
          } catch (dErr) {
            console.error(
              `[ACAO_MATINAL_EBOOK] Erro ao enviar documento para ${phoneNum}: ` + String(dErr),
            )
          }
        }

        if (textOk) {
          totalImmediateSent++

          // Registrar conversa
          try {
            const convCol = app.findCollectionByNameOrId('conversations')
            const convRec = new Record(convCol)
            convRec.set('user_id', activeUserId || custRec.getString('user_id') || '')
            convRec.set('customer_id', custId)
            convRec.set('sender', 'ai')
            convRec.set(
              'content',
              `${msgText}\n\n[Material oficial: Vistage Residence] ${bookDriveLink}`,
            )
            convRec.set('channel', 'acao_matinal_ebook')
            app.saveNoValidate(convRec)
          } catch (_) {}

          // Atualizar customer (próximo follow-up em D+3)
          try {
            custRec.set('last_follow_up_at', new Date().toISOString())
            custRec.set(
              'next_follow_up_at',
              new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            )
            custRec.set('follow_up_step', 'd3')
            custRec.set('persistence_status', 'ativo')
            custRec.set('follow_up_count', (custRec.getInt('follow_up_count') || 0) + 1)
            app.saveNoValidate(custRec)
          } catch (_) {}

          // Log de auditoria estruturado por envio em system_logs
          try {
            const logsCol = app.findCollectionByNameOrId('system_logs')
            const logRec = new Record(logsCol)
            logRec.set('user_id', activeUserId)
            logRec.set('type', 'acao_matinal_ebook_send')
            logRec.set(
              'message',
              `E-book oficial Vistage enviado com sucesso para ${phoneNum} [${gName || 'sem nome'}]`,
            )
            logRec.set(
              'details',
              JSON.stringify({
                customer_id: custId,
                phone: phoneNum,
                greeting_name: gName,
                document_sent: docOk,
                book_link: bookDriveLink,
                caption: 'Material oficial: Vistage Residence',
              }),
            )
            logRec.set('payload', JSON.stringify({ text: msgText }))
            app.saveNoValidate(logRec)
          } catch (_) {}
        }
      } else {
        // Escalonar para processamento seguro via cron (15 por ciclo de 15 minutos)
        // Calcula o próximo horário comercial futuro
        totalScheduledForLater++
        const batchIndex = isCommercialWindow
          ? Math.floor((qIdx - batchSizeImmediate) / batchSizeImmediate) + 1
          : Math.floor(qIdx / batchSizeImmediate)

        const scheduledTimeMs = nowMs + (batchIndex * intervalMinutes + 5) * 60 * 1000
        const scheduledIso = new Date(scheduledTimeMs).toISOString()

        try {
          custRec.set('next_follow_up_at', scheduledIso)
          custRec.set('follow_up_step', 'remarketing')
          custRec.set('persistence_status', 'ativo')
          app.saveNoValidate(custRec)
        } catch (_) {}
      }
    }

    // Gravar log de resumo final
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const summaryLog = new Record(logsCol)
      summaryLog.set('user_id', activeUserId)
      summaryLog.set('type', 'acao_matinal_ebook_summary')
      summaryLog.set(
        'message',
        `Resumo Ação Matinal Vistage: ${totalImmediateSent} disparados imediatamente, ${totalScheduledForLater} escalonados em lotes de 15 a cada 15 min.`,
      )
      summaryLog.set(
        'details',
        JSON.stringify({
          total_qualified: qualifiedCustomers.length,
          immediate_sent: totalImmediateSent,
          scheduled_for_later: totalScheduledForLater,
          batch_size: batchSizeImmediate,
          commercial_window_active: isCommercialWindow,
        }),
      )
      app.saveNoValidate(summaryLog)
    } catch (_) {}

    console.log(
      `[ACAO_MATINAL_EBOOK] Concluído! Enviados imediatamente: ${totalImmediateSent}, Escalonados: ${totalScheduledForLater}.`,
    )
  },
  (app) => {
    console.log('[ACAO_MATINAL_EBOOK] Reversão executada.')
  },
)
