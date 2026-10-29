// Hook para POST /backend/v1/messenger/send_message
// Utilitário testável de envio outbound Messenger da Página oficial/duplicada BRF Imóveis
// Permite que a Bia e o CRM enviem mensagens via Facebook Messenger (POST /{page-id}/messages ou POST /me/messages)
// Formato esperado do payload:
// { "recipient_id": "<PSID>", "text": "Mensagem..." } ou { "psid": "...", "message": "..." }

function handleMessengerSendMessage(e) {
  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  var recipientId = body.recipient_id || body.psid || ''
  var text = body.text || body.message || ''
  var dryRun = body.dry_run === true

  if (!recipientId) {
    return e.json(400, {
      success: false,
      error: 'Parâmetro obrigatório ausente: recipient_id (PSID do usuário)',
    })
  }

  if (!text) {
    return e.json(400, {
      success: false,
      error: 'Parâmetro obrigatório ausente: text (conteúdo da mensagem)',
    })
  }

  // 1. Resolver usuário do CRM e Page Access Token
  var user = null
  try {
    if (e.auth && e.auth.id) {
      user = $app.findRecordById('users', e.auth.id)
    }
  } catch (_) {}

  if (!user) {
    try {
      var users = $app.findRecordsByFilter(
        'users',
        "meta_page_access_token != ''",
        '-updated',
        1,
        0,
      )
      if (users && users.length > 0) user = users[0]
    } catch (_) {}
  }

  if (!user) {
    return e.json(400, {
      success: false,
      error: 'Nenhum usuário com meta_page_access_token configurado no CRM',
    })
  }

  var pageToken = user.getString('meta_page_access_token') || ''
  if (!pageToken) {
    return e.json(400, {
      success: false,
      error:
        'Page Access Token não encontrado em users.meta_page_access_token. Gere um Page Token na Meta.',
    })
  }

  if (dryRun) {
    return e.json(200, {
      success: true,
      dry_run: true,
      recipient_id: recipientId,
      text_len: text.length,
      token_configured: true,
      token_preview: pageToken.substring(0, 15) + '...',
    })
  }

  // 2. Chamar Graph API POST /me/messages ou POST /v22.0/me/messages
  try {
    var payloadObj = {
      recipient: { id: recipientId },
      message: { text: text },
      messaging_type: 'RESPONSE',
    }

    var res = $http.send({
      url: 'https://graph.facebook.com/v22.0/me/messages',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + pageToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadObj),
      timeout: 15,
    })

    var resData = res.json || {}
    if (res.statusCode >= 200 && res.statusCode < 300) {
      $app
        .logger()
        .info(
          'Messenger Outbound Mensagem Enviada com sucesso',
          'recipient_id',
          recipientId,
          'message_id',
          resData.message_id || '',
        )

      // Registrar em system_logs (tipo messenger_send_result e mantendo legado messenger_outbound)
      try {
        var sysLogsCol = $app.findCollectionByNameOrId('system_logs')
        var sendResultLog = new Record(sysLogsCol, {
          user_id: user.id,
          type: 'messenger_send_result',
          message:
            'Envio Messenger bem-sucedido para ' +
            recipientId +
            ' (message_id: ' +
            (resData.message_id || 'OK') +
            ')',
          details:
            'Sucesso: true | message_id: ' +
            (resData.message_id || '') +
            ' | HTTP ' +
            res.statusCode +
            ' | Texto: ' +
            text.substring(0, 100),
          payload: {
            success: true,
            recipient_id: recipientId,
            message_id: resData.message_id || '',
            status_code: res.statusCode,
            text: text,
            raw_response: resData,
          },
        })
        $app.save(sendResultLog)
      } catch (logErr1) {
        $app
          .logger()
          .error('Falha ao gravar messenger_send_result (sucesso)', 'error', String(logErr1))
      }

      return e.json(200, {
        success: true,
        recipient_id: recipientId,
        message_id: resData.message_id || '',
        data: resData,
      })
    } else {
      var errObj = resData.error || {}
      var errCode = errObj.code !== undefined ? errObj.code : res.statusCode
      var errSubcode = errObj.error_subcode !== undefined ? errObj.error_subcode : null
      var errMsg =
        errObj.message ||
        'Erro na Graph API ao enviar mensagem Messenger (HTTP ' + res.statusCode + ')'

      $app
        .logger()
        .error(
          'Messenger Outbound Falha no Envio',
          'error',
          errMsg,
          'status',
          res.statusCode,
          'code',
          errCode,
        )

      // Registrar falha em system_logs (tipo messenger_send_result)
      try {
        var sysLogsColFail = $app.findCollectionByNameOrId('system_logs')
        var failResultLog = new Record(sysLogsColFail, {
          user_id: user.id,
          type: 'messenger_send_result',
          message:
            'Falha no envio Messenger para ' + recipientId + ': Código ' + errCode + ' - ' + errMsg,
          details:
            'Sucesso: false | HTTP ' +
            res.statusCode +
            ' | Código: ' +
            errCode +
            (errSubcode ? ' | Subcode: ' + errSubcode : '') +
            ' | Erro: ' +
            errMsg +
            ' | Texto: ' +
            text.substring(0, 100),
          payload: {
            success: false,
            recipient_id: recipientId,
            message_id: null,
            status_code: res.statusCode,
            error_code: errCode,
            error_subcode: errSubcode,
            error_message: errMsg,
            text: text,
            raw_response: resData,
          },
        })
        $app.save(failResultLog)
      } catch (logErr2) {
        $app
          .logger()
          .error('Falha ao gravar messenger_send_result (falha)', 'error', String(logErr2))
      }

      return e.json(res.statusCode || 400, {
        success: false,
        error: errMsg,
        code: errCode,
        subcode: errSubcode,
        details: resData,
      })
    }
  } catch (err) {
    try {
      var sysLogsColExc = $app.findCollectionByNameOrId('system_logs')
      var excResultLog = new Record(sysLogsColExc, {
        user_id: user ? user.id : '',
        type: 'messenger_send_result',
        message: 'Exceção ao tentar envio Messenger para ' + recipientId + ': ' + String(err),
        details: 'Sucesso: false | Exceção: ' + String(err),
        payload: {
          success: false,
          recipient_id: recipientId,
          message_id: null,
          exception: String(err),
          text: text,
        },
      })
      $app.save(excResultLog)
    } catch (_) {}

    return e.json(500, {
      success: false,
      error: 'Exceção ao enviar mensagem Messenger: ' + String(err),
    })
  }
}

routerAdd('POST', '/backend/v1/messenger/send_message', handleMessengerSendMessage)
