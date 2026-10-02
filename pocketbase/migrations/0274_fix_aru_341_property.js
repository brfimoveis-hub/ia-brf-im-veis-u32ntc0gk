migrate(
  (app) => {
    try {
      const record = app.findRecordById('properties', 's1uos1weufkwohy')
      if (record) {
        record.set('title', 'Área Rural / Fazenda em São Joaquim - Rota das Vinícolas, 132 ha')
        record.set('property_type', 'Rural / Fazenda')
        record.set('city', 'São Joaquim')
        record.set('code', 'ARU 341')
        record.set('is_active', true)
        app.save(record)
      }
    } catch (err) {
      // Se não encontrou por ID exato, tenta localizar por code ~ 341
      try {
        const rec = app.findFirstRecordByFilter('properties', "code ~ '341' || url ~ '/341/'")
        if (rec) {
          rec.set('title', 'Área Rural / Fazenda em São Joaquim - Rota das Vinícolas, 132 ha')
          rec.set('property_type', 'Rural / Fazenda')
          rec.set('city', 'São Joaquim')
          rec.set('code', 'ARU 341')
          rec.set('is_active', true)
          app.save(rec)
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
