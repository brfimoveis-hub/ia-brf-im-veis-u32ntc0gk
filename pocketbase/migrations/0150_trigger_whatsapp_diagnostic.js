// Migration 0150: Dispara hook de diagnóstico do WhatsApp
migrate(
  (app) => {
    const user = app.findRecordById('users', 'g5jto8bhulw01bz')
    user.set('meta_run_trigger', 'true')
    app.saveNoValidate(user)
  },
  (app) => {},
)
