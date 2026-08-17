migrate(
  (app) => {
    try {
      const user = app.findRecordById('users', 'g5jto8bhulw01bz')
      user.set('meta_app_id', '514693609145444')
      user.set('meta_app_secret', 'd085b85d8d534c682f60b6bde8043610')
      app.save(user)
    } catch (err) {
      console.log('User g5jto8bhulw01bz not found, skipping meta app credentials update')
    }
  },
  (app) => {
    try {
      const user = app.findRecordById('users', 'g5jto8bhulw01bz')
      user.set('meta_app_id', '1348584743898646')
      user.set('meta_app_secret', '25c9f2269da7b0a0aedcd640a5d8e6a0')
      app.save(user)
    } catch (err) {
      console.log('User g5jto8bhulw01bz not found, skipping meta app credentials revert')
    }
  },
)
