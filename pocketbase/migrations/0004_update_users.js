migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')

    const addField = (field) => {
      if (!col.fields.getByName(field.name)) {
        col.fields.add(field)
      }
    }

    addField(new TextField({ name: 'meta_pixel_id' }))
    addField(new TextField({ name: 'meta_test_event_code' }))
    addField(new TextField({ name: 'meta_capi_token' }))
    addField(new TextField({ name: 'meta_campaign_phone' }))
    addField(new JSONField({ name: 'meta_tags_list' }))
    addField(new TextField({ name: 'ai_instructions' }))
    addField(new TextField({ name: 'ai_name' }))
    addField(new TextField({ name: 'ai_voice_id' }))
    addField(
      new FileField({
        name: 'ai_avatar',
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    )
    addField(new TextField({ name: 'meta_token_status' }))
    addField(new TextField({ name: 'meta_last_validated' }))

    app.save(col)
  },
  (app) => {
    // Safe to leave empty, downgrading user fields usually not required
  },
)
