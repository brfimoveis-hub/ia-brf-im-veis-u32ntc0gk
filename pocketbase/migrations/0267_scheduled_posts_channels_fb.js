/// <reference path="../pb_data/types.d.ts" />
// v0.0.1406 — Módulo Posts: canais FB/IG, status cancelado, ids/permalinks por canal e tentativas.
// Idempotente: só aplica quando o campo/valor ainda não existe.
migrate(
  (app) => {
    let collection
    try {
      collection = app.findCollectionByNameOrId('scheduled_posts')
    } catch (_) {
      // Coleção ainda não existe (deploy em base nova): nada a fazer aqui,
      // a migração 0266 cria a base. Nada mais a alterar neste arquivo.
      return
    }

    function hasField(col, name) {
      try {
        col.fields.getByName(name)
        return true
      } catch (_) {
        return false
      }
    }

    // 1. Campo channels (json): lista de canais, ex. ["facebook","instagram"].
    //    maxSize obrigatório — sem ele o PocketBase grava com MaxSize 0 e rejeita valores.
    if (!hasField(collection, 'channels')) {
      collection.fields.add(
        new JSONField({
          name: 'channels',
          maxSize: 2000000,
          required: false,
        }),
      )
    }

    // 2. Status 'cancelado' entra no select de status
    try {
      const statusField = collection.fields.getByName('status')
      if (statusField && statusField.values && statusField.values.indexOf('cancelado') === -1) {
        statusField.values.push('cancelado')
      }
    } catch (_) {}

    // 3. Campos de resultado por canal + contador de tentativas
    if (!hasField(collection, 'fb_post_id')) {
      collection.fields.add(
        new TextField({
          name: 'fb_post_id',
          required: false,
        }),
      )
    }
    if (!hasField(collection, 'fb_permalink')) {
      collection.fields.add(
        new TextField({
          name: 'fb_permalink',
          required: false,
        }),
      )
    }
    if (!hasField(collection, 'ig_post_id')) {
      collection.fields.add(
        new TextField({
          name: 'ig_post_id',
          required: false,
        }),
      )
    }
    if (!hasField(collection, 'ig_permalink')) {
      collection.fields.add(
        new TextField({
          name: 'ig_permalink',
          required: false,
        }),
      )
    }
    if (!hasField(collection, 'attempt_count')) {
      collection.fields.add(
        new NumberField({
          name: 'attempt_count',
          required: false,
        }),
      )
    }

    app.save(collection)
  },
  (app) => {
    // Down: nada destrutivo — remove apenas o que este up adicionou, se possível.
    try {
      const col = app.findCollectionByNameOrId('scheduled_posts')
      try {
        col.fields.removeByName('channels')
      } catch (_) {}
      try {
        col.fields.removeByName('fb_post_id')
      } catch (_) {}
      try {
        col.fields.removeByName('fb_permalink')
      } catch (_) {}
      try {
        col.fields.removeByName('ig_post_id')
      } catch (_) {}
      try {
        col.fields.removeByName('ig_permalink')
      } catch (_) {}
      try {
        col.fields.removeByName('attempt_count')
      } catch (_) {}
      app.save(col)
    } catch (_) {}
  },
)
