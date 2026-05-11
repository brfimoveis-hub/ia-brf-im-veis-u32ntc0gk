migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    if (!col.fields.getByName('meta_whatsapp_business_id')) {
      col.fields.add(new TextField({ name: 'meta_whatsapp_business_id' }))
    }
    if (!col.fields.getByName('meta_whatsapp_phone_number_id')) {
      col.fields.add(new TextField({ name: 'meta_whatsapp_phone_number_id' }))
    }
    if (!col.fields.getByName('meta_whatsapp_access_token')) {
      col.fields.add(new TextField({ name: 'meta_whatsapp_access_token' }))
    }
    if (!col.fields.getByName('meta_whatsapp_verify_token')) {
      col.fields.add(new TextField({ name: 'meta_whatsapp_verify_token' }))
    }
    if (!col.fields.getByName('meta_whatsapp_status')) {
      col.fields.add(new TextField({ name: 'meta_whatsapp_status' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    if (col.fields.getByName('meta_whatsapp_business_id')) {
      col.fields.removeByName('meta_whatsapp_business_id')
    }
    if (col.fields.getByName('meta_whatsapp_phone_number_id')) {
      col.fields.removeByName('meta_whatsapp_phone_number_id')
    }
    if (col.fields.getByName('meta_whatsapp_access_token')) {
      col.fields.removeByName('meta_whatsapp_access_token')
    }
    if (col.fields.getByName('meta_whatsapp_verify_token')) {
      col.fields.removeByName('meta_whatsapp_verify_token')
    }
    if (col.fields.getByName('meta_whatsapp_status')) {
      col.fields.removeByName('meta_whatsapp_status')
    }

    app.save(col)
  },
)
