// Hook para gerenciamento e sincronização de WhatsApp Message Templates com a Meta Cloud API
// Endpoints:
// 1. POST /backend/v1/whatsapp-templates/create (envia para Meta e salva local)
// 2. GET  /backend/v1/whatsapp-templates/sync (consulta Meta e atualiza status de todos os templates)
// 3. DELETE /backend/v1/whatsapp-templates/delete (remove do Meta e local se solicitado)

// 1. Criar e Submeter Template na Meta Cloud API
routerAdd(
  'POST',
  '/backend/v1/whatsapp-templates/create',
  (e) => {
    let user = e.auth
    if (!user) {
      const authId = e.requestInfo().headers['x-user-id'] || ''
      if (authId) {
        try {
          user = $app.findRecordById('users', authId)
        } catch (_) {}
      }
    }
    if (!user) {
      try {
        user = $app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (_) {}
    }
    if (!user) {
      return e.unauthorizedError('Autenticação necessária')
    }

    const wabaId = user.getString('meta_whatsapp_business_id') || '3542548689255402'
    const accessToken = user.getString('meta_whatsapp_access_token')

    if (!wabaId || !accessToken) {
      return e.badRequestError(
        'Credenciais do WhatsApp Cloud API (WABA ID ou Access Token) não configuradas.',
      )
    }

    const body = e.requestInfo().body || {}
    let name = (body.name || '').trim().toLowerCase()
    name = name.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')
    if (name.startsWith('_')) name = name.substring(1)
    if (name.endsWith('_')) name = name.substring(0, name.length - 1)

    const category = (body.category || 'MARKETING').trim().toUpperCase()
    const language = (body.language || 'pt_BR').trim()
    const bodyText = (body.body_text || body.message || '').trim()
    const buttons = Array.isArray(body.buttons) ? body.buttons : []
    const sampleValues = Array.isArray(body.example_values) ? body.example_values : ['Mauro']

    if (!name) {
      return e.badRequestError(
        'Nome do modelo é obrigatório (apenas letras minúsculas, números e sublinhados).',
      )
    }
    if (!bodyText) {
      return e.badRequestError('O texto da mensagem do modelo é obrigatório.')
    }
    if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)) {
      return e.badRequestError('Categoria inválida. Use MARKETING, UTILITY ou AUTHENTICATION.')
    }

    // Identificar variáveis {{1}}, {{2}}...
    const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || []
    const varCount = varMatches.length

    const components = []

    // Componente BODY
    const bodyComponent = {
      type: 'BODY',
      text: bodyText,
    }

    if (varCount > 0) {
      // Meta exige o objeto example com valores de amostra para cada variável {{1}}, {{2}}
      const bodyExamples = []
      for (let i = 0; i < varCount; i++) {
        const val =
          sampleValues[i] !== undefined && String(sampleValues[i]).trim()
            ? String(sampleValues[i]).trim()
            : i === 0
              ? 'Mauro'
              : 'Villa dos Açores'
        bodyExamples.push(val)
      }
      bodyComponent.example = {
        body_text: [bodyExamples],
      }
    }
    components.push(bodyComponent)

    // Componente BUTTONS se houver
    if (buttons.length > 0) {
      const buttonComponents = []
      for (let b = 0; b < Math.min(buttons.length, 3); b++) {
        const btn = buttons[b]
        if (btn && btn.text) {
          buttonComponents.push({
            type: 'QUICK_REPLY',
            text: String(btn.text).slice(0, 25),
          })
        }
      }
      if (buttonComponents.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: buttonComponents,
        })
      }
    }

    const metaPayload = {
      name: name,
      category: category,
      language: language,
      components: components,
    }

    let metaRes = null
    let resJson = null
    try {
      metaRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + wabaId + '/message_templates',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken,
        },
        body: JSON.stringify(metaPayload),
        timeout: 25,
      })
      try {
        resJson = metaRes.json
      } catch (_) {}
    } catch (httpErr) {
      return e.json(500, {
        success: false,
        error: 'Falha na conexão com a Meta: ' + (httpErr.message || String(httpErr)),
      })
    }

    let metaTemplateId = ''
    let initialStatus = 'PENDING'
    let rejectionReason = ''

    if (metaRes.statusCode >= 200 && metaRes.statusCode < 300) {
      metaTemplateId = resJson && resJson.id ? String(resJson.id) : ''
      initialStatus = resJson && resJson.status ? resJson.status.toUpperCase() : 'PENDING'
    } else {
      const errObj = resJson && resJson.error ? resJson.error : {}
      const errMsg = errObj.message || 'Erro ' + metaRes.statusCode + ' ao enviar para a Meta'
      const errSubcode = errObj.error_subcode || 0

      // Se o template já existe na Meta, tentamos buscar o ID dele
      if (
        errMsg.includes('already exists') ||
        errMsg.includes('duplicate') ||
        errSubcode === 2388042
      ) {
        initialStatus = 'PENDING'
        rejectionReason = 'Template já registrado anteriormente na Meta. Status será sincronizado.'
      } else {
        return e.json(400, {
          success: false,
          error: errMsg,
          details: errObj,
          meta_payload: metaPayload,
        })
      }
    }

    // Salvar ou atualizar na coleção local whatsapp_templates
    let record = null
    try {
      const existing = $app.findRecordsByFilter(
        'whatsapp_templates',
        "user_id = '" + user.id + "' && name = '" + name + "'",
        '-created',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        record = existing[0]
      }
    } catch (_) {}

    if (!record) {
      const col = $app.findCollectionByNameOrId('whatsapp_templates')
      record = new Record(col)
      record.set('user_id', user.id)
      record.set('name', name)
    }

    record.set('category', category)
    record.set('language', language)
    record.set('body_text', bodyText)
    record.set('status', initialStatus)
    if (metaTemplateId) record.set('meta_template_id', metaTemplateId)
    if (rejectionReason) record.set('rejection_reason', rejectionReason)
    record.set('buttons', buttons)
    record.set('example_values', sampleValues)

    try {
      $app.save(record)
    } catch (saveErr) {
      return e.json(500, {
        success: false,
        error: 'Erro ao salvar template no banco: ' + (saveErr.message || String(saveErr)),
      })
    }

    return e.json(200, {
      success: true,
      id: record.id,
      name: name,
      meta_template_id: metaTemplateId,
      status: initialStatus,
      rejection_reason: rejectionReason,
      message:
        initialStatus === 'APPROVED'
          ? 'Modelo aprovado instantaneamente pela Meta!'
          : 'Modelo submetido com sucesso! A análise pela Meta costuma levar de segundos a 24h.',
    })
  },
  $apis.requireAuth(),
)

// 2. Sincronizar status dos templates com a Meta Cloud API
routerAdd(
  'GET',
  '/backend/v1/whatsapp-templates/sync',
  (e) => {
    let user = e.auth
    if (!user) {
      const authId = e.requestInfo().headers['x-user-id'] || ''
      if (authId) {
        try {
          user = $app.findRecordById('users', authId)
        } catch (_) {}
      }
    }
    if (!user) {
      try {
        user = $app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (_) {}
    }
    if (!user) {
      return e.unauthorizedError('Autenticação necessária')
    }

    const wabaId = user.getString('meta_whatsapp_business_id') || '3542548689255402'
    const accessToken = user.getString('meta_whatsapp_access_token')

    if (!wabaId || !accessToken) {
      return e.badRequestError(
        'Credenciais do WhatsApp Cloud API (WABA ID ou Access Token) não configuradas.',
      )
    }

    const translateReason = (r) => {
      if (!r) return ''
      const upper = String(r).toUpperCase()
      if (upper.includes('TAG_CONTENT_MISMATCH') || upper.includes('VARIABLE')) {
        return 'Conteúdo da variável incorreto ou ausente exemplo de preenchimento.'
      }
      if (upper.includes('PROMOTIONAL') || upper.includes('MARKETING')) {
        return 'O texto contém oferta ou linguagem promocional divergente da categoria.'
      }
      if (upper.includes('INVALID_FORMAT') || upper.includes('FORMATTING')) {
        return 'Formatação inválida nas variáveis ou caracteres não suportados.'
      }
      if (upper.includes('ABUSIVE') || upper.includes('POLICY')) {
        return 'Texto viola as diretrizes de mensagens comerciais da Meta.'
      }
      if (upper.includes('INCORRECT_CATEGORY')) {
        return 'Categoria incorreta. A Meta sugere alterar entre Marketing e Utilidade.'
      }
      return String(r)
    }

    let metaTemplates = []
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          wabaId +
          '/message_templates?fields=id,name,status,category,language,components,rejected_reason&limit=100',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 25,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const json = res.json || {}
        metaTemplates = Array.isArray(json.data) ? json.data : []
      } else {
        const errObj = res.json && res.json.error ? res.json.error : {}
        return e.json(res.statusCode, {
          success: false,
          error: errObj.message || 'Erro ao consultar templates na Meta Cloud API',
        })
      }
    } catch (httpErr) {
      return e.json(500, {
        success: false,
        error: 'Falha de conexão com a Meta: ' + (httpErr.message || String(httpErr)),
      })
    }

    // Mapa dos templates da Meta indexado por nome
    const metaMap = {}
    metaTemplates.forEach((mt) => {
      if (mt && mt.name) {
        metaMap[mt.name.toLowerCase()] = mt
      }
    })

    // Buscar templates locais do usuário
    let localTemplates = []
    try {
      localTemplates = $app.findRecordsByFilter(
        'whatsapp_templates',
        "user_id = '" + user.id + "'",
        '-created',
        500,
        0,
      )
    } catch (_) {}

    const col = $app.findCollectionByNameOrId('whatsapp_templates')
    const updatedList = []

    // 1. Atualiza registros locais existentes
    for (let i = 0; i < localTemplates.length; i++) {
      const rec = localTemplates[i]
      const nameKey = rec.getString('name').toLowerCase()
      const metaItem = metaMap[nameKey]

      if (metaItem) {
        const metaStatus = (metaItem.status || 'PENDING').toUpperCase()
        const metaId = metaItem.id ? String(metaItem.id) : ''
        const reason = translateReason(metaItem.rejected_reason || metaItem.reason || '')

        rec.set('status', metaStatus)
        if (metaId) rec.set('meta_template_id', metaId)
        if (reason) rec.set('rejection_reason', reason)
        if (metaItem.category) rec.set('category', metaItem.category)

        if (metaStatus === 'APPROVED') {
          rec.set('rejection_reason', '')
        }

        try {
          $app.save(rec)
        } catch (_) {}

        updatedList.push({
          id: rec.id,
          name: rec.getString('name'),
          status: metaStatus,
          rejection_reason: reason,
          meta_template_id: metaId,
          category: rec.getString('category'),
          language: rec.getString('language'),
          body_text: rec.getString('body_text'),
          updated: true,
        })
      } else {
        updatedList.push({
          id: rec.id,
          name: rec.getString('name'),
          status: rec.getString('status'),
          rejection_reason: rec.getString('rejection_reason'),
          meta_template_id: rec.getString('meta_template_id'),
          category: rec.getString('category'),
          language: rec.getString('language'),
          body_text: rec.getString('body_text'),
          updated: false,
        })
      }
    }

    // 2. Se existirem templates na Meta que não foram criados pelo CRM, importa-os para o CRM
    metaTemplates.forEach((mt) => {
      const nameKey = (mt.name || '').toLowerCase()
      const alreadyLocal = localTemplates.some(
        (lt) => lt.getString('name').toLowerCase() === nameKey,
      )
      if (!alreadyLocal && mt.name) {
        try {
          let bodyText = ''
          const components = Array.isArray(mt.components) ? mt.components : []
          for (let c = 0; c < components.length; c++) {
            if (components[c].type === 'BODY' && components[c].text) {
              bodyText = components[c].text
              break
            }
          }

          const newRec = new Record(col)
          newRec.set('user_id', user.id)
          newRec.set('name', mt.name)
          newRec.set('category', mt.category || 'MARKETING')
          newRec.set('language', mt.language || 'pt_BR')
          newRec.set('body_text', bodyText || '(Texto importado da Meta)')
          newRec.set('status', (mt.status || 'PENDING').toUpperCase())
          newRec.set('meta_template_id', mt.id ? String(mt.id) : '')
          if (mt.rejected_reason) {
            newRec.set('rejection_reason', translateReason(mt.rejected_reason))
          }
          $app.save(newRec)

          updatedList.unshift({
            id: newRec.id,
            name: newRec.getString('name'),
            status: newRec.getString('status'),
            rejection_reason: newRec.getString('rejection_reason'),
            meta_template_id: newRec.getString('meta_template_id'),
            category: newRec.getString('category'),
            language: newRec.getString('language'),
            body_text: newRec.getString('body_text'),
            imported: true,
          })
        } catch (_) {}
      }
    })

    return e.json(200, {
      success: true,
      total_meta: metaTemplates.length,
      templates: updatedList,
    })
  },
  $apis.requireAuth(),
)

// 3. Deletar template na Meta e localmente
routerAdd(
  'DELETE',
  '/backend/v1/whatsapp-templates/delete',
  (e) => {
    let user = e.auth
    if (!user) {
      const authId = e.requestInfo().headers['x-user-id'] || ''
      if (authId) {
        try {
          user = $app.findRecordById('users', authId)
        } catch (_) {}
      }
    }
    if (!user) {
      try {
        user = $app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (_) {}
    }
    if (!user) {
      return e.unauthorizedError('Autenticação necessária')
    }

    const wabaId = user.getString('meta_whatsapp_business_id') || '3542548689255402'
    const accessToken = user.getString('meta_whatsapp_access_token')

    const body = e.requestInfo().body || {}
    const name = (body.name || '').trim()
    const templateId = (body.id || '').trim()

    if (!name && !templateId) {
      return e.badRequestError('Nome ou ID do modelo é obrigatório.')
    }

    let record = null
    try {
      if (templateId) {
        record = $app.findRecordById('whatsapp_templates', templateId)
      } else {
        const list = $app.findRecordsByFilter(
          'whatsapp_templates',
          "user_id = '" + user.id + "' && name = '" + name + "'",
          '-created',
          1,
          0,
        )
        if (list && list.length > 0) record = list[0]
      }
    } catch (_) {}

    const templateName = name || (record ? record.getString('name') : '')

    // Tentar deletar na Meta
    if (templateName && wabaId && accessToken) {
      try {
        $http.send({
          url:
            'https://graph.facebook.com/v21.0/' +
            wabaId +
            '/message_templates?name=' +
            encodeURIComponent(templateName),
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + accessToken },
          timeout: 15,
        })
      } catch (_) {}
    }

    // Deletar registro local
    if (record) {
      try {
        $app.delete(record)
      } catch (delErr) {
        return e.json(500, {
          success: false,
          error: 'Falha ao deletar template local: ' + (delErr.message || String(delErr)),
        })
      }
    }

    return e.json(200, {
      success: true,
      message: 'Modelo removido com sucesso.',
    })
  },
  $apis.requireAuth(),
)
