onRecordCreateRequest((e) => {
  const body = e.requestInfo().body
  if (!body) return e.next()

  const status = body.status || 'Novo'
  const assignedTo = body.assigned_to || (e.auth ? e.auth.id : null)

  if (!assignedTo) return e.next()

  try {
    let cadences = $app.findRecordsByFilter(
      'cadences',
      `user_id = '${assignedTo}' && is_active = true && title = '${status.replace(/'/g, "''")}'`,
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
        `user_id = '${assignedTo}' && is_active = true`,
        'order',
        1,
        0,
      )
    }

    if (cadences.length === 0) {
      throw new BadRequestError('Falha na distribuição do lead', {
        status: new ValidationError(
          'cadence_missing',
          'Nenhuma cadência ativa encontrada para o vendedor.',
        ),
      })
    }
  } catch (err) {
    if (err && err.name === 'BadRequestError') {
      throw err
    }
  }

  return e.next()
}, 'leads')
