migrate(
  (app) => {
    const convCol = app.findCollectionByNameOrId('conversations')
    if (!convCol.fields.getByName('channel')) {
      convCol.fields.add(
        new SelectField({
          name: 'channel',
          values: ['whatsapp', 'messenger', 'instagram'],
          maxSelect: 1,
        }),
      )
    }
    app.save(convCol)

    app
      .db()
      .newQuery(
        "UPDATE conversations SET channel = 'whatsapp' WHERE channel IS NULL OR channel = ''",
      )
      .execute()

    const usersCol = app.findCollectionByNameOrId('users')
    if (!usersCol.fields.getByName('meta_instagram_business_id')) {
      usersCol.fields.add(new TextField({ name: 'meta_instagram_business_id' }))
    }
    if (!usersCol.fields.getByName('meta_instagram_page_token')) {
      usersCol.fields.add(new TextField({ name: 'meta_instagram_page_token' }))
    }
    if (!usersCol.fields.getByName('meta_page_access_token')) {
      usersCol.fields.add(new TextField({ name: 'meta_page_access_token' }))
    }
    app.save(usersCol)
  },
  (app) => {
    const convCol = app.findCollectionByNameOrId('conversations')
    convCol.fields.removeByName('channel')
    app.save(convCol)

    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.fields.removeByName('meta_instagram_business_id')
    usersCol.fields.removeByName('meta_instagram_page_token')
    usersCol.fields.removeByName('meta_page_access_token')
    app.save(usersCol)
  },
)
