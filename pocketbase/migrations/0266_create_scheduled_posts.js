/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Criar coleção 'scheduled_posts'
    let collection
    try {
      collection = app.findCollectionByNameOrId('scheduled_posts')
    } catch (_) {
      const usersColId = '_pb_users_auth_'
      let launchesColId = null
      try {
        launchesColId = app.findCollectionByNameOrId('launches').id
      } catch (_) {}

      const fields = [
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'caption',
          type: 'text',
          required: false,
        },
        {
          name: 'images',
          type: 'file',
          maxSelect: 10,
          maxSize: 209715200, // 200 MB alinhado à cota da Bia
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        },
        {
          name: 'scheduled_at',
          type: 'date',
          required: false,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['rascunho', 'agendado', 'publicado', 'falhou'],
          maxSelect: 1,
        },
        {
          name: 'error_message',
          type: 'text',
          required: false,
        },
        {
          name: 'published_at',
          type: 'date',
          required: false,
        },
        {
          name: 'link_cta',
          type: 'text',
          required: false,
        },
        {
          name: 'created_by',
          type: 'text',
          required: false,
        },
        {
          name: 'meta_media_id',
          type: 'text',
          required: false,
        },
        {
          name: 'meta_permalink',
          type: 'text',
          required: false,
        },
        {
          name: 'image_urls',
          type: 'json',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ]

      if (launchesColId) {
        fields.splice(1, 0, {
          name: 'launch',
          type: 'relation',
          required: false,
          collectionId: launchesColId,
          cascadeDelete: false,
          maxSelect: 1,
        })
      }

      collection = new Collection({
        name: 'scheduled_posts',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: fields,
        indexes: [],
      })

      app.save(collection)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('scheduled_posts')
      app.delete(col)
    } catch (_) {}
  },
)
