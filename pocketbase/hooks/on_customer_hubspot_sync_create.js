onRecordAfterCreateSuccess((e) => {
  const record = e.record

  try {
    const logsCol = $app.findCollectionByNameOrId('system_logs')
    const logRecord = new Record(logsCol)
    logRecord.set('type', 'hubspot_crm_sync')
    logRecord.set('message', `Lead synced to HubSpot CRM (Mock)`)
    logRecord.set('details', {
      action: 'create',
      hubspot_endpoint: 'https://api.hubapi.com/crm/v3/objects/contacts',
      source: 'IA_Mae',
      deal_info: 'Villa dos Açores',
    })
    logRecord.set('payload', {
      email: record.getString('email'),
      phone: record.getString('phone'),
      name: record.getString('name'),
      lead_source: 'IA_Mae',
      status: record.getString('status'),
    })

    $app.saveNoValidate(logRecord)
  } catch (err) {
    $app.logger().error('HubSpot Sync Error', err)
  }

  return e.next()
}, 'customers')
