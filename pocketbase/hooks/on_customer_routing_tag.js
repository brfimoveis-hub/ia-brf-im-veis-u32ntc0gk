onRecordBeforeCreateRequest((e) => {
  const body = e.requestInfo().body
  if (!body) return e.next()

  const record = e.record

  let tags = record.get('tags') || []
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags)
    } catch (_) {
      tags = []
    }
  }
  if (!Array.isArray(tags)) tags = []

  const source = record.getString('source') || ''
  const phone = record.getString('phone') || ''
  const notes = record.getString('notes') || ''

  const searchStr = source + ' ' + phone + ' ' + notes + ' ' + JSON.stringify(body)

  let updated = false
  if (
    searchStr.includes('991828050') ||
    searchStr.includes('48991828050') ||
    searchStr.includes('48 991828050')
  ) {
    if (!tags.includes('Remarketing')) {
      tags.push('Remarketing')
      updated = true
    }
    if (!tags.includes('Origem: 48 991828050')) {
      tags.push('Origem: 48 991828050')
      updated = true
    }
  } else if (
    searchStr.includes('992098050') ||
    searchStr.includes('48992098050') ||
    searchStr.includes('48 992098050')
  ) {
    if (!tags.includes('Geral')) {
      tags.push('Geral')
      updated = true
    }
    if (!tags.includes('Origem: 48 992098050')) {
      tags.push('Origem: 48 992098050')
      updated = true
    }
  }

  if (updated) {
    record.set('tags', tags)
  }

  const currentStatus = record.getString('status')
  if (!currentStatus || currentStatus === 'Lead Novo') {
    record.set('status', 'Base de Clientes/Novo LYD')
  }

  e.next()
}, 'customers')
