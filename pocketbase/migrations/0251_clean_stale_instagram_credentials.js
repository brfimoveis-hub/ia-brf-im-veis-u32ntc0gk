migrate(
  (app) => {
    const user = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
    if (!user) return

    // Limpa tokens de página e business id obsoletos herdados do app antigo deletado
    // O meta_instagram_user_token é mantido intacto pois foi emitido pelo novo OAuth!
    user.set('meta_instagram_page_token', '')
    user.set('meta_page_access_token', '')
    user.set('meta_instagram_business_id', '')

    app.saveNoValidate(user)

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const r = new Record(logsCol)
    r.set('user_id', user.id)
    r.set('type', 'stale_instagram_credentials_cleaned')
    r.set(
      'message',
      'Tokens obsoletos do app antigo 1784416389360167 e ID 17841408475954541 foram limpos com sucesso.',
    )
    r.set(
      'details',
      JSON.stringify({
        cleaned_meta_instagram_page_token: true,
        cleaned_meta_page_access_token: true,
        cleaned_meta_instagram_business_id: true,
        preserved_user_token_suffix: '...ZDZD',
      }),
    )
    app.saveNoValidate(r)
  },
  (app) => {},
)
