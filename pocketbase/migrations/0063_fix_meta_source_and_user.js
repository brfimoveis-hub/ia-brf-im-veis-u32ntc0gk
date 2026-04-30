migrate(
  (app) => {
    // 1. Ensure brfimoveis@gmail.com has initialized fields if empty
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      let changed = false
      if (!user.getString('meta_pixel_id')) {
        user.set('meta_pixel_id', '1522162279584545')
        changed = true
      }
      if (changed) {
        app.saveNoValidate(user)
      }
    } catch (_) {}

    // 2. Correct any existing customers with source starting with "Meta " to exactly "Meta"
    app
      .db()
      .newQuery(`
    UPDATE customers 
    SET source = 'Meta' 
    WHERE source LIKE 'Meta%' OR source = 'Instagram' OR source IS NULL OR source = ''
  `)
      .execute()
  },
  (app) => {
    // Data normalization is permanent, no down required
  },
)
