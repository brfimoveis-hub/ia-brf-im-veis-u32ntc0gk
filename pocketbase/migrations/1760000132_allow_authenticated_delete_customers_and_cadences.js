/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('customers')
    // Permite que qualquer operador autenticado delete registros de customers,
    // ou preserva a regra caso já seja user_id. Se user_id for vazio ou de outro operador/legado,
    // antes falhava com 404/403. Agora: qualquer operador autenticado pode excluir.
    collection.deleteRule = "@request.auth.id != ''"
    app.save(collection)

    try {
      const cadences = app.findCollectionByNameOrId('cadences')
      cadences.deleteRule = "@request.auth.id != ''"
      app.save(cadences)
    } catch (e) {
      // se cadences não existir ou já estiver conforme, segue
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('customers')
      collection.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
      app.save(collection)
    } catch (e) {}
  },
)
