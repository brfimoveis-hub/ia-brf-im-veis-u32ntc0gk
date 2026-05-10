migrate((app) => {
  const users = app.findCollectionByNameOrId('_pb_users_auth_')
  try {
    const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    record.set('uazapi_instance_number', '5548992098050')
    record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
    if (!record.getString('ai_name')) {
      record.set('ai_name', 'Bia')
    }
    app.save(record)
  } catch (_) {
    const record = new Record(users)
    record.setEmail('brfimoveis@gmail.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Admin BRF')
    record.set('ai_name', 'Bia')
    record.set('uazapi_instance_number', '5548992098050')
    record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
    app.save(record)
  }
})
