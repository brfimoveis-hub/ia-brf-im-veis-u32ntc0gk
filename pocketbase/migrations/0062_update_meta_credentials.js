migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('meta_whatsapp_business_id', '27018364624521397')
      record.set(
        'meta_whatsapp_access_token',
        'EAAzbADOLSAoBRRlCoR1eyBYg4OlOdZCiNPO3uF4vP8NIeUtueSZAAs3O0RaI32WcVVQL54ZAGuKvxuGJINgy3CaLSAVN2eTUgSgEhXUakbDw9NLZBsQmIfI0nhjYAY9WLVafyMyPjfNfkUqN7kVQ2Ki4IFesbmitTnMXPDicToBABpshUBOm3qbTQaxKPJwtNwZDZD',
      )
      record.set('meta_whatsapp_status', 'connected')
      app.save(record)
    } catch (_) {
      // skip if user doesn't exist
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('meta_whatsapp_business_id', '')
      record.set('meta_whatsapp_access_token', '')
      record.set('meta_whatsapp_status', '')
      app.save(record)
    } catch (_) {}
  },
)
