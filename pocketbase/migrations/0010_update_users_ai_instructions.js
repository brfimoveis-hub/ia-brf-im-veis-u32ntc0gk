migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (usersCol) {
      const aiField = usersCol.fields.getByName('ai_instructions')
      if (aiField) {
        aiField.max = 300000
      } else {
        usersCol.fields.add(new TextField({ name: 'ai_instructions', max: 300000 }))
      }
      app.save(usersCol)
    }

    const cadencesCol = app.findCollectionByNameOrId('cadences')
    if (cadencesCol) {
      const aiField = cadencesCol.fields.getByName('ai_instructions')
      if (aiField) {
        aiField.max = 300000
      } else {
        cadencesCol.fields.add(new TextField({ name: 'ai_instructions', max: 300000 }))
      }
      app.save(cadencesCol)
    }
  },
  (app) => {
    // Revert logic is omitted as increasing constraints generally shouldn't be reverted destructively
  },
)
