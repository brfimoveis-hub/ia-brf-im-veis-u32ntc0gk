/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    console.log(
      '[MIGRATION 1760000131] Iniciando expansão de bia_learnings e semente de lições de experts...',
    )

    const col = app.findCollectionByNameOrId('bia_learnings')

    // Adiciona novos campos para suportar o Loop de Aprendizado sem quebrar compatibilidade
    const newTextFields = [
      'learning_type', // ERRO | ACERTO | OBJECOES | DUVIDA_SEM_RESPOSTA | DIRETRIZ
      'origin', // auto | seed_expert | manual | cron_semanal
      'status', // aprovado | pendente | descartado | em_revisao
      'context_customer', // Nome / telefone / ID do lead envolvido
      'context_property', // Imóvel em foco (código / título)
      'conflict_flag', // Indicador se colidiu com a Constituição v4.0
    ]

    for (const fName of newTextFields) {
      if (!col.fields.getByName(fName)) {
        col.fields.add(new TextField({ name: fName }))
      }
    }

    app.save(col)

    // Base Semente — Melhores Práticas do Mercado Imobiliário de Alto Padrão (12 Lições de Experts)
    const expertSeeds = [
      {
        title: 'Foco Absoluto no Imóvel Citado',
        rule_text:
          'Foco total no imóvel citado pelo lead antes de cogitar qualquer alternativa. Nunca desviar o assunto ou ofertar outro produto sem antes esgotar a apresentação e interesse no imóvel original procurado.',
        learning_type: 'ACERTO',
        category: 'catalogo',
        priority: 150,
      },
      {
        title: 'Cadência de Uma Pergunta por Mensagem',
        rule_text:
          'Sempre fazer exatamente 1 pergunta por mensagem. Múltiplas perguntas afogam o lead de alto padrão e reduzem a taxa de resposta drasticamente.',
        learning_type: 'ACERTO',
        category: 'comportamento',
        priority: 145,
      },
      {
        title: 'Valorização Antes do Preço',
        rule_text:
          'Nunca discutir preço bruto ou condições financeiras antes de valorizar os diferenciais do produto, localização e estilo de vida que o empreendimento entrega.',
        learning_type: 'ACERTO',
        category: 'apresentacao',
        priority: 140,
      },
      {
        title: 'Tratamento de Objeção de Preço',
        rule_text:
          'Ao receber objeção de preço, responder acolhendo a preocupação e apresentar alternativas inteligentes de fluxo de pagamento (ex.: 15% de ato facilitado + saldo diluído no período de obras).',
        learning_type: 'OBJECOES',
        category: 'qualificacao',
        priority: 138,
      },
      {
        title: 'Fidelidade Estrita ao Dossiê Oficial',
        rule_text:
          'Nunca prometer prazos de entrega, acabamentos ou valores que não estejam expressos no dossiê oficial e tabela cadastrada no CRM.',
        learning_type: 'ERRO',
        category: 'comportamento',
        priority: 135,
      },
      {
        title: 'Retomada de Lead Mudo com Ângulo Novo',
        rule_text:
          'Ao retomar contato com lead em silêncio, nunca repetir o mesmo texto anterior nem cobrar resposta. Retome sempre com fato novo, ângulo inédito de valorização ou atualização da região.',
        learning_type: 'ACERTO',
        category: 'comportamento',
        priority: 130,
      },
      {
        title: 'Confiança Superior à Pressão',
        rule_text:
          'Postura de autoridade consultiva e confiança sempre supera pressão de fechamento ("últimas unidades", urgência artificial). Mostre domínio técnico e segurança.',
        learning_type: 'ACERTO',
        category: 'comportamento',
        priority: 125,
      },
      {
        title: 'Formatação Enxuta no WhatsApp (Máx 2 Opções)',
        rule_text:
          'Respostas com no máximo 2 opções por mensagem e texto corrido amigável. É proibido enviar tabelas markdown pesadas que poluem a tela do celular do cliente.',
        learning_type: 'ACERTO',
        category: 'apresentacao',
        priority: 120,
      },
      {
        title: 'Tratamento de Dúvida sem Dado no Dossiê',
        rule_text:
          'Quando o cliente fizer uma pergunta cuja informação técnica não conste no dossiê oficial, acolha com transparência: "Vou confirmar esse detalhe específico com o diretor Mauro e já te retorno com precisão". Nunca invente.',
        learning_type: 'DUVIDA_SEM_RESPOSTA',
        category: 'comportamento',
        priority: 118,
      },
      {
        title: 'Foco Estrito em Venda (Sem Locação)',
        rule_text:
          'A BRF atua exclusivamente com vendas e investimento. Se o cliente perguntar por aluguel, esclareça com simpatia e convide a conhecer opções de aquisição com parcelas menores que locação.',
        learning_type: 'ACERTO',
        category: 'comportamento',
        priority: 115,
      },
      {
        title: 'Transbordo Transparente com Diretor Mauro',
        rule_text:
          'Quando houver agendamento de visita presencial, negociação direta ou handoff, transborde para o WhatsApp pessoal do Mauro no número (48) 99972-8050, nunca passando o número da própria Bia.',
        learning_type: 'ACERTO',
        category: 'comportamento',
        priority: 112,
      },
      {
        title: 'Preço Dinâmico Sempre "A Partir De"',
        rule_text:
          'Sempre cite valores utilizando o padrão "a partir de R$ [VALOR]" ancorado nas unidades disponíveis do lançamento, nunca cravando valor absoluto como se todas fossem iguais.',
        learning_type: 'ACERTO',
        category: 'apresentacao',
        priority: 110,
      },
    ]

    const targetUser = app.findFirstRecordByFilter('users', "email != ''")
    const userId = targetUser ? targetUser.id : ''

    // Seed idempotente: verifica se já existe semente com mesmo título
    for (const seed of expertSeeds) {
      const existing = app.findRecordsByFilter(
        'bia_learnings',
        `title = '${seed.title.replace(/'/g, "''")}'`,
        '-created',
        1,
        0,
      )

      if (!existing || existing.length === 0) {
        const rec = new Record(col)
        rec.set('user_id', userId)
        rec.set('title', seed.title)
        rec.set('rule_text', seed.rule_text)
        rec.set('category', seed.category || 'comportamento')
        rec.set('learning_type', seed.learning_type)
        rec.set('origin', 'seed_expert')
        rec.set('status', 'aprovado')
        rec.set('author', 'Experts BRF Imóveis')
        rec.set('priority', seed.priority)
        rec.set('is_active', true)
        rec.set('last_reviewed_at', new Date().toISOString())
        rec.set('reviewed_by', 'Mauro (Aprovado)')
        app.saveNoValidate(rec)
      } else {
        // Atualiza campos novos se ainda estiverem vazios
        const rec = existing[0]
        if (!rec.getString('origin')) {
          rec.set('origin', 'seed_expert')
          rec.set('learning_type', seed.learning_type)
          rec.set('status', 'aprovado')
          app.saveNoValidate(rec)
        }
      }
    }

    console.log('[MIGRATION 1760000131] Expansão e semente de lições concluídas com sucesso!')
  },
  (app) => {
    // Reversão
  },
)
