/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Query all active cadences to dynamically generate the status options
  const cadences = app.findRecordsByFilter('cadences', '1=1', 'order', 100, 0)
  const titles = new Set()

  cadences.forEach((c) => {
    const title = c.getString('title')
    if (title) titles.add(title)
  })

  // Ensure we don't lose old statuse assigned to older records
  const oldStatuses = [
    'lead',
    'contact',
    'closed',
    'Visita',
    'Fechamento',
    'Demo Realiz.',
    'Engajamento',
    'Qualificação',
    'Novo',
    'Proposta',
  ]
  oldStatuses.forEach((s) => titles.add(s))

  const col = app.findCollectionByNameOrId('customers')
  const statusField = col.fields.getByName('status')

  if (statusField) {
    statusField.values = Array.from(titles)
    app.save(col)
  }
})
