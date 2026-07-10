migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')

      user.set('website_url', 'https://www.brfimoveis.com.br')
      user.set('youtube_url', 'https://www.youtube.com/@brfimoveis')
      user.set('instagram_username', 'mauro.brfimoveis')

      user.set('meta_pixel_id', '1093869151209421')
      user.set('meta_dataset_id', '1093869151209421')

      app.saveNoValidate(user)
    } catch (_) {}
  },
  (app) => {},
)
