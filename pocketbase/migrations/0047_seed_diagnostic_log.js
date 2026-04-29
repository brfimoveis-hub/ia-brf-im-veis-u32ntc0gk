migrate(
  (app) => {
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')

      const record = new Record(logsCol)
      record.set('user_id', adminUser.id)
      record.set('type', 'diagnostic')
      record.set('message', 'Diagnostic system upgraded')
      record.set(
        'details',
        'Meta CAPI deep-scan with debug_token and scope verification deployed successfully.',
      )
      record.set('payload', {
        version: '2.0',
        scopes_checked: ['ads_read', 'whatsapp_business_management'],
      })

      app.save(record)
    } catch (err) {
      console.log('Could not seed diagnostic log:', err)
    }
  },
  (app) => {},
)
