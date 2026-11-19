// v0.0.1424 — cria os campos meta_messenger_page_id e meta_messenger_page_name
// na coleção users. A tela /settings/connections (MetaMessengerPageConnect)
// lê user.meta_messenger_page_id / meta_messenger_page_name para exibir
// "Página conectada"; o hook meta_messenger_save_and_subscribe agora persiste
// esses campos junto com o page token (antes, só o token era salvo e o campo
// da tela ficava sempre em branco). Idempotente: só cria se não existir.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const existing = users.fields.map((f) => f.name)
    if (!existing.includes('meta_messenger_page_id')) {
      users.fields.add(new Field({ type: 'text', name: 'meta_messenger_page_id' }))
    }
    if (!existing.includes('meta_messenger_page_name')) {
      users.fields.add(new Field({ type: 'text', name: 'meta_messenger_page_name' }))
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('meta_messenger_page_id')
    users.fields.removeByName('meta_messenger_page_name')
    app.save(users)
  },
)
