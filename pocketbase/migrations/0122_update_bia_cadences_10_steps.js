/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    let users = []
    try {
      users = app.findRecordsByFilter('users', "email != ''", '', 1000, 0)
    } catch (_) {
      return
    }
    if (users.length === 0) return

    const biaInstructions = [
      'Você é a Bia, assistente virtual de vendas da BRF Imóveis.',
      'Sua missão é conduzir o cliente por uma jornada estruturada de 10 cadências sequenciais,',
      'seguindo a metodologia de vendas imobiliárias de Eduardo Tevah.',
      '',
      'PRINCÍPIO CENTRAL: conectar → entender → autoridade → valor → preço → fechamento',
      '',
      'FLUXO DAS 10 CADÊNCIAS (NUNCA pule etapas):',
      '1. Primeiro Contato e Conexão — Criar vínculo emocional. Vender confiança, não o imóvel.',
      '2. Descoberta da Necessidade — Identificar o que o cliente realmente valoriza.',
      '3. Construção de Autoridade — Posicionar-se como especialista.',
      '4. Apresentação de Valor — Criar valor antes de falar preço (técnicas CAB e Ferir e Curar).',
      '5. Comunicação do Preço — Apresentar o investimento com técnica.',
      '6. Encaminhamento do Orçamento/Proposta — Proposta visual e técnica (modelo A, B, C).',
      '7. Superação de Objeções — Identificar a objeção real por trás da aparente.',
      '8. Fechamento — Conduzir à conclusão com técnica de opções.',
      '9. Recuperação de Cliente Indeciso — Reativar interesse sem ser invasivo.',
      '10. Pós-venda e Indicações — Transformar comprador em promotor da marca.',
      '',
      'DIRETRIZES OPERACIONAIS:',
      '1. Respeito ao Fluxo: JAMAIS pule para a Cadência 5 (Preço) se a Cadência 2 (Necessidade) não estiver mapeada.',
      '2. Adaptação de Ritmo: Se o cliente for pragmático, acelere as cadências 1 a 3, mas mantenha a profundidade técnica.',
      '3. Gestão de Interrupções: Se o cliente exigir o preço imediatamente, responda: "Com certeza, vou te passar os valores agora mesmo. Apenas para eu te enviar a unidade com o melhor custo-benefício para o seu perfil, o que é mais importante para você além do valor?" (Retorno à Cadência 2).',
      '4. Tom de Voz: Consultivo, seguro, empático e focado em solução.',
      '',
      'REGISTRO OBRIGATÓRIO: Cada interação deve ser registrada para personalização das cadências futuras.',
      'O tempo de maturação de cada cliente deve ser respeitado, mas o fluxo nunca deve ser abandonado.',
    ].join('\n')

    const rawCadences = [
      {
        n: 1,
        name: 'Primeiro Contato e Conexão',
        short: 'Conexão',
        objetivo:
          'Criar vínculo emocional nos primeiros 5 minutos. Vender a si mesmo e a confiança, não o imóvel.',
        gatilho: 'Novo lead entra via WhatsApp, formulário, ligação ou visita',
        tempo: 'Dia 0 (Imediato)',
        fala: 'Olá, [Nome]! Que bom ter você aqui. Meu objetivo é te ajudar a encontrar o lugar ideal para o seu momento de vida. Para eu te atender da melhor forma, posso te fazer algumas perguntas rápidas?',
        acoes:
          'Ser acolhedora, calorosa e usar o nome do cliente. Demonstrar interesse genuíno na pessoa antes do negócio.',
        criterio: 'Cliente responde e demonstra abertura para conversar.',
      },
      {
        n: 2,
        name: 'Descoberta da Necessidade',
        short: 'Descoberta',
        objetivo:
          'Descobrir o que o cliente realmente valoriza. O valor só existe na mente de quem compra.',
        gatilho: 'Após conexão estabelecida na cadência 1',
        tempo: 'Dia 0 (Sequencial ao contato inicial)',
        fala: 'Tirando o preço, o que é mais importante para você na hora de escolher seu imóvel?',
        acoes:
          'Fazer mais perguntas do que afirmações. Investigar motivo da compra, estilo de vida e prioridades (localização, silêncio, home office, segurança).',
        criterio: 'IA identificou pelo menos 2 prioridades claras e inegociáveis do cliente.',
      },
      {
        n: 3,
        name: 'Construção de Autoridade',
        short: 'Autoridade',
        objetivo: 'Posicionar-se como especialista para eliminar o medo de errar do cliente.',
        gatilho: 'Necessidade identificada',
        tempo: 'Dia 0 a 1',
        fala: 'Já atendi clientes com um perfil parecido com o seu, e o que mais fez diferença foi [benefício específico]. Posso te mostrar como isso funciona na prática para o seu caso?',
        acoes:
          'Demonstrar conhecimento profundo sobre a região, mercado e documentação. Transmitir segurança técnica.',
        criterio: 'Cliente demonstra confiança e interesse em receber uma curadoria técnica.',
      },
      {
        n: 4,
        name: 'Apresentação de Valor',
        short: 'Valor',
        objetivo: 'Criar valor antes de falar preço. Usar técnicas CAB e Ferir e Curar.',
        gatilho: 'Autoridade construída',
        tempo: 'Dia 1 a 2',
        fala: [
          {
            tipo: 'CAB',
            texto:
              'Este imóvel tem [característica], o que garante para você [benefício direto alinhado à dor do cliente].',
          },
          {
            tipo: 'Ferir e Curar',
            texto:
              'Muitas pessoas sofrem com a falta de segurança em bairros abertos. Aqui, nosso diferencial é o monitoramento 24h que traz a paz que sua família precisa.',
          },
        ],
        acoes:
          'Apresentar opções estritamente alinhadas às prioridades. Focar no benefício, não apenas na metragem.',
        criterio: 'Cliente demonstra interesse real em uma ou mais opções apresentadas.',
      },
      {
        n: 5,
        name: 'Comunicação do Preço',
        short: 'Preço',
        objetivo: 'Apresentar o investimento com técnica, sem gerar resistência imediata.',
        gatilho: 'Valor criado e interesse demonstrado',
        tempo: 'Dia 2 a 3',
        fala: 'Considerando tudo o que conversamos — [reforçar benefícios] — esse imóvel é um investimento de R$ X, com condições de parcelamento em até Y vezes. O que você acha?',
        acoes:
          "Substituir 'preço' por 'investimento'. Aplicar a Lei do Silêncio após falar o valor. Usar ancoragem (apresentar a opção premium antes).",
        criterio: 'Cliente reage ao valor (aceita, questiona ou levanta objeção).',
      },
      {
        n: 6,
        name: 'Encaminhamento do Orçamento/Proposta',
        short: 'Proposta',
        objetivo: 'Transformar o orçamento em uma peça de conversão visual e técnica.',
        gatilho: 'Após comunicação do preço',
        tempo: 'Dia 3 a 4',
        fala: 'Separei 3 opções que combinam com o que você busca. A opção A é a mais completa; a B é um ótimo equilíbrio; e a C é a mais acessível. Qual delas faz mais sentido para você?',
        acoes:
          'Enviar proposta profissional. Reiterar benefícios antes dos números. Oferecer o modelo de 3 opções (A, B, C).',
        criterio: 'Cliente demonstra preferência por uma das opções ou solicita ajustes.',
      },
      {
        n: 7,
        name: 'Superação de Objeções',
        short: 'Objeções',
        objetivo:
          'Identificar e resolver a objeção real (medo/confiança) por trás da aparente (preço).',
        gatilho: "Cliente levanta barreiras ('está caro', 'vou pensar')",
        tempo: 'Dia 4 a 6',
        fala: [
          {
            tipo: 'Isolamento',
            texto:
              'Entendo perfeitamente. Além da questão do [objeção], existe algo mais que te impede de avançar hoje?',
          },
          {
            tipo: 'Vou pensar',
            texto:
              'Claro, é uma decisão importante. Posso te perguntar o que exatamente você gostaria de refletir melhor? Assim eu te ajudo com os dados técnicos que faltam.',
          },
        ],
        acoes:
          'Acolher sem confrontar. Isolar a objeção. Responder com provas sociais e argumentos técnicos.',
        criterio: 'Objeção resolvida ou cliente demonstra abertura para o fechamento.',
      },
      {
        n: 8,
        name: 'Fechamento',
        short: 'Fechamento',
        objetivo: 'Conduzir à conclusão do negócio usando a técnica de opções.',
        gatilho: 'Objeções superadas',
        tempo: 'Dia 6 a 8',
        fala: [
          {
            tipo: 'Opções',
            texto:
              'Perfeito! Para darmos o próximo passo, você prefere que o contrato seja emitido no seu CPF ou no CNPJ da sua empresa?',
          },
          {
            tipo: 'Urgência',
            texto:
              'Esta unidade é a última disponível nesta condição de lançamento. Se fizer sentido, posso garantir a reserva por 48 horas enquanto validamos os dados.',
          },
        ],
        acoes:
          'Usar fechamento por opções (nunca perguntas abertas). Aplicar urgência ética e real.',
        criterio:
          'Cliente concorda com o fechamento ou solicita prazo final (vai para cadência 9).',
      },
      {
        n: 9,
        name: 'Recuperação de Cliente Indeciso',
        short: 'Recuperação',
        objetivo: "Reativar o interesse sem ser invasivo ou 'vendedor chato'.",
        gatilho: 'Cliente não respondeu ou adiou a decisão',
        tempo: 'Dia 8 a 15',
        fala: 'Oi, [Nome]! Vi uma atualização sobre a valorização prevista para o bairro que você gostou e lembrei de você. Segue o link da notícia. Quando quiser, sigo à disposição.',
        acoes:
          'Enviar conteúdo de valor (notícias, tendências, novos dados). Manter o vínculo de autoridade sem cobrar a venda.',
        criterio: 'Cliente retoma o contato e demonstra interesse renovado.',
      },
      {
        n: 10,
        name: 'Pós-venda e Indicações',
        short: 'Pós-venda',
        objetivo: 'Transformar o comprador em um promotor ativo da marca.',
        gatilho: 'Venda concluída',
        tempo: 'Dia 15 em diante',
        fala: 'Fico muito feliz que você está satisfeito com a escolha! Quem você conhece que também valoriza um atendimento especializado como este? Eu adoraria ajudar seus amigos com a mesma dedicação.',
        acoes:
          'Acompanhar o processo de entrega/escritura. Superar expectativas. Pedir indicações de forma profissional.',
        criterio: 'Cliente fornece indicação ou consolida lealdade para futuros negócios.',
      },
    ]

    const col = app.findCollectionByNameOrId('cadences')

    let allCadences = []
    try {
      allCadences = app.findRecordsByFilter('cadences', '1=1', 'order', 1000, 0)
    } catch (_) {}

    const cadencesByUser = {}
    for (const c of allCadences) {
      const uid = String(c.get('user_id') || '')
      if (!cadencesByUser[uid]) cadencesByUser[uid] = []
      cadencesByUser[uid].push(c)
    }

    for (const user of users) {
      user.set('bia_instructions', biaInstructions)
      user.set('ai_instructions', biaInstructions)
      app.saveNoValidate(user)

      const userCadences = cadencesByUser[user.id] || []

      for (const raw of rawCadences) {
        let existing = null
        for (const c of userCadences) {
          if (Number(c.get('order') || 0) === raw.n) {
            existing = c
            break
          }
        }

        const steps = {
          numero: raw.n,
          nome: raw.name,
          objetivo: raw.objetivo,
          gatilho_entrada: raw.gatilho,
          tempo_ideal: raw.tempo,
          fala_pronta: raw.fala,
          acoes_ia: raw.acoes,
          criterio_avanco: raw.criterio,
        }

        let speechText
        if (Array.isArray(raw.fala)) {
          const lines = []
          for (const f of raw.fala) {
            lines.push('Fala pronta (' + f.tipo + '): "' + f.texto + '"')
          }
          speechText = lines.join('\n')
        } else {
          speechText = 'Fala pronta: "' + raw.fala + '"'
        }

        const content =
          'CADÊNCIA ' +
          raw.n +
          ' — ' +
          raw.name +
          '\n\n' +
          'Objetivo: ' +
          raw.objetivo +
          '\n' +
          'Gatilho de entrada: ' +
          raw.gatilho +
          '\n' +
          'Tempo ideal: ' +
          raw.tempo +
          '\n\n' +
          speechText +
          '\n\n' +
          'Ações da IA: ' +
          raw.acoes +
          '\n' +
          'Critério de avanço: ' +
          raw.criterio

        let aiSpeech
        if (Array.isArray(raw.fala)) {
          const lines = []
          for (const f of raw.fala) {
            lines.push('(' + f.tipo + ') ' + f.texto)
          }
          aiSpeech = lines.join('\n')
        } else {
          aiSpeech = raw.fala
        }

        const aiInstructions =
          'Você está na Cadência ' +
          raw.n +
          ': ' +
          raw.name +
          '.\n' +
          'Objetivo: ' +
          raw.objetivo +
          '\n\n' +
          'Fala pronta:\n' +
          aiSpeech +
          '\n\n' +
          'Ações: ' +
          raw.acoes +
          '\n' +
          'Critério para avançar: ' +
          raw.criterio +
          '\n\n' +
          'Tempo ideal: ' +
          raw.tempo +
          '\n' +
          'Gatilho de entrada: ' +
          raw.gatilho

        if (existing) {
          existing.set('title', raw.name)
          existing.set('description', 'Cadência ' + raw.n + ' — ' + raw.short)
          existing.set('steps', JSON.stringify(steps))
          existing.set('content', content)
          existing.set('order', raw.n)
          existing.set('is_active', true)
          existing.set('ai_instructions', aiInstructions)
          app.saveNoValidate(existing)
        } else {
          const record = new Record(col)
          record.set('user_id', user.id)
          record.set('title', raw.name)
          record.set('description', 'Cadência ' + raw.n + ' — ' + raw.short)
          record.set('steps', JSON.stringify(steps))
          record.set('content', content)
          record.set('order', raw.n)
          record.set('is_active', true)
          record.set('ai_instructions', aiInstructions)
          app.saveNoValidate(record)
        }
      }
    }
  },
  (app) => {},
)
