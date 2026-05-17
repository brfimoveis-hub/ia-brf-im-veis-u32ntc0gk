migrate(
  (app) => {
    try {
      const adminUser = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      adminUser.set(
        'meta_capi_token',
        'EAAzbADOLSAoBRXjom4ZBU8IcnwawnMTKoAS35uCTMGsNwkayBodUiQgWzZBYHA18tRLKrgrLHBHdZBcoUDvtZBwXP9zXabChlrGrUZAWwS8Rq0UvLZAYqVyNgv9ZBaBlJVnJuQjOZAz8idFev4W5epKY0V95Y84ZCOjxs6kLgzj6AvW2cnNk3kSiUbyISnxXcPC0RJgZDZD',
      )
      adminUser.set('meta_whatsapp_business_id', '27018364624521397')
      app.save(adminUser)
    } catch (e) {
      // Admin user not found, skip
    }
  },
  (app) => {
    try {
      const adminUser = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      adminUser.set('meta_capi_token', '')
      adminUser.set('meta_whatsapp_business_id', '')
      app.save(adminUser)
    } catch (e) {
      // skip
    }
  },
)
