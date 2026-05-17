migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_whatsapp_business_id', '27018364624521397')
      user.set(
        'meta_whatsapp_access_token',
        'EAAzbADOLSAoBRRlCoR1eyBYg4OlOdZCiNPO3uF4vP8NIeUtueSZAAs3O0RaI32WcVVQL54ZAGuKvxuGJINgy3CaLSAVN2eTUgSgEhXUakbDw9NLZBsQmIfI0nhjYAY9WLVafyMyPjfNfkUqN7kVQ2Ki4IFesbmitTnMXPDicToBABpshUBOm3qbTQaxKPJwtNwZDZD',
      )
      app.save(user)
    } catch (err) {
      // Ignore if the user does not exist
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_whatsapp_business_id', '')
      user.set('meta_whatsapp_access_token', '')
      app.save(user)
    } catch (err) {
      // Ignore if the user does not exist
    }
  },
)
