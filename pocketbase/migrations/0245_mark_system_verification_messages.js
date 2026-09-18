migrate(
  (app) => {
    // Atualiza mensagens existentes com códigos de verificação ou do remetente 447710173736
    // para sender = 'system' para preservar histórico sem poluir a lista de clientes.
    try {
      app
        .db()
        .newQuery(`
      UPDATE conversations 
      SET sender = 'system' 
      WHERE (
        content LIKE '%é o teu código do Instagram%' OR
        content LIKE '%código do Instagram%' OR
        content LIKE '%Não o partilhes%' OR
        customer_id IN (
          SELECT id FROM customers WHERE phone LIKE '%447710173736%' OR name LIKE '%Facebook Business%'
        )
      ) AND sender = 'customer'
    `)
        .execute()
    } catch (err) {
      console.log('[MIGRATION 0245] Notice on updating conversation sender:', err)
    }
  },
  (app) => {
    // down: no-op
  },
)
