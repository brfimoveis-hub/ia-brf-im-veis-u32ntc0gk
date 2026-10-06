/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const db = app.db()

    // 10 estágios canônicos da Seção 3 da Constituição v3.1
    const canonicalStages = [
      '1. Acolhimento',
      '2. Qualificação',
      '3. Apresentação Consultiva',
      '4. Sondagem Financeira',
      '5. Nutrição de Interesse',
      '6. Convite de Visita',
      '7. Confirmação e Rota',
      '8. Feedback da Visita',
      '9. Proposta e Condições',
      '10. Pós-venda e Indicação',
    ]

    // 1. Atualizar as opções do campo 'status' na coleção 'customers'
    const col = app.findCollectionByNameOrId('customers')
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = canonicalStages
      app.save(col)
      console.log(
        '[MIGRATION 1760000025] Campo status de customers atualizado para os 10 estágios canônicos.',
      )
    }

    // 2. Transpor todos os leads existentes conforme o mapeamento definido:
    // "Novo"/lead/"Captura + Identificação" → "1. Acolhimento"
    // "Validação no CRM" → "2. Qualificação"
    // "Contato Personalizado" → "3. Apresentação Consultiva"
    // "Mapeamento de Perfil" → "4. Sondagem Financeira"
    // "Nutrição Automática" → "5. Nutrição de Interesse"
    // "Agendamento de Visita" → "6. Convite de Visita"
    // "Pré-Visita" → "7. Confirmação e Rota"
    // "Pós-Visita" → "8. Feedback da Visita"
    // "Proposta e Negociação" → "9. Proposta e Condições"
    // "Fechamento e Pós-Venda" → "10. Pós-venda e Indicação"
    const explicitMapping = [
      {
        to: '1. Acolhimento',
        from: [
          'Novo',
          'lead',
          'Lead Novo',
          'Base de Clientes/Novo LYD',
          'Captura + Identificação',
          'D0 - Contato Imediato',
          'Contato Inicial',
          'contact',
        ],
      },
      {
        to: '2. Qualificação',
        from: ['Validação no CRM', 'Qualificação'],
      },
      {
        to: '3. Apresentação Consultiva',
        from: ['Contato Personalizado'],
      },
      {
        to: '4. Sondagem Financeira',
        from: ['Mapeamento de Perfil'],
      },
      {
        to: '5. Nutrição de Interesse',
        from: [
          'Nutrição Automática',
          'Engajamento',
          'D1 - Follow up 1',
          'D2 - Follow up 2',
          'D3 - Follow up 3',
          'D4 - Follow up 4',
        ],
      },
      {
        to: '6. Convite de Visita',
        from: [
          'Agendamento de Visita',
          'Demo Realiz.',
          'D5 - Follow up 5',
          'D6 - Follow up 6',
          'D7 - Follow up 7',
          'D8 - Follow up 8',
          'D9 - Despedida/Nutrição',
        ],
      },
      {
        to: '7. Confirmação e Rota',
        from: ['Pré-Visita'],
      },
      {
        to: '8. Feedback da Visita',
        from: ['Pós-Visita', 'Visita'],
      },
      {
        to: '9. Proposta e Condições',
        from: ['Proposta e Negociação', 'Proposta'],
      },
      {
        to: '10. Pós-venda e Indicação',
        from: ['Fechamento e Pós-Venda', 'Fechamento', 'closed'],
      },
    ]

    for (const item of explicitMapping) {
      for (const legacy of item.from) {
        db.newQuery('UPDATE customers SET status = {:to} WHERE status = {:from}')
          .bind({ to: item.to, from: legacy })
          .execute()
      }
    }

    // 3. Fallback de segurança: ZERO leads órfãos e nenhum status vazio ou fora dos 10 estágios
    // Qualquer status que não esteja exatamente em canonicalStages vai para "1. Acolhimento"
    let questionMarks = canonicalStages.map(() => '?').join(', ')
    let sqlCatchAll = `UPDATE customers SET status = '1. Acolhimento' WHERE status IS NULL OR status = '' OR status NOT IN (${canonicalStages.map((s) => `'${s}'`).join(', ')})`
    db.newQuery(sqlCatchAll).execute()

    console.log('[MIGRATION 1760000025] Transposição de status concluída com ZERO órfãos.')
  },
  (app) => {
    // Non-destructive forward migration
  },
)
