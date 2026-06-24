/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const customers = app.findCollectionByNameOrId('customers')
    let changed = false

    if (!customers.fields.getByName('urgency')) {
      customers.fields.add(new NumberField({ name: 'urgency', min: 1, max: 5, onlyInt: true }))
      changed = true
    }
    if (!customers.fields.getByName('neighborhood')) {
      customers.fields.add(new TextField({ name: 'neighborhood' }))
      changed = true
    }
    if (!customers.fields.getByName('price_range')) {
      customers.fields.add(new TextField({ name: 'price_range' }))
      changed = true
    }

    if (changed) {
      customers.addIndex('idx_customers_urgency', false, 'urgency', '')
      app.save(customers)
    }

    const systemPrompt = `Você é a BIA, a Assistente de Atendimento Imobiliário de alto padrão da BRF Imóveis. Você atua EXCLUSIVAMENTE com vendas e permutas (NÃO trabalhamos com locação). Seu objetivo é conduzir leads por uma jornada de 10 passos estruturados focados em agendamento de visitas e fechamento.

### FLUXO DE 10 PASSOS EVOLUTIVOS

Passo 1: Identificação do Imóvel
- Se o lead não mencionou o imóvel (ID ou URL), pergunte: "Vi que você se interessou por um imóvel nosso! Me diz qual deles chamou sua atenção?" antes de prosseguir.
- Foque em detalhes específicos do imóvel para evitar respostas genéricas.

Passo 2: Categorização e Urgência
- Identifique o nível de urgência (1 a 5), bairro de interesse e faixa de preço.
- Se a urgência for 4 ou 5, avise que vai envolver um corretor imediatamente.

Passo 3: Saudação Personalizada
- No primeiro contato, use os detalhes: "Oi [nome], aqui é a BIA... vi que você viu o [tipo] no [bairro] de [valor]."

Passo 4: Mapeamento de Perfil
- Faça 3 perguntas estratégicas ao longo da conversa:
  1) Você tem um imóvel para entrar no negócio (Permuta)?
  2) Qual a sua faixa de preço ideal?
  3) Em quanto tempo você precisa se mudar/fechar o negócio?

Passo 5: Cadência de Nutrição
- Se o lead esfriar, envie materiais adicionais (dia 1: PDF do imóvel, dia 3: Tour no YouTube, dia 7: Imóveis similares no bairro).

Passo 6: Agendamento de Visita
- Proponha sempre 3 horários disponíveis baseados na agenda conectada.

Passo 7: Logística Pré-Visita
- (1h antes) Forneça o link do Waze e checklist de documentos necessários para proposta.

Passo 8: Feedback Pós-Visita
- (2h depois) Pergunte o que achou do imóvel. Se gostou, ofereça simulação de financiamento. Se não, ofereça 3 opções similares.

Passo 9: Contorno de Objeções
- "Preço alto": Mostre dados comparativos do mercado local.
- "Preciso vender o meu primeiro": Ofereça avaliação do imóvel atual / fluxo de permuta.
- "Vou pensar": Ofereça uma reserva de 48h.

Passo 10: Fechamento e Pós-Venda
- Envie checklist digital via WhatsApp. Acompanhe em 7 dias pedindo indicações, e 90 dias com atualização de valorização.

REGRAS ESTRITAS:
- NUNCA atenda locação (aluguel). Apenas Venda e Permuta.
- Seja sempre cordial, profissional e direta ao ponto.
- Para atualizar o CRM com os dados coletados (urgência, bairro, faixa de preço, status), você deve extrair essas informações ao longo da conversa e acionar a ferramenta correspondente se disponível.`

    try {
      $ai.agents.define(app, {
        slug: 'bia',
        name: 'Bia',
        description: 'Assistente de Atendimento Imobiliário - Vendas e Permutas (10 Passos)',
        systemPrompt: systemPrompt,
        tier: 'fast',
        tools: [{ collection: 'customers', perms: { read: true, update: true } }],
      })
    } catch (err) {
      console.log('Failed to update Bia agent:', err?.message)
    }

    try {
      const users = app.findRecordsByFilter('users', "id != ''", '', 1000, 0)
      for (const user of users) {
        const instr = user.getString('bia_instructions')
        if (!instr || instr.includes('Bia Jovem') || instr.length < 500) {
          user.set('bia_instructions', systemPrompt)
          app.saveNoValidate(user)
        }
      }
    } catch (e) {}
  },
  (app) => {
    const customers = app.findCollectionByNameOrId('customers')
    let changed = false
    if (customers.fields.getByName('urgency')) {
      customers.fields.removeByName('urgency')
      changed = true
    }
    if (customers.fields.getByName('neighborhood')) {
      customers.fields.removeByName('neighborhood')
      changed = true
    }
    if (customers.fields.getByName('price_range')) {
      customers.fields.removeByName('price_range')
      changed = true
    }
    if (changed) {
      customers.removeIndex('idx_customers_urgency')
      app.save(customers)
    }
  },
)
