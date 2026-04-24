routerAdd('POST', '/backend/v1/meta-webhook', (e) => {
  const body = e.requestInfo().body
  $app.logger().info('Meta Webhook Received', 'body', body)
  return e.json(200, { status: 'ok', message: 'Event received successfully' })
})
