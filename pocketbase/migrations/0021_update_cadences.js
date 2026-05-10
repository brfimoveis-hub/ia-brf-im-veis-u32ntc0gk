migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cadences')
    if (!col.fields.getByName('order')) {
      col.fields.add(new NumberField({ name: 'order', min: 0 }))
    }
    if (!col.fields.getByName('user_id')) {
      col.fields.add(
        new RelationField({ name: 'user_id', collectionId: '_pb_users_auth_', maxSelect: 1 }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cadences')
    if (col.fields.getByName('order')) {
      col.fields.removeByName('order')
    }
    if (col.fields.getByName('user_id')) {
      col.fields.removeByName('user_id')
    }
    app.save(col)
  },
)
