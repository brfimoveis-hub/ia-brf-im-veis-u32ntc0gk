migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('ai_name')) {
      users.fields.add(new TextField({ name: 'ai_name' }))
    }

    // Set Max Length to 400,000 to match the application limits
    users.fields.add(new TextField({ name: 'bia_instructions', max: 400000 }))
    users.fields.add(new TextField({ name: 'ai_instructions', max: 400000 }))

    if (!users.fields.getByName('ai_voice_id')) {
      users.fields.add(new TextField({ name: 'ai_voice_id' }))
    }
    if (!users.fields.getByName('ai_avatar')) {
      users.fields.add(
        new FileField({
          name: 'ai_avatar',
          maxSelect: 1,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
        }),
      )
    }
    if (!users.fields.getByName('ai_knowledge_files')) {
      users.fields.add(
        new FileField({ name: 'ai_knowledge_files', maxSelect: 10, maxSize: 52428800 }),
      )
    }

    // Restore Website, Instagram and Youtube fields
    if (!users.fields.getByName('website_url')) {
      users.fields.add(new TextField({ name: 'website_url' }))
    }
    if (!users.fields.getByName('instagram_username')) {
      users.fields.add(new TextField({ name: 'instagram_username' }))
    }
    if (!users.fields.getByName('youtube_url')) {
      users.fields.add(new TextField({ name: 'youtube_url' }))
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    users.fields.removeByName('website_url')
    users.fields.removeByName('instagram_username')
    users.fields.removeByName('youtube_url')

    app.save(users)
  },
)
