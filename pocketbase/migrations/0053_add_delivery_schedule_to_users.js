migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    if (!col.fields.getByName('delivery_enabled')) {
      col.fields.add(new BoolField({ name: 'delivery_enabled' }))
    }
    if (!col.fields.getByName('delivery_start_time')) {
      col.fields.add(new TextField({ name: 'delivery_start_time' }))
    }
    if (!col.fields.getByName('delivery_end_time')) {
      col.fields.add(new TextField({ name: 'delivery_end_time' }))
    }
    if (!col.fields.getByName('delivery_interval')) {
      col.fields.add(new NumberField({ name: 'delivery_interval' }))
    }
    if (!col.fields.getByName('delivery_days')) {
      col.fields.add(new JSONField({ name: 'delivery_days' }))
    }

    app.save(col)

    try {
      app
        .db()
        .newQuery(`
      UPDATE users SET 
        delivery_enabled = true,
        delivery_start_time = '08:00',
        delivery_end_time = '18:00',
        delivery_interval = 5,
        delivery_days = '["monday","tuesday","wednesday","thursday","friday"]'
      WHERE delivery_start_time = '' OR delivery_start_time IS NULL
    `)
        .execute()
    } catch (err) {
      console.log('Error updating default values', err)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('delivery_enabled')
    col.fields.removeByName('delivery_start_time')
    col.fields.removeByName('delivery_end_time')
    col.fields.removeByName('delivery_interval')
    col.fields.removeByName('delivery_days')
    app.save(col)
  },
)
