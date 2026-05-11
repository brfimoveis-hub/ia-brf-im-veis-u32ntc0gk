routerAdd('POST', '/backend/v1/webhook/whatsapp', (e) => {
  const body = e.requestInfo().body

  $app.logger().info('Meta WhatsApp Webhook received', 'body', JSON.stringify(body))

  if (body && body.object === 'whatsapp_business_account') {
    return e.string(200, 'EVENT_RECEIVED')
  }

  return e.string(404, 'Not Found')
})
