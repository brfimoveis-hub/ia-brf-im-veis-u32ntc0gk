migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    const addField = (name) => {
      if (!usersCol.fields.getByName(name)) {
        usersCol.fields.add(new TextField({ name: name }))
      }
    }

    addField('meta_app_id')
    addField('meta_app_secret')
    addField('meta_dataset_id')
    addField('meta_offline_event_set_id')

    app.save(usersCol)

    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set(
        'meta_whatsapp_access_token',
        'EAATKh9qcDhYBRrpwqmEWYVhG3QTPEnZAZB7B1kIGNUkZBS06i5pfo6BQxtId9jZAH31vyrMQdUzSMgHtsFenOmz7HGy5HaNrnJMzbQh4hKjdqcPZBkOVitg4AdtEG4OPzvcSA1M1KZCmGinSRx1PZAReAl3NDbd7U2afRYZBYC1qrjMyPtJDZBcL5ZAbjCTZA8xWgZDZD',
      )
      user.set('meta_pixel_id', '1093869151209421')
      user.set(
        'meta_capi_token',
        'EAANCebjvTQABRkkO9wDjdGIPAITp3iGavT5Uck9VjXZBsR8eMipj0vU8llug21U8ZCjoyJq2oiZCeGuEsGEW3Oh9cIxCC7t9afcLG22j0XISfFZCq7TDHn3c9WnIAWsgDcsNgaZCRzsKiZC22L5ssZBHLwtEg3H0MVXQ2KnqZCOWDcNhAVP6HLDAuYXwlXB5twZDZD',
      )
      user.set('meta_whatsapp_status', 'active')
      user.set('meta_capi_status', 'active')
      user.set('meta_app_id', '1348584743898646')
      user.set('meta_app_secret', '25c9f2269da7b0a0aedcd640a5d8e6a0')
      user.set('meta_dataset_id', '1318084933157075')
      user.set('meta_offline_event_set_id', '1015065407564785')
      app.save(user)
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping user update')
    }
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    let changed = false

    const removeField = (name) => {
      if (usersCol.fields.getByName(name)) {
        usersCol.fields.removeByName(name)
        changed = true
      }
    }

    removeField('meta_app_id')
    removeField('meta_app_secret')
    removeField('meta_dataset_id')
    removeField('meta_offline_event_set_id')

    if (changed) {
      app.save(usersCol)
    }
  },
)
