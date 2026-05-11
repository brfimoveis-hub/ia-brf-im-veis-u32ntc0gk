onRecordCreate((e) => {
  if (!e.record.getString('google_ads_webhook_key')) {
    e.record.set('google_ads_webhook_key', $security.randomString(32))
  }
  e.next()
}, 'users')
