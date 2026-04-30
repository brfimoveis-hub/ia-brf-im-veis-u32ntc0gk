migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      // Clear the current avatar to allow the new professional default UI fallback to display,
      // since we avoid downloading external stock URLs directly in migrations.
      record.set('ai_avatar', null)
      if (!record.get('ai_name')) {
        record.set('ai_name', 'Bia')
      }
      app.save(record)
    } catch (_) {}
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      record.set('ai_avatar', null)
      app.save(record)
    } catch (_) {}
  },
)
