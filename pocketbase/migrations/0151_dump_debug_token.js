// Migration 0151: Testa debug_token isolado
migrate(
  (app) => {
    const user = app.findRecordById('users', 'g5jto8bhulw01bz')
    user.set('meta_dump_debug', 'true')
    app.saveNoValidate(user)
  },
  (app) => {},
)
