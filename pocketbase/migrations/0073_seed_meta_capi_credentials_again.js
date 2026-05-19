migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')

      user.set('meta_whatsapp_business_id', '950541937872426')
      user.set('meta_pixel_id', '1522162279584545')
      user.set(
        'meta_capi_token',
        'EAAzbADOLSAoBRWEHCILX1hxOWcVQDeniCi2IihlZCOBQefwScDmfzsplrZCgY2cpjRw7Nn9t1AZCvaqa1aqUZBmZBoZAYyjE7QTS63DTExDD388fSJkZBpphOQcaG479O919fJ1efZAjd0eY6NV95MBgpvKvStOabBX2rVFbnoH1JIGMoZANodamAjD0tUXyZBUFK39gZDZD',
      )

      app.save(user)
    } catch (_) {
      // skip if not found
    }
  },
  (app) => {
    // no-op down
  },
)
