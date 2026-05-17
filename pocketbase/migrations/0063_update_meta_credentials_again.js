migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter('users', "email != ''", '', 100, 0)
      for (const record of records) {
        record.set('meta_whatsapp_business_id', '27018364624521397')
        record.set(
          'meta_whatsapp_access_token',
          'EAAzbADOLSAoBRRlCoR1eyBYg4OlOdZCiNPO3uF4vP8NIeUtueSZAAs3O0RaI32WcVVQL54ZAGuKvxuGJINgy3CaLSAVN2eTUgSgEhXUakbDw9NLZBsQmIfI0nhjYAY9WLVafyMyPjfNfkUqN7kVQ2Ki4IFesbmitTnMXPDicToBABpshUBOm3qbTQaxKPJwtNwZDZD',
        )
        app.save(record)
      }
    } catch (e) {
      console.log(e)
    }
  },
  (app) => {},
)
