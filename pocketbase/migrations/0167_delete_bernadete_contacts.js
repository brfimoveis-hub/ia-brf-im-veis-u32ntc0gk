migrate(
  (app) => {
    // IDs específicos identificados com Bernadete no nome pertencentes a Mauro (user_id = g5jto8bhulw01bz)
    const targetIds = [
      'egwnlsa1wyc07w3',
      'bqws72v8662tq6h',
      'ue8kx3no3u42jcc',
      't96o8wfrerxhzik',
      'heq3ry1hzciohfe',
      'nnafw31n9k77vo8',
      '0p901ceo2lfw66l',
      '9i11d6pusd93rnd',
      '5fsq5ivk1c7jdxl',
      'b8of6crxblk4fjz',
      'gze6za9tw2hs5pn',
    ]

    let deletedCustomersCount = 0
    let deletedConversationsCount = 0
    let deletedDeliveriesCount = 0

    // 1. Processar os IDs específicos garantindo segurança extra (checar se nome contém Bernadete)
    for (const id of targetIds) {
      let record = null
      try {
        record = app.findRecordById('customers', id)
      } catch (_) {
        // Registro já não existe ou foi removido
        continue
      }

      if (!record) continue

      const name = (record.get('name') || '').toLowerCase()
      // Verificação extra de segurança: só deletar se contiver bernadete
      if (!name.includes('bernadete')) {
        console.log(
          `[MIGRATION_0167] Pular registro ${id} porque nome não contém 'Bernadete': ${name}`,
        )
        continue
      }

      // Deletar conversas vinculadas se houver
      try {
        const conversations = app.findRecordsByFilter(
          'conversations',
          `customer_id = '${id}'`,
          '-created',
          500,
          0,
        )
        for (const conv of conversations) {
          app.delete(conv)
          deletedConversationsCount++
        }
      } catch (err) {
        console.log(`[MIGRATION_0167] Erro ao buscar conversas para customer ${id}:`, err)
      }

      // Deletar email_deliveries vinculadas se houver
      try {
        const deliveries = app.findRecordsByFilter(
          'email_deliveries',
          `customer_id = '${id}'`,
          '-created',
          500,
          0,
        )
        for (const deliv of deliveries) {
          app.delete(deliv)
          deletedDeliveriesCount++
        }
      } catch (err) {
        console.log(`[MIGRATION_0167] Erro ao buscar email_deliveries para customer ${id}:`, err)
      }

      // Deletar o customer
      try {
        app.delete(record)
        deletedCustomersCount++
        console.log(`[MIGRATION_0167] Cliente removido com sucesso: ${id} - ${record.get('name')}`)
      } catch (delErr) {
        console.log(`[MIGRATION_0167] Falha ao deletar cliente ${id}:`, delErr)
      }
    }

    // 2. Verificação defensiva extra: buscar se restou algum registro com 'Bernadete' na coleção customers
    try {
      const remainingBernadete = app.findRecordsByFilter(
        'customers',
        "name ~ 'Bernadete'",
        '-created',
        500,
        0,
      )
      for (const rec of remainingBernadete) {
        const n = (rec.get('name') || '').toLowerCase()
        if (n.includes('bernadete')) {
          // Deletar conversas vinculadas
          try {
            const convs = app.findRecordsByFilter(
              'conversations',
              `customer_id = '${rec.id}'`,
              '-created',
              500,
              0,
            )
            for (const c of convs) {
              app.delete(c)
              deletedConversationsCount++
            }
          } catch (_) {}

          // Deletar email_deliveries vinculadas
          try {
            const dels = app.findRecordsByFilter(
              'email_deliveries',
              `customer_id = '${rec.id}'`,
              '-created',
              500,
              0,
            )
            for (const d of dels) {
              app.delete(d)
              deletedDeliveriesCount++
            }
          } catch (_) {}

          app.delete(rec)
          deletedCustomersCount++
          console.log(`[MIGRATION_0167] Cliente residual removido: ${rec.id} - ${rec.get('name')}`)
        }
      }
    } catch (filterErr) {
      console.log('[MIGRATION_0167] Erro na verificação defensiva de customers:', filterErr)
    }

    console.log(
      `[MIGRATION_0167] Finalizado: ${deletedCustomersCount} contatos da Bernadete removidos, ${deletedConversationsCount} conversas removidas, ${deletedDeliveriesCount} deliveries removidas.`,
    )
  },
  (app) => {
    // Revert is a no-op (deleted contacts cannot be restored automatically)
  },
)
