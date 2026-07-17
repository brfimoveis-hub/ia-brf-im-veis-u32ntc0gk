routerAdd('GET', '/backend/v1/email/track-open/{deliveryId}', (e) => {
  var GIF_BYTES = [
    71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0,
    0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59,
  ]

  e.response.header().set('Cache-Control', 'no-store, no-cache, must-revalidate')
  e.response.header().set('Pragma', 'no-cache')
  e.response.header().set('Access-Control-Allow-Origin', '*')

  var deliveryId = e.request.pathValue('deliveryId')
  if (!deliveryId) return e.blob(200, 'image/gif', GIF_BYTES)

  var ip = (e.request.remoteAddr || '').split(':')[0] || ''
  var userAgent = e.request.header.get('User-Agent') || ''

  var delivery
  try {
    delivery = $app.findRecordById('email_deliveries', deliveryId)
  } catch (_) {
    return e.blob(200, 'image/gif', GIF_BYTES)
  }

  var lastOpenIp = delivery.getString('last_open_ip')
  var updatedTime = 0
  try {
    updatedTime = delivery.getDateTime('updated').time()
  } catch (_) {}
  var nowTime = Math.floor(Date.now() / 1000)
  if (lastOpenIp === ip && lastOpenIp !== '' && updatedTime > 0 && nowTime - updatedTime < 60) {
    return e.blob(200, 'image/gif', GIF_BYTES)
  }

  try {
    var isFirstOpen = !delivery.getString('opened_at')
    if (isFirstOpen) delivery.set('opened_at', new Date().toISOString())
    delivery.set('open_count', (delivery.getInt('open_count') || 0) + 1)
    delivery.set('last_user_agent', userAgent.substring(0, 500))
    delivery.set('last_open_ip', ip)
    $app.saveNoValidate(delivery)

    var campaignId = delivery.getString('campaign_id')
    var campaign = $app.findRecordById('email_campaigns', campaignId)
    if (isFirstOpen) campaign.set('unique_opens', (campaign.getInt('unique_opens') || 0) + 1)
    campaign.set('total_opens', (campaign.getInt('total_opens') || 0) + 1)
    $app.saveNoValidate(campaign)

    if (isFirstOpen) {
      try {
        var customerId = delivery.getString('customer_id')
        var customer = $app.findRecordById('customers', customerId)
        var userId = customer.getString('user_id')
        if (userId) {
          var user = $app.findRecordById('users', userId)
          var datasetId = user.getString('meta_dataset_id') || user.getString('meta_pixel_id')
          var capiToken = user.getString('meta_capi_token')
          if (datasetId && capiToken) {
            var email = customer.getString('email') || customer.getString('email_1_value')
            var phone = customer.getString('phone') || customer.getString('phone_1_value')
            var userData = {
              external_id: [$security.sha256(customer.id)],
              client_ip_address: ip || '192.168.1.1',
              client_user_agent: userAgent.substring(0, 200) || 'Mozilla/5.0',
            }
            if (email) userData.em = [$security.sha256(email.trim().toLowerCase())]
            if (phone) {
              var cp = phone.replace(/\D/g, '')
              if (cp.length === 10 || cp.length === 11) cp = '55' + cp
              userData.ph = [$security.sha256(cp)]
            }
            var payload = {
              data: [
                {
                  event_name: 'ViewContent',
                  event_time: nowTime,
                  action_source: 'email',
                  event_source_url:
                    user.getString('website_url') || 'https://www.brfimoveis.com.br',
                  event_id: delivery.id + '_EmailOpen_' + nowTime,
                  user_data: userData,
                  custom_data: { content_name: 'Email Open', delivery_id: delivery.id },
                },
              ],
            }
            var testCode = $secrets.get('META_TEST_EVENT_CODE')
            if (testCode) payload.test_event_code = testCode
            $http.send({
              url: 'https://graph.facebook.com/v21.0/' + datasetId + '/events',
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + capiToken },
              body: JSON.stringify(payload),
              timeout: 10,
            })
          }
        }
      } catch (capiErr) {
        try {
          $app
            .logger()
            .error('Email open CAPI failed', 'error', capiErr.message, 'delivery', deliveryId)
        } catch (_) {}
      }
    }
  } catch (err) {
    try {
      $app.logger().error('Email track-open error', 'error', err.message, 'delivery', deliveryId)
    } catch (_) {}
  }

  return e.blob(200, 'image/gif', GIF_BYTES)
})
