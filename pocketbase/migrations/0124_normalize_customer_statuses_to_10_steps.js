migrate(
  (app) => {
    // The customers `status` select grew several overlapping sets of values
    // over time (legacy D0–D9 follow-ups, 'Qualificação', 'contact',
    // 'Visita', 'Proposta', 'Fechamento', 'closed', …). Migration 0102
    // introduced the canonical 10-step pipeline but never normalized the
    // existing rows, so customers stuck on legacy values had no matching
    // Kanban column and the status-change "verificações" appeared broken:
    // the card sat in the catch-all 'Novo' bucket and could not be dragged
    // into the real funnel stage it represented.
    //
    // This migration maps every LEGACY PROGRESSION status to its closest
    // 10-step pipeline stage. Entry/new-lead values ('Novo', 'lead', '',
    // 'Lead Novo', 'Base de Clientes/Novo LYD') are intentionally left
    // untouched — they belong in the 'Novo' entry bucket by design.
    const db = app.db()

    const mapping = [
      // D0 / first-contact variants -> step 3 (Contato Personalizado)
      {
        from: ['D0 - Contato Imediato', 'Contato Inicial', 'contact'],
        to: 'Contato Personalizado',
      },
      { from: ['Qualificação'], to: 'Mapeamento de Perfil' },
      { from: ['Engajamento'], to: 'Nutrição Automática' },
      { from: ['Demo Realiz.'], to: 'Agendamento de Visita' },
      { from: ['Visita'], to: 'Pós-Visita' },
      { from: ['Proposta'], to: 'Proposta e Negociação' },
      { from: ['Fechamento', 'closed'], to: 'Fechamento e Pós-Venda' },
      // D1–D9 follow-up ladder — collapse into nurturing/agendamento stages
      {
        from: ['D1 - Follow up 1', 'D2 - Follow up 2', 'D3 - Follow up 3', 'D4 - Follow up 4'],
        to: 'Nutrição Automática',
      },
      {
        from: [
          'D5 - Follow up 5',
          'D6 - Follow up 6',
          'D7 - Follow up 7',
          'D8 - Follow up 8',
          'D9 - Despedida/Nutrição',
        ],
        to: 'Agendamento de Visita',
      },
    ]

    for (const { from, to } of mapping) {
      for (const legacy of from) {
        db.newQuery('UPDATE customers SET status = {:to} WHERE status = {:from}')
          .bind({ to, from: legacy })
          .execute()
      }
    }
  },
  (app) => {
    // Non-destructive forward migration; no down path.
  },
)
