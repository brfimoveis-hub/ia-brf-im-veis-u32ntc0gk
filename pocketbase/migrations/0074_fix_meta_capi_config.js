migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('meta_pixel_id', '1522162279584545')
      user.set('meta_whatsapp_business_id', '950541937872426')
      user.set(
        'meta_capi_token',
        'EAAzbADOLSAoBRWEHCILX1hxOWcVQDeniCi2IihlZCOBQefwScDmfzsplrZCgY2cpjRw7Nn9t1AZCvaqa1aqUZBmZBoZAYyjE7QTS63DTExDD388fSJkZBpphOQcaG479O919fJ1efZAjd0eY6NV95MBgpvKvStOabBX2rVFbnoH1JIGMoZANodamAjD0tUXyZBUFK39gZDZD',
      )
      app.save(user)
    } catch (_) {}
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('meta_pixel_id', '')
      user.set('meta_whatsapp_business_id', '')
      user.set('meta_capi_token', '')
      app.save(user)
    } catch (_) {}
  },
)
