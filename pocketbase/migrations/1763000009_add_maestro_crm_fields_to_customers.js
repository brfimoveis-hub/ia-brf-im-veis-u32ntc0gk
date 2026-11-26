/// <reference path="../pb_data/types.d.ts" />
// MAESTRO × CRM — campos de enriquecimento de perfil na coleção customers.
// NÃO renomeia nem remove campos existentes: só ADICIONA os 4 campos do Maestro.
// Idempotente: cada campo só é adicionado se ainda não existir.

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('customers')

    function maestroHasField(col, name) {
      try {
        col.fields.getByName(name)
        return true
      } catch (_) {
        return false
      }
    }

    if (!maestroHasField(collection, 'maestro_temperature')) {
      collection.fields.add(
        new TextField({
          name: 'maestro_temperature',
          required: false,
          max: 20,
        }),
      )
    }

    if (!maestroHasField(collection, 'maestro_interest')) {
      collection.fields.add(
        new TextField({
          name: 'maestro_interest',
          required: false,
          max: 400,
        }),
      )
    }

    if (!maestroHasField(collection, 'maestro_needs_human')) {
      collection.fields.add(
        new BoolField({
          name: 'maestro_needs_human',
          required: false,
        }),
      )
    }

    if (!maestroHasField(collection, 'maestro_updated_at')) {
      collection.fields.add(
        new AutodateField({
          name: 'maestro_updated_at',
          onCreate: false,
          onUpdate: false,
        }),
      )
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('customers')
    const names = [
      'maestro_temperature',
      'maestro_interest',
      'maestro_needs_human',
      'maestro_updated_at',
    ]
    for (let i = 0; i < names.length; i++) {
      try {
        collection.fields.removeByName(names[i])
      } catch (_) {}
    }
    app.save(collection)
  },
)
