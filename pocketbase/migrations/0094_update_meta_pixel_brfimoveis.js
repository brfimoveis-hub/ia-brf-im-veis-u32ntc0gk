migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_pixel_id', '4391651051078163')
      app.save(user)
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping user update')
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_pixel_id', '1093869151209421') // Revert to the value from migration 0093
      app.save(user)
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping user revert')
    }
  },
)
