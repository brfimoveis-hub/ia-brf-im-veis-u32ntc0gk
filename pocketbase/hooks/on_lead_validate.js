onRecordCreateRequest((e) => {
  const body = e.requestInfo().body
  if (!body) return e.next()

  const status = body.status || 'Novo'
  const assignedTo = body.assigned_to || (e.auth ? e.auth.id : null)

  if (!assignedTo) return e.next()

  // Desde a Constituição v3.1, a coleção 'cadences' foi aposentada (is_active = false)
  // e o atendimento da Bia é guiado pelo Mapa de Movimento em bia_learnings (tYVJIdIFb5rW4iq).
  // A validação legada de cadência ativa foi neutralizada para permitir entrada de novos leads.
  return e.next()
}, 'leads')
