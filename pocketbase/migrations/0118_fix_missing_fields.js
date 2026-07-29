migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'

    const convCol = app.findCollectionByNameOrId('conversations')
    if (!convCol.fields.getByName('user_id')) {
      convCol.fields.add(
        new RelationField({
          name: 'user_id',
          required: true,
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      app.save(convCol)

      try {
        let page = 0
        for (;;) {
          const convs = app.findRecordsByFilter('conversations', '', '-created', 500, page)
          if (!convs || convs.length === 0) break
          let touched = false
          for (const c of convs) {
            if (c.getString('user_id')) continue
            try {
              const custId = c.getString('customer_id')
              if (!custId) continue
              const cust = app.findRecordById('customers', custId)
              const uid = cust.getString('user_id')
              if (uid) {
                c.set('user_id', uid)
                app.saveNoValidate(c)
                touched = true
              }
            } catch (_) {}
          }
          if (convs.length < 500) break
          if (!touched) break
          page++
        }
      } catch (_) {}
    }

    const custCol = app.findCollectionByNameOrId('customers')
    let custChanged = false

    if (!custCol.fields.getByName('tags')) {
      custCol.fields.add(new TextField({ name: 'tags' }))
      custChanged = true
    }
    if (!custCol.fields.getByName('is_blocked')) {
      custCol.fields.add(new BoolField({ name: 'is_blocked' }))
      custChanged = true
    }
    if (!custCol.fields.getByName('phase')) {
      custCol.fields.add(new TextField({ name: 'phase' }))
      custChanged = true
    }

    if (custChanged) {
      try {
        custCol.addIndex('idx_customers_is_blocked', false, 'is_blocked', '')
      } catch (_) {}
      app.save(custCol)
    }
  },
  (app) => {
    try {
      const convCol = app.findCollectionByNameOrId('conversations')
      if (convCol.fields.getByName('user_id')) {
        convCol.removeField('user_id')
        app.save(convCol)
      }
    } catch (_) {}

    try {
      const custCol = app.findCollectionByNameOrId('customers')
      let changed = false
      if (custCol.fields.getByName('tags')) {
        custCol.removeField('tags')
        changed = true
      }
      if (custCol.fields.getByName('is_blocked')) {
        custCol.removeField('is_blocked')
        changed = true
      }
      if (custCol.fields.getByName('phase')) {
        custCol.removeField('phase')
        changed = true
      }
      if (changed) {
        try {
          custCol.removeIndex('idx_customers_is_blocked')
        } catch (_) {}
        app.save(custCol)
      }
    } catch (_) {}
  },
)
