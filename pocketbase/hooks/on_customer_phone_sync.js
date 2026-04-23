onRecordValidate((e) => {
  const r = e.record
  let phone = r.getString('phone')

  if (!phone || phone.trim() === '') {
    const p1 = r.getString('phone_1_value')
    const p2 = r.getString('phone_2_value')
    const p3 = r.getString('phone_3_value')
    const p4 = r.getString('phone_4_value')

    const p = p1 || p2 || p3 || p4
    if (p && p.trim() !== '') {
      r.set('phone', p.trim())
    }
  }

  e.next()
}, 'customers')
