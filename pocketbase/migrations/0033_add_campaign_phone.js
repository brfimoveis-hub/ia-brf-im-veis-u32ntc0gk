migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('meta_campaign_phone')) {
      col.fields.add(new TextField({ name: 'meta_campaign_phone' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('meta_campaign_phone')) {
      col.fields.removeByName('meta_campaign_phone')
    }
    app.save(col)
  },
)
