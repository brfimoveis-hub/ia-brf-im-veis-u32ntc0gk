migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')

    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {
      const users = app.findRecordsByFilter('_pb_users_auth_', '', '', 1, 0)
      if (users.length > 0) {
        user = users[0]
      } else {
        return
      }
    }

    try {
      app.findFirstRecordByData('customers', 'first_name', '(Allure 625) Marcus')
    } catch (_) {
      const record1 = new Record(col)
      record1.set('user_id', user.id)
      record1.set('name', '(Allure 625) Marcus')
      record1.set('first_name', '(Allure 625) Marcus')
      record1.set('tags', ['* myContacts'])
      record1.set('phone_1_label', 'Celular')
      record1.set('phone_1_value', '+55 48 99953-5711')
      record1.set('phone_2_label', 'Versão antiga')
      record1.set('phone_2_value', '+55 48 9953-5711')
      record1.set('status', '1')
      app.save(record1)
    }

    try {
      app.findFirstRecordByData('customers', 'first_name', '(Malu) Maria')
    } catch (_) {
      const record2 = new Record(col)
      record2.set('user_id', user.id)
      record2.set('name', '(Malu) Maria Luiza (Facul)')
      record2.set('first_name', '(Malu) Maria')
      record2.set('middle_name', 'Luiza')
      record2.set('last_name', '(Facul)')
      record2.set('tags', ['* myContacts'])
      record2.set('phone_1_label', 'Mobile')
      record2.set('phone_1_value', '999309855')
      record2.set('status', '1')
      app.save(record2)
    }
  },
  (app) => {
    try {
      const r1 = app.findFirstRecordByData('customers', 'first_name', '(Allure 625) Marcus')
      app.delete(r1)
    } catch (_) {}
    try {
      const r2 = app.findFirstRecordByData('customers', 'first_name', '(Malu) Maria')
      app.delete(r2)
    } catch (_) {}
  },
)
