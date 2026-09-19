/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoint para interação com a "Bia Mãe — Gerente de Lançamentos"
 * POST /backend/v1/bia-mae/chat
 * Autenticado: Apenas usuários autenticados do CRM (Mauro/corretores)
 */
routerAdd('POST', '/backend/v1/bia-mae/chat', (e) => {
  const authRecord = e.requestInfo().auth
  if (!authRecord) {
    return e.json(401, { error: 'Não autorizado. Faça login no CRM.' })
  }

  let body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {
    return e.json(400, { error: 'Payload JSON inválido.' })
  }

  const message = (body.message || '').trim()
  const launchId = body.launch_id || ''
  const history = Array.isArray(body.history) ? body.history : []

  if (!message) {
    return e.json(400, { error: 'Mensagem obrigatória.' })
  }

  let currentLaunch = null
  if (launchId) {
    try {
      currentLaunch = $app.findRecordById('launches', launchId)
    } catch (_) {}
  }

  // Prepara o contexto de dados do lançamento se houver
  let launchContext = ''
  if (currentLaunch) {
    launchContext = `
[DADOS ATUAIS DO LANÇAMENTO EM EDIÇÃO]
ID: ${currentLaunch.id}
Nome: ${currentLaunch.getString('name')}
Slug: ${currentLaunch.getString('slug')}
Empreendimento: ${currentLaunch.getString('enterprise_name')}
Status atual: ${currentLaunch.getString('status')}
Localização: ${currentLaunch.getString('location')}
Headline: ${currentLaunch.getString('headline')}
Descrição: ${currentLaunch.getString('description')}
Unidades: ${JSON.stringify(currentLaunch.get('units') || [])}
Condições de Pagamento: ${currentLaunch.getString('payment_terms')}
Diferenciais: ${JSON.stringify(currentLaunch.get('differentials') || [])}
Argumentos Comerciais: ${currentLaunch.getString('sales_arguments')}
Cadência Específica Atual: ${currentLaunch.getString('specific_cadence')}
Keywords: ${JSON.stringify(currentLaunch.get('keywords') || [])}
`
  }

  const systemInstructions = `Você é a Bia Mãe, Gerente Interna de Lançamentos e Inteligência da BRF Imóveis.
Você conversa diretamente com o Mauro (gestor da imobiliária) ou a equipe interna. Você NUNCA fala com clientes finais.
Sua missão:
1. Receber material cru de lançamentos (textos, tabelas, condições de pagamento, tipologias, áreas, etc).
2. Estruturar o Dossiê Completo do Lançamento e a Cadência Específica da Bia Atendente em 10 Passos (metodologia Eduardo Tevah / BRF Imóveis).
3. Quando sugerir ou atualizar dados estruturados para o dossiê, além da sua explicação cordial em português, inclua um bloco JSON delimitado por \`\`\`json_dossier e \`\`\` contendo os campos que você sugere atualizar:
Exemplo:
\`\`\`json_dossier
{
  "name": "Nome Comercial",
  "enterprise_name": "Nome Oficial do Empreendimento",
  "headline": "Frase de impacto para anúncio e landing page",
  "description": "Texto descritivo vendedor e claro",
  "location": "Bairro / Cidade - SC",
  "payment_terms": "Condições de entrada e parcelamento",
  "units": [
    { "id": "u-1", "typology": "2 Dormitórios", "area": "55m²", "price": "R$ 300.000", "available": true, "notes": "Sol da manhã" }
  ],
  "differentials": ["Piscina", "Salão de Festas", "Churrasqueira"],
  "sales_arguments": "Principais gatilhos e argumentos para os corretores",
  "specific_cadence": "Cadência completa em 10 passos para a Bia atendente usar neste lançamento...",
  "suggest_ready_for_review": true
}
\`\`\`
Se o usuário apenas estiver tirando dúvidas ou pedindo opinião, responda de forma consultiva e executiva.
${launchContext}`

  const messagesPayload = [{ role: 'system', content: systemInstructions }]

  // Adiciona histórico recente sanitizado
  for (const h of history.slice(-8)) {
    if (h && h.role && h.content) {
      messagesPayload.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: String(h.content),
      })
    }
  }

  messagesPayload.push({ role: 'user', content: message })

  try {
    let replyText = ''
    try {
      // Tenta utilizar o agente nativo bia-mae-launches se disponível na API de agentes
      const agentRes = $ai.agent('bia-mae-launches').chat({
        messages: messagesPayload,
      })
      if (agentRes && agentRes.content) {
        replyText = agentRes.content
      }
    } catch (agentErr) {
      console.log('Bia Mãe agent fallback to $ai.chat:', String(agentErr))
      const chatRes = $ai.chat({
        model: 'fast',
        messages: messagesPayload,
      })
      if (chatRes && chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message) {
        replyText = chatRes.choices[0].message.content || ''
      }
    }

    if (!replyText) {
      replyText =
        'Entendido. Estou analisando o material do lançamento para estruturar o dossiê e a cadência.'
    }

    // Extrai sugestão de dossier se presente
    let suggestedDossier = null
    const dossierMatch = replyText.match(/```json_dossier\s*([\s\S]*?)\s*```/)
    if (dossierMatch && dossierMatch[1]) {
      try {
        suggestedDossier = JSON.parse(dossierMatch[1])
      } catch (parseErr) {
        console.warn('Erro ao parsear json_dossier sugerido:', String(parseErr))
      }
    }

    return e.json(200, {
      reply: replyText,
      suggested_dossier: suggestedDossier,
    })
  } catch (err) {
    console.error('Erro na chamada da Bia Mãe:', String(err))
    return e.json(500, { error: 'Falha ao processar solicitação com a Bia Mãe: ' + String(err) })
  }
})

/**
 * Endpoint para publicar dossiê no cérebro da Bia atendente
 * POST /backend/v1/launches/:id/publish
 */
routerAdd('POST', '/backend/v1/launches/:id/publish', (e) => {
  const authRecord = e.requestInfo().auth
  if (!authRecord) {
    return e.json(401, { error: 'Não autorizado.' })
  }

  const launchId = e.request.pathValue('id')
  if (!launchId) {
    return e.json(400, { error: 'ID do lançamento obrigatório.' })
  }

  try {
    const launch = $app.findRecordById('launches', launchId)
    launch.set('status', 'publicado')
    $app.save(launch)

    // Log do evento
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('user_id', authRecord.id)
      log.set('type', 'launch_published')
      log.set(
        'message',
        `Dossiê "${launch.getString('name')}" publicado no cérebro da Bia atendente`,
      )
      log.set('details', `Slug: ${launch.getString('slug')} | Status: publicado`)
      $app.saveNoValidate(log)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `Dossiê "${launch.getString('name')}" publicado com sucesso no cérebro da Bia!`,
      status: 'publicado',
    })
  } catch (err) {
    return e.json(500, { error: 'Falha ao publicar lançamento: ' + String(err) })
  }
})
