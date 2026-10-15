migrate(
  (app) => {
    // 1760000064_executa_disparo_correcao_v1271.js
    // DISPARO DE CORREÇÃO ÚNICO PARA OS CLIENTES QUE RECEBERAM D+1 INCORRETO
    // Travas completas:
    // 1. Disparo ÚNICO (idempotente: marca com origem "correcao_v1271" e não repete)
    // 2. Janela comercial 8h-20h (America/Sao_Paulo)
    // 3. Dedup por telefone
    // 4. Pula clientes que já responderam após a mensagem errada (diálogo vivo)
    // 5. Pula clientes bloqueados, arquivados ou com recusa expressa
    // 6. Anti-anexo-fantasma: verifica integridade do book em runtime; se corrompido/inexistente, envia SEM menção a anexo
    // 7. Trava ai_processing / TTL por cliente
    // 8. Saudação personalizada ou neutra se nome não for confiável

    console.log('[CORRECAO_V1271] Iniciando processo de disparo de correção...')

    // 1. Checagem de horário comercial (America/Sao_Paulo: 8h - 20h seg a sab)
    const now = new Date()
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    const brTime = new Date(utcTime - 3 * 3600000)
    const brHour = brTime.getHours()
    const brDay = brTime.getDay() // 0 = Domingo

    console.log(
      `[CORRECAO_V1271] Horário atual Brasília: ${brHour}h${brTime.getMinutes()}m, dia da semana: ${brDay}`,
    )

    if (brDay === 0 || brHour < 8 || brHour >= 20) {
      console.warn(
        '[CORRECAO_V1271] Fora da janela comercial de Brasília (08h-20h seg-sáb). Abortando disparo.',
      )
      return
    }

    // 2. Obter credenciais oficiais do WhatsApp da Meta
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
      console.error('[CORRECAO_V1271] Erro ao carregar usuário com Meta: ' + String(uErr))
    }

    if (!metaToken || !metaPhoneId) {
      console.error('[CORRECAO_V1271] Credenciais Meta WhatsApp ausentes. Não é possível disparar.')
      return
    }

    // 3. Checagem da integridade do e-book em runtime (Guarda anti-anexo-fantasma)
    // ID cnbqist3pc112xw (BOOK VISTAGE RESIDENCE.pdf) tem size = 0
    let validBookAttachment = null
    try {
      const bookRec = app.findRecordById('ai_knowledge_files', 'cnbqist3pc112xw')
      if (bookRec) {
        const fSize = bookRec.getInt('file_size') || 0
        const fName = bookRec.getString('file') || ''
        if (fSize > 1000 && fName) {
          const pbUrl = $os.getenv('PB_INSTANCE_URL') || 'https://crm.brfimoveis.com.br'
          validBookAttachment = {
            link: `${pbUrl}/api/files/ai_knowledge_files/${bookRec.id}/${fName}`,
            filename: 'Apresentacao_Vistage_Residence.pdf',
          }
          console.log(
            '[CORRECAO_V1271] Book íntegro encontrado: ' + fName + ' (' + fSize + ' bytes)',
          )
        } else {
          console.log(
            '[CORRECAO_V1271] Book cnbqist3pc112xw vazio/corrompido (' +
              fSize +
              ' bytes). Guarda anti-anexo ativada: disparo sem menção a anexo.',
          )
        }
      }
    } catch (_) {
      console.log('[CORRECAO_V1271] Registro do book não localizado. Disparo sem menção a anexo.')
    }

    // 4. Localizar registros com a mensagem errada de D+1
    // "Passando para saber se você conseguiu dar uma olhada na opção em relação ao *Vistage Residence Barreiros - AJ Coelho*"
    let wrongConvs = []
    try {
      wrongConvs = app.findRecordsByFilter(
        'conversations',
        "content ~ 'Vistage Residence Barreiros - AJ Coelho' && created >= '2026-10-14 00:00:00'",
        'created',
        200,
        0,
      )
    } catch (cErr) {
      console.error('[CORRECAO_V1271] Erro ao buscar conversas: ' + String(cErr))
    }

    console.log(
      `[CORRECAO_V1271] Total de conversas com texto errado encontradas: ${wrongConvs.length}`,
    )

    // 5. Agrupar por customer_id e ordenar cronologicamente
    const customerMap = {}
    for (let i = 0; i < wrongConvs.length; i++) {
      const c = wrongConvs[i]
      const cId = c.getString('customer_id')
      if (!cId) continue
      if (!customerMap[cId]) {
        customerMap[cId] = {
          customerId: cId,
          firstWrongMsgCreated: c.getString('created'),
          lastWrongMsgCreated: c.getString('created'),
          count: 1,
        }
      } else {
        customerMap[cId].count++
        customerMap[cId].lastWrongMsgCreated = c.getString('created')
      }
    }

    const uniqueCustomerIds = Object.keys(customerMap)
    console.log(
      `[CORRECAO_V1271] Total de clientes únicos identificados: ${uniqueCustomerIds.length}`,
    )

    // Contadores para o relatório final
    let totalIdentified = uniqueCustomerIds.length
    let totalSent = 0
    const skippedList = []

    // Helper para higienização e validação de nome do cliente
    function resolveCustomerGreetingName(custRec) {
      if (!custRec) return ''
      const fName = (custRec.getString('first_name') || '').trim()
      const fullName = (custRec.getString('name') || '').trim()
      const candidate = fName || fullName
      if (!candidate) return ''
      // Se for número cru, telefone, email ou termo genérico
      if (
        candidate.includes('+') ||
        candidate.includes('@') ||
        /^\d+$/.test(candidate.replace(/[\s\(\)\-\.]/g, ''))
      ) {
        return ''
      }
      if (
        /^(lead|cliente|contato|teste|whatsapp|meta|novo|usuario|usuário|imóvel|imovel)\b/i.test(
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

    // 6. Iterar sobre cada cliente e aplicar todas as validações
    const seenPhones = {}

    for (let cIdx = 0; cIdx < uniqueCustomerIds.length; cIdx++) {
      const custId = uniqueCustomerIds[cIdx]
      let cust = null
      try {
        cust = app.findRecordById('customers', custId)
      } catch (_) {
        skippedList.push({ customerId: custId, reason: 'Cliente não encontrado no banco' })
        continue
      }

      if (!cust) {
        skippedList.push({ customerId: custId, reason: 'Registro customer nulo' })
        continue
      }

      const phone = (cust.getString('phone') || '').trim()
      const cleanPhone = phone.replace(/\D/g, '')

      if (!cleanPhone || cleanPhone.length < 10) {
        skippedList.push({
          customerId: custId,
          phone: phone,
          reason: 'Telefone inválido ou ausente',
        })
        continue
      }

      // Trava de desduplicação por telefone
      if (seenPhones[cleanPhone]) {
        skippedList.push({
          customerId: custId,
          phone: phone,
          reason: 'Telefone duplicado na lista',
        })
        continue
      }
      seenPhones[cleanPhone] = true

      // Checagem de bloqueio, arquivamento ou recusa expressa
      const status = (cust.getString('status') || '').toLowerCase()
      const phase = (cust.getString('phase') || '').toLowerCase()
      const persistenceStatus = (cust.getString('persistence_status') || '').toLowerCase()

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
        tagsList.includes('bloqueado') ||
        tagsList.includes('frio') ||
        tagsList.includes('não é o momento') ||
        tagsList.includes('nao e o momento') ||
        persistenceStatus === 'pausado'
      ) {
        skippedList.push({
          customerId: custId,
          phone: phone,
          reason: 'Cliente bloqueado/arquivado/recusa expressa',
        })
        continue
      }

      // Checagem de idempotência: já recebeu correcao_v1271?
      try {
        const alreadyCorrected = app.findRecordsByFilter(
          'conversations',
          `customer_id = '${custId}' && (channel = 'correcao_v1271' || content ~ 'Passando para te pedir desculpas pela mensagem anterior')`,
          '-created',
          1,
          0,
        )
        if (alreadyCorrected && alreadyCorrected.length > 0) {
          skippedList.push({
            customerId: custId,
            phone: phone,
            reason: 'Já recebeu correção v1271 anteriormente',
          })
          continue
        }
      } catch (_) {}

      // Checagem CRÍTICA: O cliente já respondeu após a mensagem errada?
      // Buscar conversas do cliente criadas APÓS a primeira mensagem errada
      const wrongTime = customerMap[custId].firstWrongMsgCreated
      let respondedAfter = false
      try {
        const laterConvs = app.findRecordsByFilter(
          'conversations',
          `customer_id = '${custId}' && created > '${wrongTime}'`,
          'created',
          20,
          0,
        )
        for (let lIdx = 0; lIdx < laterConvs.length; lIdx++) {
          const lConv = laterConvs[lIdx]
          const snd = lConv.getString('sender')
          if (snd === 'customer' || snd === 'user' || snd === 'lead') {
            respondedAfter = true
            break
          }
        }
      } catch (respErr) {
        console.warn(`[CORRECAO_V1271] Aviso checagem resposta para ${custId}: ` + String(respErr))
      }

      if (respondedAfter) {
        skippedList.push({
          customerId: custId,
          phone: phone,
          reason: 'Já respondeu após a mensagem errada (diálogo vivo com a Bia)',
        })
        console.log(
          `[CORRECAO_V1271] Pulado customer ${custId} (${phone}): já respondeu após a mensagem errada.`,
        )
        continue
      }

      // Montar texto de correção personalizado
      const greetingName = resolveCustomerGreetingName(cust)
      let correctionText = ''
      if (greetingName) {
        correctionText = `Oi, ${greetingName}! Tudo bem? Passando para te pedir desculpas pela mensagem anterior: nosso sistema acabou se adiantando antes de eu te apresentar os detalhes com calma.
O lançamento que mencionei é o *Vistage Residence*, que fica em Barreiros (São José/SC), construído pela AJ Coelho. São apartamentos de 2 e 3 dormitórios, além de opções com garden privativo.
Gostaria que eu te enviasse as informações completas da planta de 2 ou de 3 dormitórios?`
      } else {
        correctionText = `Oi! Tudo bem? Passando para te pedir desculpas pela mensagem anterior: nosso sistema acabou se adiantando antes de eu te apresentar os detalhes com calma.
O lançamento que mencionei é o *Vistage Residence*, que fica em Barreiros (São José/SC), construído pela AJ Coelho. São apartamentos de 2 e 3 dormitórios, além de opções com garden privativo.
Gostaria que eu te enviasse as informações completas da planta de 2 ou de 3 dormitórios?`
      }

      // Trava de lock ai_processing por cliente (anti-flood)
      const lockTag = 'ai_processing:' + new Date().getTime()
      try {
        let currentTags = Array.isArray(rawTags) ? rawTags.slice() : []
        currentTags.push(lockTag)
        cust.set('tags', currentTags)
        app.saveNoValidate(cust)
      } catch (_) {}

      // Disparo Meta WhatsApp Cloud API v21.0
      let sendSuccess = false
      let sendRes = null
      const metaUrl = `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`

      try {
        sendRes = $http.send({
          url: metaUrl,
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + metaToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { preview_url: false, body: correctionText },
          }),
          timeout: 25,
        })

        if (sendRes && sendRes.statusCode >= 200 && sendRes.statusCode < 300) {
          sendSuccess = true
        } else {
          console.warn(
            `[CORRECAO_V1271] Envio falhou para ${cleanPhone}, status: ${sendRes ? sendRes.statusCode : 'null'}, body: ${sendRes ? sendRes.raw : ''}`,
          )
        }
      } catch (sendErr) {
        console.error(
          `[CORRECAO_V1271] Erro de rede ao disparar para ${cleanPhone}: ` + String(sendErr),
        )
      }

      // Se houver book íntegro (não é o caso atual, pois 0 bytes), anexar
      let docSuccess = false
      if (sendSuccess && validBookAttachment && validBookAttachment.link) {
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
              to: cleanPhone,
              type: 'document',
              document: {
                link: validBookAttachment.link,
                filename: validBookAttachment.filename,
              },
            }),
            timeout: 25,
          })
          if (docRes && docRes.statusCode >= 200 && docRes.statusCode < 300) {
            docSuccess = true
          }
        } catch (_) {}
      }

      // Gravar registro na coleção conversations com canal "correcao_v1271"
      try {
        const convCol = app.findCollectionByNameOrId('conversations')
        const convRec = new Record(convCol)
        convRec.set('user_id', activeUserId || cust.getString('user_id') || '')
        convRec.set('customer_id', custId)
        convRec.set('sender', 'ai')
        convRec.set('content', correctionText)
        convRec.set('channel', 'correcao_v1271')
        app.saveNoValidate(convRec)
      } catch (saveConvErr) {
        console.warn(
          `[CORRECAO_V1271] Erro ao registrar conversation para ${custId}: ` + String(saveConvErr),
        )
      }

      // Gravar log estruturado em system_logs
      try {
        const logsCol = app.findCollectionByNameOrId('system_logs')
        const logRec = new Record(logsCol)
        logRec.set('user_id', activeUserId)
        logRec.set('type', 'whatsapp_ai_send')
        logRec.set(
          'message',
          sendSuccess
            ? `Correção v1271 enviada com sucesso para ${cleanPhone}`
            : `Falha ao enviar correção v1271 para ${cleanPhone}`,
        )
        logRec.set(
          'details',
          JSON.stringify({
            customer_id: custId,
            phone: cleanPhone,
            greeting_name: greetingName,
            status_code: sendRes ? sendRes.statusCode : 0,
            origin: 'correcao_v1271',
            document_sent: docSuccess,
          }),
        )
        logRec.set(
          'payload',
          JSON.stringify({
            text: correctionText,
          }),
        )
        app.saveNoValidate(logRec)
      } catch (_) {}

      // Liberar lock ai_processing
      try {
        const refreshCust = app.findRecordById('customers', custId)
        let cTags = refreshCust.get('tags') || []
        if (Array.isArray(cTags)) {
          cTags = cTags.filter((t) => typeof t === 'string' && !t.startsWith('ai_processing'))
        }
        refreshCust.set('tags', cTags)
        app.saveNoValidate(refreshCust)
      } catch (_) {}

      if (sendSuccess) {
        totalSent++
        console.log(
          `[CORRECAO_V1271] Disparo #${totalSent} realizado com sucesso para ${cleanPhone} (${greetingName || 'neutro'}).`,
        )
      } else {
        skippedList.push({
          customerId: custId,
          phone: phone,
          reason: 'Erro na API da Meta (HTTP ' + (sendRes ? sendRes.statusCode : '0') + ')',
        })
      }
    }

    // Gravar log de encerramento do processo em system_logs
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const summaryLog = new Record(logsCol)
      summaryLog.set('user_id', activeUserId)
      summaryLog.set('type', 'correcao_v1271_summary')
      summaryLog.set(
        'message',
        `Resumo Disparo Correção v1271: ${totalSent} enviados de ${totalIdentified} identificados.`,
      )
      summaryLog.set(
        'details',
        JSON.stringify({
          total_identified: totalIdentified,
          total_sent: totalSent,
          skipped_count: skippedList.length,
          skipped: skippedList,
        }),
      )
      app.saveNoValidate(summaryLog)
    } catch (_) {}

    console.log(
      `[CORRECAO_V1271] CONCLUÍDO. Total identificados: ${totalIdentified}, Enviados: ${totalSent}, Pulados: ${skippedList.length}.`,
    )
  },
  (app) => {
    // Reversão vazia
  },
)
