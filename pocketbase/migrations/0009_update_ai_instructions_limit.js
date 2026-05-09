migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new TextField({
        name: 'ai_instructions',
        max: 300000,
      }),
    )
    app.save(users)

    const cadences = app.findCollectionByNameOrId('cadences')
    cadences.fields.add(
      new TextField({
        name: 'ai_instructions',
        max: 300000,
      }),
    )
    app.save(cadences)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new TextField({
        name: 'ai_instructions',
        max: 100000,
      }),
    )
    app.save(users)

    const cadences = app.findCollectionByNameOrId('cadences')
    cadences.fields.add(
      new TextField({
        name: 'ai_instructions',
        max: 100000,
      }),
    )
    app.save(cadences)
  },
)
