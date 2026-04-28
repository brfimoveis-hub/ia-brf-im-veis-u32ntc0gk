migrate(
  (app) => {
    const users = app.findRecordsByFilter('users', '1=1', '', 1000, 0)
    for (const user of users) {
      if (
        !user.getString('meta_token_status') &&
        (user.getString('meta_capi_token') || user.getString('meta_pixel_id'))
      ) {
        user.set('meta_token_status', 'untested')
        app.saveNoValidate(user)
      }
    }
  },
  (app) => {
    // No down action needed
  },
)
