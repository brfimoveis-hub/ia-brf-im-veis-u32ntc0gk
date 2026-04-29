migrate(
  (app) => {
    const users = app.findRecordsByFilter('_pb_users_auth_', "email != ''", '', 100, 0)
    for (const user of users) {
      user.set(
        'meta_capi_token',
        'EAAzbADOLSAoBRRlCoR1eyBYg4OlOdZCiNPO3uF4vP8NIeUtueSZAAs3O0RaI32WcVVQL54ZAGuKvxuGJINgy3CaLSAVN2eTUgSgEhXUakbDw9NLZBsQmIfI0nhjYAY9WLVafyMyPjfNfkUqN7kVQ2Ki4IFesbmitTnMXPDicToBABpshUBOm3qbTQaxKPJwtNwZDZD',
      )
      user.set('meta_token_status', 'untested')
      app.saveNoValidate(user)
    }
  },
  (app) => {
    // down migration not needed
  },
)
