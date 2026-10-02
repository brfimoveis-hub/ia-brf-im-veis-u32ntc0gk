migrate(
  (app) => {
    const cleanTitle = 'Área rural / Fazenda em São Joaquim - Rota das Vinícolas, 132 ha'

    // 1. Tenta atualizar via app.db().newQuery (SQL direto no SQLite)
    try {
      app
        .db()
        .newQuery(
          "UPDATE properties SET title = {:title} WHERE id = 's1uos1weufkwohy' OR code = 'ARU 341'",
        )
        .bind({ title: cleanTitle })
        .execute()
    } catch (sqlErr) {
      console.warn('Erro ao atualizar title via raw query SQLite: ' + sqlErr.message)
    }

    // 2. Fallback defensivo via Record API
    try {
      let record = null
      try {
        record = app.findRecordById('properties', 's1uos1weufkwohy')
      } catch (_) {}

      if (!record) {
        try {
          record = app.findFirstRecordByFilter(
            'properties',
            "code = 'ARU 341' || code ~ '341' || url ~ '/341/'",
          )
        } catch (_) {}
      }

      if (record) {
        record.set('title', cleanTitle)
        record.set('property_type', 'Rural / Fazenda')
        record.set('city', 'São Joaquim')
        record.set('code', 'ARU 341')
        record.set('is_active', true)
        app.save(record)
      }
    } catch (recErr) {
      console.warn('Erro ao atualizar title via Record API: ' + recErr.message)
    }
  },
  (app) => {},
)
