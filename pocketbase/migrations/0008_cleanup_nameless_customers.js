migrate(
  (app) => {
    app
      .db()
      .newQuery(`
    DELETE FROM customers 
    WHERE name IS NULL OR TRIM(name) = ''
  `)
      .execute()
  },
  (app) => {
    // It's not possible to reliably restore deleted customers without a backup.
  },
)
