migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('meta_whatsapp_business_id', '27018364624521397')
      record.set(
        'meta_whatsapp_access_token',
        'EAAzbADOLSAoBRXjom4ZBU8IcnwawnMTKoAS35uCTMGsNwkayBodUiQgWzZBYHA18tRLKrgrLHBHdZBcoUDvtZBwXP9zXabChlrGrUZAWwS8Rq0UvLZAYqVyNgv9ZBaBlJVnJuQjOZAz8idFev4W5epKY0V95Y84ZCOjxs6kLgzj6AvW2cnNk3kSiUbyISnxXcPC0RJgZDZD',
      )
      app.save(record)
    } catch (err) {
      // User not found, ignore
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      // Revert to empty or previous known state if possible, we'll just clear them here
      // for safety in rollback
      record.set('meta_whatsapp_business_id', '')
      record.set('meta_whatsapp_access_token', '')
      app.save(record)
    } catch (err) {
      // User not found, ignore
    }
  },
)
