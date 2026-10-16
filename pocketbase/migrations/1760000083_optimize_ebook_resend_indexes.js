migrate(
  (app) => {
    // Índices para acelerar a busca de clientes e conversas no reenvio de e-book e evitar context deadline exceeded
    try {
      app
        .db()
        .newQuery(
          'CREATE INDEX IF NOT EXISTS idx_conversations_customer_created ON conversations (customer_id, created DESC)',
        )
        .execute()
    } catch (e) {
      console.warn('[MIGRATION] idx_conversations_customer_created:', e.message)
    }

    try {
      app
        .db()
        .newQuery('CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone)')
        .execute()
    } catch (e) {
      console.warn('[MIGRATION] idx_customers_phone:', e.message)
    }

    try {
      app
        .db()
        .newQuery('CREATE INDEX IF NOT EXISTS idx_customers_updated ON customers (updated DESC)')
        .execute()
    } catch (e) {
      console.warn('[MIGRATION] idx_customers_updated:', e.message)
    }
  },
  (app) => {
    try {
      app.db().newQuery('DROP INDEX IF EXISTS idx_conversations_customer_created').execute()
      app.db().newQuery('DROP INDEX IF EXISTS idx_customers_phone').execute()
      app.db().newQuery('DROP INDEX IF EXISTS idx_customers_updated').execute()
    } catch (_) {}
  },
)
