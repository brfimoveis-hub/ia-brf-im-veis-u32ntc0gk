migrate((app) => {
  try {
    const record = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
    record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
    record.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
    record.set('uazapi_admin_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
    record.set('uazapi_instance_number', '554892098050')
    app.saveNoValidate(record)
  } catch (err) {
    console.log('Admin user not found, skipping credential update')
  }
})
