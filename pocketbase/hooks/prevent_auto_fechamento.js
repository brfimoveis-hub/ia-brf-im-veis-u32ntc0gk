onRecordUpdate((e) => {
  const newStatus = e.record.getString('status')
  const oldStatus = e.record.original().getString('status')

  if (
    oldStatus !== newStatus &&
    (newStatus === 'Fechamento' || newStatus === 'Fechamento e Pós-Venda' || newStatus === 'closed')
  ) {
    let isManualUserAction = false
    try {
      const req = e.requestInfo()
      if (req && req.auth && req.auth.id) {
        isManualUserAction = true
      }
    } catch (_) {
      // No HTTP context -> triggered by background hook or webhook
    }

    if (!isManualUserAction) {
      e.record.set('status', oldStatus)
      $app
        .logger()
        .info(
          'Guardrail: Blocked automated AI transition to final stage',
          'customer_id',
          e.record.id,
          'attempted_status',
          newStatus,
        )
    }
  }
  return e.next()
}, 'customers')
