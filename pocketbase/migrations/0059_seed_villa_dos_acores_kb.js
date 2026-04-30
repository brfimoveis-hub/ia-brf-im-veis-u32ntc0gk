migrate((app) => {
  const users = app.findRecordsByFilter('users', '', 'created', 1, 0)
  if (users.length === 0) return
  const userId = users[0].id

  try {
    app.findFirstRecordByData('knowledge_base', 'title', 'Inteligência - Villa dos Açores')
    return
  } catch (_) {}

  const kbCol = app.findCollectionByNameOrId('knowledge_base')
  const record = new Record(kbCol)
  record.set('user_id', userId)
  record.set('title', 'Inteligência - Villa dos Açores')
  record.set(
    'content',
    `Produto: Villa dos Açores
Tamanho: 70,78 m²
Localização: Biguaçu
Comodidades: Pet Place, Área Fitness, Piscina, Sacada com Churrasqueira.
Financeiro: R$ 4.930,77 por m².`,
  )
  record.set('category', 'Produto')
  app.save(record)
})
