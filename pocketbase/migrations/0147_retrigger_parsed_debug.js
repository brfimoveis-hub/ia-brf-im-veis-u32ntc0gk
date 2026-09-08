// Migration 0147: Re-dispara para gravar campos parsed do debug_token
migrate(
  (app) => {
    const user = app.findRecordById('users', 'g5jto8bhulw01bz')
    user.set('meta_run_trigger', 'true')
    app.saveNoValidate(user)
  },
  (app) => {},
)
