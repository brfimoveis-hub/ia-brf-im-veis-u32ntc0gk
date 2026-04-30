migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set(
        'ai_instructions',
        `Você é Bia, uma Corretora Digital profissional da BRF Imóveis.
Sua missão é atuar no funil de vendas do empreendimento Villa dos Açores.
Regras de Comportamento:
1. Seja consultiva, educada e foque em entender a necessidade do cliente (tamanho da família, preferência por lazer ou espaço).
2. Tente sempre avançar o cliente pelas fases: Lead Novo -> Qualificação -> Engajamento -> Visita -> Fechamento.
3. Se o cliente perguntar sobre o projeto, use os dados técnicos da Base de Conhecimento.
4. Quando o cliente responder perguntas de qualificação, avance para [STATUS: Engajamento].
5. Se o cliente concordar em visitar ou fazer reunião, avance para [STATUS: Visita].
6. Se o cliente reclamar de preço ou concorrência, avance para [STATUS: Objeção].
7. Nunca invente dados. Se não souber, diga que vai consultar o especialista técnico.`,
      )
      app.save(user)

      const kbCol = app.findCollectionByNameOrId('knowledge_base')
      const kbRecord = new Record(kbCol)
      kbRecord.set('user_id', user.id)
      kbRecord.set('title', 'Empreendimento Villa dos Açores - Ficha Técnica')
      kbRecord.set(
        'content',
        `Projeto: Villa dos Açores.
Localização: Biguaçu.
Área Privativa: 70.78 m² (Planta LM311).
Características: Pet Place, Fitness, Piscina, Sacada com churrasqueira.
Preço: m² a R$ 4.930,77.
Diferencial: Na região de Biguaçu, é raro encontrar infraestrutura tão completa de lazer com sacada com churrasqueira por esse valor de metro quadrado.`,
      )
      kbRecord.set('category', 'Empreendimento')
      kbRecord.set('tags', 'villa dos acores, biguacu, planta, preco')
      app.save(kbRecord)

      const cadencesCol = app.findCollectionByNameOrId('cadences')
      const cadencesToSeed = [
        {
          title: 'Qualificação',
          content:
            'Mauro, vi que você se interessou pelo Villa dos Açores. Para eu te mandar a melhor opção, você prefere a planta com suíte ou o lazer completo com piscina é mais importante para sua família?',
          ai_instructions: 'Faça exatamente esta pergunta para iniciar a qualificação do lead.',
          order: 1,
        },
        {
          title: 'Engajamento',
          content:
            'Excelente escolha. O Villa dos Açores tem a planta LM311 com 70.78m² que acomoda muito bem a família, além de ter sacada com churrasqueira. O que achou dessa metragem?',
          ai_instructions:
            'Mantenha o lead engajado enviando detalhes específicos que combinam com o que ele respondeu na qualificação.',
          order: 2,
        },
        {
          title: 'Objeção',
          content:
            'Entendo o ponto do preço, mas considere que o m² está em R$ 4.930,77. Em Biguaçu, nessa localização estratégica, você não encontra outro com sacada com churrasqueira e infraestrutura de lazer tão completa.',
          ai_instructions:
            'Use este argumento sempre que o cliente questionar o preço ou falar de opções mais baratas.',
          order: 3,
        },
        {
          title: 'Visita',
          content:
            'Perfeito! Para você ter certeza, o ideal é visitar. Temos horários na terça ou quinta à tarde. Qual fica melhor para você?',
          ai_instructions: 'Tente marcar uma visita presencial ou reunião virtual.',
          order: 4,
        },
      ]

      for (const c of cadencesToSeed) {
        try {
          const existing = app.findFirstRecordByFilter(
            'cadences',
            `user_id = '${user.id}' && title = '${c.title}'`,
          )
          existing.set('content', c.content)
          existing.set('ai_instructions', c.ai_instructions)
          existing.set('is_active', true)
          app.save(existing)
        } catch (_) {
          const rec = new Record(cadencesCol)
          rec.set('user_id', user.id)
          rec.set('title', c.title)
          rec.set('content', c.content)
          rec.set('ai_instructions', c.ai_instructions)
          rec.set('order', c.order)
          rec.set('is_active', true)
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {},
)
