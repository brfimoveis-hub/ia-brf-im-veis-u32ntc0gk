migrate(
  (app) => {
    // Cria a coleção oauth_states para gerenciar states OAuth (CSRF) com segurança no backend
    // evitando perda por sessionStorage em mobile / webviews / redirects entre preview e produção.
    const collection = new Collection({
      name: 'oauth_states',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'state', type: 'text', required: true },
        { name: 'provider', type: 'text', required: false },
        { name: 'user_id', type: 'text', required: false },
        { name: 'origin', type: 'text', required: false },
        { name: 'redirect_uri', type: 'text', required: false },
        { name: 'consumed', type: 'bool', required: false },
        { name: 'expires_at', type: 'date', required: false },
        { name: 'metadata', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_oauth_states_state ON oauth_states (state)',
        'CREATE INDEX idx_oauth_states_created ON oauth_states (created)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('oauth_states')
    if (collection) {
      app.delete(collection)
    }
  },
)
