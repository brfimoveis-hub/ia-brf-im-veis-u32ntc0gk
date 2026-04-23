onRecordValidate((e) => {
  const record = e.record
  const original = record.original()

  let name = record.getString('name').trim()
  const first = record.getString('first_name').trim()
  const middle = record.getString('middle_name').trim()
  const last = record.getString('last_name').trim()

  const origFirst = original ? original.getString('first_name').trim() : ''
  const origMiddle = original ? original.getString('middle_name').trim() : ''
  const origLast = original ? original.getString('last_name').trim() : ''
  const origName = original ? original.getString('name').trim() : ''

  const nameIsPlaceholder = !name || name.toLowerCase() === 'sem nome' || name === '—'

  const individualChanged = first !== origFirst || middle !== origMiddle || last !== origLast
  const nameChanged = name !== origName

  // 1. Sync individual parts back to the full name if parts changed or if name is a placeholder
  if ((individualChanged && !nameChanged) || nameIsPlaceholder) {
    if (first || middle || last) {
      name = [first, middle, last].filter(Boolean).join(' ')
      record.set('name', name)
    }
  }

  // 2. Sync full name to individual parts if name changed directly
  if (nameChanged && !individualChanged && !nameIsPlaceholder) {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length > 0) {
      record.set('first_name', parts[0])
      record.set('last_name', parts.length > 1 ? parts.slice(1).join(' ') : '')
      // Clear middle name to keep it strictly in sync with what was just set in the name field
      record.set('middle_name', '')
    }
  } else if (!first && !last && !nameIsPlaceholder) {
    // If parts are empty but a valid name exists (e.g. initial import), populate parts automatically
    const parts = name.split(' ').filter(Boolean)
    if (parts.length > 0) {
      record.set('first_name', parts[0])
      record.set('last_name', parts.length > 1 ? parts.slice(1).join(' ') : '')
    }
  }

  // 3. Final fallback to satisfy required DB constraint
  let finalName = record.getString('name').trim()
  if (!finalName || finalName.toLowerCase() === 'sem nome' || finalName === '—') {
    const email = record.getString('email').trim()
    const phone = record.getString('phone').trim()
    if (email) {
      record.set('name', email)
    } else if (phone) {
      record.set('name', phone)
    } else {
      record.set('name', 'Sem nome')
    }
  }

  e.next()
}, 'customers')
