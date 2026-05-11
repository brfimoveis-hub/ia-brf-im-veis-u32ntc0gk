onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const phase = record.getString('phase')

  if (phase === 'Nível 5' || phase === 'Level 5') {
    try {
      $app.findFirstRecordByFilter(
        'system_logs',
        `type = 'cadence_success' && details.customer_id = '${record.id}'`,
      )
    } catch (_) {
      const col = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(col)
      log.set('type', 'cadence_success')
      log.set(
        'message',
        `Lead ${record.getString('name')} alcançou o Nível 5 (Qualificado) na IA Mãe.`,
      )
      log.set('details', { customer_id: record.id, phase: phase })
      $app.save(log)
    }
  }

  if (e.next) e.next()
}, 'customers')
