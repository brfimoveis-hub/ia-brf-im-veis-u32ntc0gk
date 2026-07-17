routerAdd(
  'POST',
  '/backend/v1/process-email-campaign',
  (e) => {
    const body = e.requestInfo().body || {}
    const user = e.auth
    if (!user) return e.unauthorizedError('auth required')

    const campaignId = body.campaign_id
    if (!campaignId) return e.badRequestError('campaign_id is required')

    let campaign
    try {
      campaign = $app.findRecordById('email_campaigns', campaignId)
    } catch (_) {
      return e.notFoundError('Campaign not found')
    }

    if (campaign.getString('user_id') !== user.id) {
      return e.forbiddenError('Access denied to this campaign')
    }

    const subject = campaign.getString('subject')
    const content = campaign.getString('content')
    if (!subject || !content) return e.badRequestError('Campaign subject and content are required')

    campaign.set('status', 'sending')
    campaign.set('success_count', 0)
    campaign.set('failure_count', 0)
    campaign.set('unique_opens', 0)
    campaign.set('unique_clicks', 0)
    campaign.set('total_opens', 0)
    campaign.set('total_clicks', 0)
    $app.save(campaign)

    const filter = body.filter || {}
    const parts = ["user_id = '" + user.id + "'", "(email != '' || email_1_value != '')"]
    if (filter.status) parts.push("status = '" + String(filter.status).replace(/'/g, "''") + "'")
    if (filter.neighborhood)
      parts.push("neighborhood = '" + String(filter.neighborhood).replace(/'/g, "''") + "'")
    if (filter.price_range)
      parts.push("price_range = '" + String(filter.price_range).replace(/'/g, "''") + "'")
    if (filter.lead_profile)
      parts.push("lead_profile = '" + String(filter.lead_profile).replace(/'/g, "''") + "'")

    let customers = []
    try {
      customers = $app.findRecordsByFilter('customers', parts.join(' && '), '-created', 1000, 0)
    } catch (err) {
      campaign.set('status', 'failed')
      $app.save(campaign)
      return e.json(500, { error: 'Failed to query customers' })
    }

    campaign.set('total_recipients', customers.length)
    $app.save(campaign)

    const senderName = user.getString('name') || 'BRF Imóveis'
    const mailClient = $app.newMailClient()
    const deliveriesCol = $app.findCollectionByNameOrId('email_deliveries')
    const convCol = $app.findCollectionByNameOrId('conversations')

    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i]
      const rawEmail = customer.getString('email') || customer.getString('email_1_value')
      const cleanEmail = (rawEmail || '').trim()
      const customerName = customer.getString('name') || 'Cliente'
      const firstNameVal =
        customer.getString('first_name') || (customerName ? customerName.split(' ')[0] : '')
      const phoneVal = customer.getString('phone') || customer.getString('phone_1_value') || ''

      let delivery
      try {
        delivery = new Record(deliveriesCol)
        delivery.set('campaign_id', campaignId)
        delivery.set('customer_id', customer.id)
        delivery.set('status', 'pending')
        delivery.set('open_count', 0)
        delivery.set('click_count', 0)
        $app.save(delivery)
      } catch (_) {
        failureCount++
        continue
      }

      if (!cleanEmail) {
        delivery.set('status', 'failed')
        delivery.set('error_message', 'Customer has no email address')
        $app.save(delivery)
        failureCount++
        continue
      }

      let personalizedBody = content
      personalizedBody = personalizedBody.replace(/\{\{name\}\}/g, customerName)
      personalizedBody = personalizedBody.replace(/\{\{first_name\}\}/g, firstNameVal)
      personalizedBody = personalizedBody.replace(/\{\{email\}\}/g, cleanEmail)
      personalizedBody = personalizedBody.replace(/\{\{phone\}\}/g, phoneVal)

      const plainBody = personalizedBody
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()

      var trackBaseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/+$/, '')
      if (!trackBaseUrl) trackBaseUrl = 'https://' + e.request.host
      var trackOpenUrl = trackBaseUrl + '/backend/v1/email/track-open/' + delivery.id
      var trackClickBase = trackBaseUrl + '/backend/v1/email/track-click/' + delivery.id + '?url='

      var trackedBody = personalizedBody.replace(
        /href=["'](https?:\/\/[^"']+)["']/g,
        function (match, href) {
          return 'href="' + trackClickBase + encodeURIComponent(href) + '"'
        },
      )

      const htmlBody =
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;"><p>Olá ' +
        customerName +
        ',</p><div style="white-space:pre-wrap;line-height:1.6;">' +
        trackedBody +
        '</div><br><p style="color:#888;font-size:12px;">Enviado via BRF Imóveis CRM</p>' +
        '<img src="' +
        trackOpenUrl +
        '" width="1" height="1" alt="" style="display:none;border:0;"/></div>'

      try {
        const message = new MailMessage({
          from: { name: senderName, address: 'noreply@brfimoveis.com.br' },
          to: [{ name: customerName, address: cleanEmail }],
          subject: subject,
          html: htmlBody,
        })
        mailClient.send(message)

        delivery.set('status', 'sent')
        $app.save(delivery)
        successCount++

        try {
          const conv = new Record(convCol)
          conv.set('customer_id', customer.id)
          conv.set('content', '📧 ' + subject + '\n\n' + plainBody)
          conv.set('sender', 'agent')
          $app.save(conv)
        } catch (_) {}
      } catch (err) {
        delivery.set('status', 'failed')
        delivery.set('error_message', err.message || 'Unknown error')
        $app.save(delivery)
        failureCount++
      }

      if ((i + 1) % 10 === 0 || i === customers.length - 1) {
        try {
          const c = $app.findRecordById('email_campaigns', campaignId)
          c.set('success_count', successCount)
          c.set('failure_count', failureCount)
          $app.saveNoValidate(c)
        } catch (_) {}
      }
    }

    try {
      const c = $app.findRecordById('email_campaigns', campaignId)
      c.set('success_count', successCount)
      c.set('failure_count', failureCount)
      c.set('status', 'completed')
      $app.save(c)
    } catch (_) {}

    return e.json(200, {
      success: true,
      total: customers.length,
      sent: successCount,
      failed: failureCount,
    })
  },
  $apis.requireAuth(),
)
