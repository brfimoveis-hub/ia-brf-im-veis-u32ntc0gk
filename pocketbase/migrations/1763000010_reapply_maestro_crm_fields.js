/// <reference path="../pb_data/types.d.ts" />
// MAESTRO × CRM — garante os 4 campos de enriquecimento na coleção customers.
// Idempotente de verdade: embora a migration 1763000009 já tenha o MESMO nome de campos,
// o schema live da instância não os recebeu (histórico marcou como aplicada) — esta
// migration reexecuta a adição. Não renomeia nem remove nada: só adiciona o que falta.

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
        new DateField({
          name: 'maestro_updated_at',
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
