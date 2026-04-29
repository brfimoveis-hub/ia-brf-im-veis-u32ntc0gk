migrate(
  (app) => {
    const users = app.findRecordsByFilter('_pb_users_auth_', "meta_token_status = ''", '', 1000, 0)
    for (let i = 0; i < users.length; i++) {
      users[i].set('meta_token_status', 'unknown')
      app.saveNoValidate(users[i])
    }
  },
  (app) => {
    // Revert is not required for this operation
  },
)
