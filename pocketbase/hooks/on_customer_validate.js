onRecordCreateRequest((e) => {
  const body = e.requestInfo().body
  if (!body) return e.next()

  const status = body.status || 'Novo'
  const userId = body.user_id || (e.auth ? e.auth.id : null)
  const phone = body.phone || ''
  const email = body.email || ''

  if (!userId) return e.next()

  // 1. Data Unification (Duplicate Check)
  let isDuplicate = false
  let duplicateField = ''

  if (phone) {
    try {
      const existing = $app.findRecordsByFilter(
        'customers',
        `user_id = '${userId}' && (phone = '${phone.replace(/'/g, "''")}' || phone_1_value = '${phone.replace(/'/g, "''")}')`,
        '-created',
        1,
        0,
      )
      if (existing.length > 0) {
        isDuplicate = true
        duplicateField = 'phone'
      }
    } catch (_) {}
  }

  if (!isDuplicate && email) {
    try {
      const existing = $app.findRecordsByFilter(
        'customers',
        `user_id = '${userId}' && (email = '${email.replace(/'/g, "''")}' || email_1_value = '${email.replace(/'/g, "''")}')`,
        '-created',
        1,
        0,
      )
      if (existing.length > 0) {
        isDuplicate = true
        duplicateField = 'email'
      }
    } catch (_) {}
  }

  if (isDuplicate) {
    const errors = {}
    if (duplicateField === 'phone') {
      errors.phone = new ValidationError(
        'validation_not_unique',
        'Já existe um cliente com este telefone no sistema.',
      )
    } else {
      errors.email = new ValidationError(
        'validation_not_unique',
        'Já existe um cliente com este e-mail no sistema.',
      )
    }
    throw new BadRequestError('Cliente duplicado', errors)
  }

  // 2. Cadence Integration Check
  try {
    let cadences = $app.findRecordsByFilter(
      'cadences',
      `user_id = '${userId}' && is_active = true && title = '${status.replace(/'/g, "''")}'`,
      '-created',
      1,
      0,
    )

    if (
      cadences.length === 0 &&
      (status === 'Novo' || status === 'lead' || status === 'Base de Clientes/Novo LYD')
    ) {
      cadences = $app.findRecordsByFilter(
        'cadences',
        `user_id = '${userId}' && is_active = true`,
        'order',
        1,
        0,
      )
    }

    if (cadences.length === 0) {
      throw new BadRequestError('Falha na distribuição do lead', {
        status: new ValidationError(
          'cadence_missing',
          'Nenhuma cadência ativa encontrada para distribuir este lead. Crie ou ative uma cadência.',
        ),
      })
    }
  } catch (err) {
    if (err && err.name === 'BadRequestError') {
      throw err
    }
  }

  return e.next()
}, 'customers')
