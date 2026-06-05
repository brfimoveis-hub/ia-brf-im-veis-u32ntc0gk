onRecordCreate((e) => {
  const record = e.record

  let domain = record.getString('uazapi_domain')
  if (domain) {
    domain = domain.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
    if (domain && !domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = 'https://' + domain
    }
    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1)
    }
    record.set('uazapi_domain', domain)
  }

  let token = record.getString('uazapi_token')
  if (token) {
    record.set('uazapi_token', token.replace(/[\s\u200B-\u200D\uFEFF]/g, ''))
  }

  let adminToken = record.getString('uazapi_admin_token')
  if (adminToken) {
    record.set('uazapi_admin_token', adminToken.replace(/[\s\u200B-\u200D\uFEFF]/g, ''))
  }

  let instance = record.getString('uazapi_instance_number')
  if (instance) {
    record.set('uazapi_instance_number', instance.replace(/[\s\u200B-\u200D\uFEFF]/g, ''))
  }

  e.next()
}, 'users')
