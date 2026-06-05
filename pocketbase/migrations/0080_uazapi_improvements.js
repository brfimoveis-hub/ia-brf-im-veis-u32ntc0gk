migrate(
  (app) => {
    // Update all existing user records to trim whitespace from uazapi fields
    const users = app.findRecordsByFilter(
      '_pb_users_auth_',
      "uazapi_domain != '' || uazapi_instance_number != '' || uazapi_token != '' || uazapi_admin_token != ''",
      '',
      1000,
      0,
    )
    for (const user of users) {
      let changed = false
      const domain = user.getString('uazapi_domain')
      const instance = user.getString('uazapi_instance_number')
      const token = user.getString('uazapi_token')
      const adminToken = user.getString('uazapi_admin_token')

      if (domain && domain !== domain.trim()) {
        user.set('uazapi_domain', domain.trim())
        changed = true
      }
      if (instance && instance !== instance.trim()) {
        user.set('uazapi_instance_number', instance.trim())
        changed = true
      }
      if (token && token !== token.trim()) {
        user.set('uazapi_token', token.trim())
        changed = true
      }
      if (adminToken && adminToken !== adminToken.trim()) {
        user.set('uazapi_admin_token', adminToken.trim())
        changed = true
      }

      if (changed) {
        app.saveNoValidate(user)
      }
    }
  },
  (app) => {
    // No down migration needed for data sanitization
  },
)
