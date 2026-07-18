onRecordAfterCreateSuccess((e) => {
  const sender = e.record.getString('sender')
  if (sender !== 'agent' && sender !== 'ai') return e.next()
  const customerId = e.record.getString('customer_id')
  if (!customerId) return e.next()
  try {
    const customer = $app.findRecordById('customers', customerId)
    customer.set('last_sent_at', new Date().toISOString())
    $app.saveNoValidate(customer)
  } catch (err) {
    $app.logger().error('failed to update last_sent_at from conversation', 'customerId', customerId)
  }
  return e.next()
}, 'conversations')
