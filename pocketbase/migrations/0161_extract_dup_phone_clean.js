// Migration 0161: Log formatado linha a linha do phone na WABA 3542548689255402
migrate(
  (app) => {
    let recDup = null
    try {
      recDup = app.findFirstRecordByData('system_logs', 'id', '6q8rgb96fnx5ggd')
    } catch (_) {
      return
    }

    const data = JSON.parse(recDup.getString('details') || '{}')
    const phone = (data.phones && data.phones[0]) || {}

    const logsCol = app.findCollectionByNameOrId('system_logs')

    const log = new Record(logsCol)
    log.set('type', 'waba_dup_phone_clean')
    log.set(
      'message',
      'DUP_PHONE: id=' +
        phone.id +
        ' status=' +
        phone.status +
        ' code_ver=' +
        phone.code_verification_status +
        ' quality=' +
        phone.quality_rating +
        ' platform=' +
        phone.platform_type,
    )
    log.set('user_id', 'g5jto8bhulw01bz')
    log.set(
      'details',
      'id: ' +
        phone.id +
        '\ndisplay_phone_number: ' +
        phone.display_phone_number +
        '\nverified_name: ' +
        phone.verified_name +
        '\ncode_verification_status: ' +
        phone.code_verification_status +
        '\nstatus: ' +
        phone.status +
        '\nquality_rating: ' +
        phone.quality_rating +
        '\naccount_mode: ' +
        phone.account_mode +
        '\nplatform_type: ' +
        phone.platform_type +
        '\nhost_platform: ' +
        phone.host_platform,
    )
    app.save(log)
  },
  (app) => {},
)
