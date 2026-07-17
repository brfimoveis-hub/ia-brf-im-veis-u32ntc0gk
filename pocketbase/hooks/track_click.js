routerAdd('GET', '/backend/v1/email/track-click/{deliveryId}', (e) => {
  var deliveryId = e.request.pathValue('deliveryId')
  var rawUrl = ''
  try {
    rawUrl = (e.requestInfo().query || {})['url'] || ''
  } catch (_) {}
  var url = (rawUrl || '').trim()

  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return e.redirect(302, 'https://www.brfimoveis.com.br')
  }
  if (!deliveryId) return e.redirect(302, url)

  var ip = (e.request.remoteAddr || '').split(':')[0] || ''
  var userAgent = e.request.header.get('User-Agent') || ''

  var delivery
  try {
    delivery = $app.findRecordById('email_deliveries', deliveryId)
  } catch (_) {
    return e.redirect(302, url)
  }

  var lastClickIp = delivery.getString('last_click_ip')
  var updatedTime = 0
  try {
    updatedTime = delivery.getDateTime('updated').time()
  } catch (_) {}
  var nowTime = Math.floor(Date.now() / 1000)
  if (lastClickIp === ip && lastClickIp !== '' && updatedTime > 0 && nowTime - updatedTime < 60) {
    return e.redirect(302, url)
  }

  try {
    var isFirstClick = !delivery.getString('clicked_at')
    if (isFirstClick) delivery.set('clicked_at', new Date().toISOString())
    delivery.set('click_count', (delivery.getInt('click_count') || 0) + 1)
    delivery.set('last_user_agent', userAgent.substring(0, 500))
    delivery.set('last_click_ip', ip)
    $app.saveNoValidate(delivery)

    var campaignId = delivery.getString('campaign_id')
    var campaign = $app.findRecordById('email_campaigns', campaignId)
    if (isFirstClick) campaign.set('unique_clicks', (campaign.getInt('unique_clicks') || 0) + 1)
    campaign.set('total_clicks', (campaign.getInt('total_clicks') || 0) + 1)
    $app.saveNoValidate(campaign)

    if (isFirstClick) {
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
                  event_name: 'Lead',
                  event_time: nowTime,
                  action_source: 'email',
                  event_source_url:
                    user.getString('website_url') || 'https://www.brfimoveis.com.br',
                  event_id: delivery.id + '_EmailClick_' + nowTime,
                  user_data: userData,
                  custom_data: {
                    content_name: 'Email Click',
                    delivery_id: delivery.id,
                    destination_url: url.substring(0, 200),
                  },
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
            .error('Email click CAPI failed', 'error', capiErr.message, 'delivery', deliveryId)
        } catch (_) {}
      }
    }
  } catch (err) {
    try {
      $app.logger().error('Email track-click error', 'error', err.message, 'delivery', deliveryId)
    } catch (_) {}
  }

  return e.redirect(302, url)
})
