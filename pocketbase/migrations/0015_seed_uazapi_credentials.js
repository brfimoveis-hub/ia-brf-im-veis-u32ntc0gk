migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      let changed = false

      if (!record.getString('uazapi_domain')) {
        record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
        changed = true
      }

      if (!record.getString('uazapi_token')) {
        record.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
        changed = true
      }

      if (!record.getString('meta_campaign_phone')) {
        record.set('meta_campaign_phone', '5548992098050')
        changed = true
      }

      if (changed) {
        app.save(record)
      }
    } catch (_) {
      // Ignore if user is not found
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('uazapi_domain', '')
      record.set('uazapi_token', '')
      app.save(record)
    } catch (_) {}
  },
)
