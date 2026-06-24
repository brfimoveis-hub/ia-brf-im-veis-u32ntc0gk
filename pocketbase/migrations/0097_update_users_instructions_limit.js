migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    users.fields.add(
      new TextField({
        name: 'ai_instructions',
        max: 200000,
      }),
    )

    users.fields.add(
      new TextField({
        name: 'bia_instructions',
        max: 200000,
      }),
    )

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    users.fields.add(
      new TextField({
        name: 'ai_instructions',
        max: 0,
      }),
    )

    users.fields.add(
      new TextField({
        name: 'bia_instructions',
        max: 0,
      }),
    )

    app.save(users)
  },
)
