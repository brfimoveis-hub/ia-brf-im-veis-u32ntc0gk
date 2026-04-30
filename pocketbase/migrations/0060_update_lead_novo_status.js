migrate(
  (app) => {
    app
      .db()
      .newQuery(`
    UPDATE customers 
    SET status = 'Base de Clientes/Novo LYD' 
    WHERE status = 'Lead Novo' OR status = 'novo' OR status = 'lead novo' OR status = '' OR status IS NULL
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE cadences 
    SET title = 'Base de Clientes/Novo LYD' 
    WHERE title = 'Lead Novo' OR title = 'novo' OR title = 'lead novo'
  `)
      .execute()
  },
  (app) => {
    app
      .db()
      .newQuery(`
    UPDATE customers 
    SET status = 'Lead Novo' 
    WHERE status = 'Base de Clientes/Novo LYD'
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE cadences 
    SET title = 'Lead Novo' 
    WHERE title = 'Base de Clientes/Novo LYD'
  `)
      .execute()
  },
)
