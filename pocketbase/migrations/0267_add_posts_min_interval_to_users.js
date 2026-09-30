/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    if (!usersCol.fields.getByName('posts_min_interval_minutes')) {
      usersCol.fields.add(
        new NumberField({
          name: 'posts_min_interval_minutes',
          min: 1,
          max: 1440,
          onlyInt: true,
          required: false,
        }),
      )
      app.save(usersCol)
    }

    // Atualizar usuário padrão (Mauro / brfimoveis) com 60 minutos se estiver vazio
    try {
      const records = app.findRecordsByFilter(
        'users',
        'posts_min_interval_minutes = null || posts_min_interval_minutes = 0',
        '',
        100,
        0,
      )
      for (let i = 0; i < records.length; i++) {
        records[i].set('posts_min_interval_minutes', 60)
        app.save(records[i])
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('users')
      const field = usersCol.fields.getByName('posts_min_interval_minutes')
      if (field) {
        usersCol.fields.removeByName('posts_min_interval_minutes')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)
