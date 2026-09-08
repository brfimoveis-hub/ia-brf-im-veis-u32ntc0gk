// Migration 0148: Registra sumário limpo nos logs
migrate(
  (app) => {
    const user = app.findRecordById('users', 'g5jto8bhulw01bz')
    user.set('meta_run_trigger', 'true')
    app.saveNoValidate(user)
  },
  (app) => {},
)
