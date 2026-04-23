migrate(
  (app) => {
    const records = app.findRecordsByFilter(
      'customers',
      "name = '' || name = 'Sem Nome' || name = 'Sem nome' || name = '—' || name = null",
      '',
      100000,
      0,
    )
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const f = record.getString('first_name').trim()
      const m = record.getString('middle_name').trim()
      const l = record.getString('last_name').trim()
      let n = [f, m, l].filter(Boolean).join(' ').trim()

      if (!n) {
        const email = record.getString('email').trim()
        const phone = record.getString('phone').trim()
        if (email) n = email
        else if (phone) n = phone
        else n = 'Sem nome'
      }

      record.set('name', n)
      app.saveNoValidate(record)
    }
  },
  (app) => {
    // revert not necessary
  },
)
