onRecordAfterUpdateSuccess((e) => {
  const status = e.record.getString('status')
  if (status !== 'sent') return e.next()
  const oldStatus = e.record.original().getString('status')
  if (oldStatus === 'sent') return e.next()
  const customerId = e.record.getString('customer_id')
  if (!customerId) return e.next()
  try {
    const customer = $app.findRecordById('customers', customerId)
    customer.set('last_sent_at', new Date().toISOString())
    $app.saveNoValidate(customer)
  } catch (err) {
    $app
      .logger()
      .error('failed to update last_sent_at from email delivery', 'customerId', customerId)
  }
  return e.next()
}, 'email_deliveries')
