migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_instance_number', '554892098050')
      user.set('uazapi_token', 'd40df49e-bcbe-4729-9a71-291527eaa812')
      user.set('uazapi_admin_token', 'd40df49e-bcbe-4729-9a71-291527eaa812')
      user.set('uazapi_error', '')
      user.set('meta_pixel_id', '950541937872426')
      user.set('meta_dataset_id', '950541937872426')
      user.set('meta_capi_error', '')
      app.saveNoValidate(user)
    } catch (_) {}
  },
  (app) => {},
)
