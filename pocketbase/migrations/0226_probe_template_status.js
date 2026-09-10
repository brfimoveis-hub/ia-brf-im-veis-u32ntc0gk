migrate((app) => {
  let user = null
  try {
    user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
  } catch (_) {}

  if (!user) {
    const users = app.findRecordsByFilter('users', '1=1', '-created', 1, 0)
    if (users && users.length > 0) user = users[0]
  }

  if (!user) return

  const wabaId = user.getString('meta_whatsapp_business_id') || '3542548689255402'
  const accessToken = user.getString('meta_whatsapp_access_token')

  let liveStatus = 'PENDING'
  let liveReason = ''
  let metaTemplateId = '1070556445883982'
  let rawResponse = ''

  if (wabaId && accessToken) {
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          wabaId +
          '/message_templates?fields=id,name,status,category,language,components,rejected_reason&limit=100',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 20,
      })
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const data = (res.json && res.json.data) || []
        const found = data.find((t) => t.name && t.name.toLowerCase() === 'villa_dos_acores')
        if (found) {
          liveStatus = (found.status || 'PENDING').toUpperCase()
          if (found.id) metaTemplateId = String(found.id)
          if (found.rejected_reason) liveReason = String(found.rejected_reason)
          rawResponse = JSON.stringify(found)
        } else {
          rawResponse = 'villa_dos_acores not in Meta list. Total: ' + data.length
        }
      } else {
        rawResponse = 'Meta API status ' + res.statusCode + ': ' + JSON.stringify(res.json)
      }
    } catch (e) {
      rawResponse = 'HTTP err: ' + e.message
    }
  }

  // Log in system_logs
  try {
    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol)
    logRec.set('type', 'meta_template_probe')
    logRec.set('message', 'Probe template villa_dos_acores: status=' + liveStatus)
    logRec.set('details', rawResponse)
    logRec.set('user_id', user.id)
    app.save(logRec)
  } catch (_) {}

  // Update whatsapp_templates if found
  try {
    const list = app.findRecordsByFilter(
      'whatsapp_templates',
      "name = 'villa_dos_acores'",
      '-created',
      1,
      0,
    )
    if (list && list.length > 0) {
      const rec = list[0]
      rec.set('status', liveStatus)
      if (metaTemplateId) rec.set('meta_template_id', metaTemplateId)
      if (liveReason) rec.set('rejection_reason', liveReason)
      app.save(rec)
    }
  } catch (_) {}
})
