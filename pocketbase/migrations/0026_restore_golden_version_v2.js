migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    let user
    try {
      user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
    } catch (_) {
      return // User not found, nothing to do
    }

    // Update user with Uazapi info
    user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
    user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
    user.set('uazapi_admin_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
    user.set('uazapi_instance_number', '554892098050')
    app.save(user)

    // Smart Cadences
    const cadencesCol = app.findCollectionByNameOrId('cadences')

    // Clear existing cadences for this user to restore golden version
    app
      .db()
      .newQuery('DELETE FROM cadences WHERE user_id = {:userId}')
      .bind({ userId: user.id })
      .execute()

    const goldenCadences = [
      {
        title: 'D0 (Imediato): Boas-vindas + Book Digital',
        content:
          'Olá! Tudo bem? Sou a BIA, assistente da BRF Imóveis. Obrigado pelo interesse no Villa dos Açores. Segue o Book Digital com a Planta LM311 (70,78 m²), com suíte, sacada e infraestrutura de clube. Como posso te ajudar hoje?',
        ai_instructions:
          'Envie a mensagem de boas-vindas imediatamente após o lead entrar. Destaque o envio do book digital da Planta LM311 do Villa dos Açores.',
        order: 0,
      },
      {
        title: 'D1 (+24h): Tour Virtual (Veed.io)',
        content:
          'Oi! Conseguiu ver o book digital do Villa dos Açores? Para você ter uma ideia melhor dos 70,78 m² da planta LM311, preparei um Tour Virtual rápido para você: [Link Veed.io]. O que achou da distribuição dos espaços?',
        ai_instructions:
          'Pergunte sobre o book digital e apresente o link do tour virtual da planta. Foque na percepção de espaço.',
        order: 1,
      },
      {
        title: 'D2: Qualificação Financeira',
        content:
          'Falando em investimento, você já tem alguma ideia de como gostaria de planejar a compra? Muitos clientes fazem simulações com o nosso time para ver a viabilidade e opções de financiamento. Gostaria de uma simulação sem compromisso?',
        ai_instructions:
          'Investigue de forma sutil a viabilidade financeira e ofereça uma simulação.',
        order: 2,
      },
      {
        title: 'D3: Prova Social / Obra',
        content:
          'Só para te atualizar: as obras do Villa dos Açores (no Rio Caveiras, Biguaçu) estão avançando super bem! Temos fotos recentes da construção, incluindo a área do pet place e da piscina. Quer que eu te envie algumas?',
        ai_instructions:
          'Mostre o avanço das obras e gere valor destacando o pet place e a piscina. Bairro Rio Caveiras, Biguaçu.',
        order: 3,
      },
      {
        title: 'D4: Transbordo para Humano',
        content:
          'Para a gente não perder nenhum detalhe importante, vou pedir para o Mauro, nosso especialista na região de Biguaçu, te dar um alô. Ele conhece o Villa dos Açores como ninguém e pode tirar suas dúvidas técnicas. Pode ser?',
        ai_instructions: 'Alerta de hand-off. Prepare o cliente para falar com o corretor Mauro.',
        order: 4,
      },
      {
        title: 'D5: Comparativo de Mercado (Biguaçu)',
        content:
          'Muitos clientes me perguntam se vale mais a pena investir ou alugar em Biguaçu. O Villa dos Açores está com uma ótima rentabilidade esperada. Se quiser, posso te mandar um comparativo da nossa equipe comercial. O que acha?',
        ai_instructions:
          'Apresente o argumento de investimento vs aluguel. Reforce a rentabilidade.',
        order: 5,
      },
      {
        title: 'D6: Gatilho de Urgência (Preço m²)',
        content:
          'Uma informação importante: a planta LM311 hoje está saindo por um valor super competitivo na região de Biguaçu (média de R$ 4.930,77/m²). Como as unidades estão valorizando com o avanço da obra, é uma janela interessante de compra.',
        ai_instructions:
          'Utilize o gatilho de urgência informando o valor do m² e a valorização com a obra.',
        order: 6,
      },
      {
        title: 'D7: Convite VIP',
        content:
          'O que acha de tomar um café com a gente no nosso Plantão de Vendas? Assim você conhece todos os detalhes do Villa dos Açores e da planta LM311 pessoalmente. Tem disponibilidade essa semana?',
        ai_instructions: 'Faça o convite para visita presencial ao plantão de vendas.',
        order: 7,
      },
      {
        title: 'D8: FAQ Técnico',
        content:
          'Você tem alguma dúvida sobre a parte técnica? Como funciona a escritura, prazos de entrega, impostos (ITBI)? Estou aqui para descomplicar isso para você.',
        ai_instructions: 'Aborde questões técnicas e burocráticas para gerar segurança.',
        order: 8,
      },
      {
        title: 'D9: Oferta de Reengajamento',
        content:
          'Temos uma condição especial fechando negócio com o Mauro nos próximos dias: você ganha bônus nos armários da cozinha para a sua planta LM311! Posso pedir para ele te explicar como funciona?',
        ai_instructions:
          'Use a oferta de móveis planejados (armários de cozinha) como bônus para fechamento.',
        order: 9,
      },
    ]

    for (const c of goldenCadences) {
      const record = new Record(cadencesCol)
      record.set('user_id', user.id)
      record.set('title', c.title)
      record.set('content', c.content)
      record.set('ai_instructions', c.ai_instructions)
      record.set('order', c.order)
      record.set('is_active', true)
      app.save(record)
    }
  },
  (app) => {
    // No reverse migration for this logic
  },
)
