migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('uazapi_status', '')
      record.set('uazapi_error', '')
      record.set('uazapi_domain', '')
      record.set('uazapi_token', '')
      record.set('uazapi_admin_token', '')
      record.set('uazapi_instance_number', '')
      app.save(record)
    } catch (_) {
      // Record might not exist in some environments, skip safely
    }
  },
  (app) => {
    // Irreversible reset, no action needed for downgrade
  },
)
