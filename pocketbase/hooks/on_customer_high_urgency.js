onRecordAfterUpdateSuccess((e) => {
  const urgency = e.record.getInt('urgency')
  const originalUrgency = e.record.original().getInt('urgency')

  if (urgency >= 4 && originalUrgency < 4) {
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('type', 'notification')
      logRecord.set('message', 'Lead de Alta Urgência Identificado')
      logRecord.set(
        'details',
        `O lead ${e.record.getString('name') || e.record.getString('phone')} foi qualificado pela BIA com urgência ${urgency}. Requer atenção de um corretor humano imediatamente.`,
      )
      logRecord.set('payload', {
        customer_id: e.record.id,
        urgency: urgency,
        neighborhood: e.record.getString('neighborhood'),
        price_range: e.record.getString('price_range'),
      })
      $app.saveNoValidate(logRecord)
    } catch (err) {
      $app.logger().error('Failed to create high urgency log', err)
    }
  }

  e.next()
}, 'customers')
