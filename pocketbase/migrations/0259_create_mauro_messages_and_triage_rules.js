migrate(
  (app) => {
    // 1. Obter IDs das coleções existentes com segurança
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const customersCol = app.findCollectionByNameOrId('customers')

    let mauroMessagesCol = null
    try {
      mauroMessagesCol = app.findCollectionByNameOrId('mauro_messages')
    } catch (_) {
      mauroMessagesCol = null
    }

    if (!mauroMessagesCol) {
      const collection = new Collection({
        name: 'mauro_messages',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'user_id', type: 'relation', collectionId: usersCol.id, required: false },
          { name: 'customer_id', type: 'relation', collectionId: customersCol.id, required: false },
          { name: 'contact_name', type: 'text', required: false },
          { name: 'contact_phone', type: 'text', required: false },
          { name: 'channel', type: 'text', required: false }, // whatsapp, instagram, messenger
          { name: 'category', type: 'text', required: true }, // fornecedor, parceria, imprensa, financeiro, falar_com_mauro, duvida_escalonamento, outros
          { name: 'summary', type: 'text', required: false }, // Resumo inteligente do assunto gerado pela IA
          { name: 'incoming_message', type: 'text', required: false }, // Mensagem original do contato
          { name: 'bia_response', type: 'text', required: false }, // Resposta cordial enviada pela Bia
          {
            name: 'status',
            type: 'select',
            values: ['pendente', 'lido', 'resolvido'],
            required: false,
          },
          { name: 'urgency', type: 'number', required: false }, // 1 a 5
          { name: 'resolved_at', type: 'date', required: false },
          { name: 'resolved_by', type: 'text', required: false },
          { name: 'forwarded_to_phone', type: 'text', required: false }, // ex: 5548999728050
          { name: 'forwarded_status', type: 'text', required: false }, // sent, failed, notified_dashboard
          { name: 'metadata', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mauro_messages_status ON mauro_messages (status)',
          'CREATE INDEX idx_mauro_messages_created ON mauro_messages (created)',
          'CREATE INDEX idx_mauro_messages_category ON mauro_messages (category)',
        ],
      })
      app.save(collection)
    }

    // 2. Atualizar diretrizes da Bia nos usuários com o prompt de Triagem Não-Comercial e Escalonamento para o Mauro 48999728050
    let users = []
    try {
      users = app.findRecordsByFilter('users', "email != ''", '', 1000, 0)
    } catch (_) {
      users = []
    }

    const triageRulesSection = `

======================================================================
6. REGRA MANDATÓRIA DE TRIAGEM DE ASSUNTOS NÃO-COMERCIAIS E ESCALONAMENTO
======================================================================

A) TRIAGEM DE ASSUNTOS NÃO-COMERCIAIS ("AS INFINITAS POSSIBILIDADES"):
Quando um contato enviar mensagem sobre qualquer assunto NÃO-COMERCIAL, a Bia DEVE responder com profissionalismo, educação e empatia, e NÃO deve tentar vender imóveis nem forçar qualificação de compra/locação.

Categorias amplas de triagem não-comercial:
1. FORNECEDOR / PRESTADOR DE SERVIÇOS: empresas de tecnologia, materiais, engenharia, manutenção, softwares, serviços gerais.
2. PARCERIA / PROPOSTAS COMERCIAIS: outros corretores querendo parceria externa, arquitetos, designers, fundos, bancos, permutas corporativas fora do escopo direto de venda.
3. IMPRENSA / MÍDIA / MARKETING: jornalistas, portais de notícia, criadores de conteúdo, ofertas de publicidade.
4. FINANCEIRO / COBRANÇA / CONTABILIDADE: cobrança de notas, boletos, bancos, dúvidas contábeis, repasses, notas fiscais.
5. PEDIDO EXPLÍCITO DE FALAR COM O DONO / MAURO: "quero falar com o Mauro", "sou amigo do Mauro", "cadê o Mauro?", "falar com o responsável/diretor".
6. ASSUNTOS ADMINISTRATIVOS, INSTITUCIONAIS OU OUTRAS INFINITAS POSSIBILIDADES: qualquer contato que não seja cliente em busca de compra/locação/venda no portfólio.

RESPOSTA PADRÃO PARA ASSUNTOS NÃO-COMERCIAIS:
- Agradeça cordialmente pelo contato com a BRF Imóveis com saudação temporal.
- Explique brevemente e com educação que este canal é o atendimento comercial da imobiliária.
- Confirme que a mensagem e os dados foram recebidos e anotados com carinho e que serão repassados diretamente para o Mauro (responsável), sem prometer prazos rígidos.
- Emita a tag [TRIAGE: categoria | resumo curto] no final da mensagem (ex: [TRIAGE: financeiro | Cobrança de nota fiscal do fornecedor X] ou [TRIAGE: falar_com_mauro | Contato pede para falar com o Mauro]).

B) ENCAMINHAMENTO QUANDO NÃO SOUBER RESPONDER / FORA DO ESCOPO:
- Se o contato fizer uma pergunta técnica que você não sabe responder, fora do escopo, ambígua ou que você não consiga classificar com segurança:
  * NUNCA invente informações, dados, prazos ou regras da imobiliária.
  * Responda cordialmente: agradeça, diga que para prestar a informação mais precisa e com total segurança você repassou o caso diretamente ao Mauro (48 99972-8050 / Gestão BRF Imóveis).
  * Emita a tag [HANDOVER: Mauro] e [TRIAGE: duvida_escalonamento | Dúvida fora do escopo / pergunta técnica não dominada].`

    for (const u of users) {
      const curBia = u.getString('bia_instructions') || ''
      const curAi = u.getString('ai_instructions') || ''

      if (!curBia.includes('TRIAGEM DE ASSUNTOS NÃO-COMERCIAIS')) {
        u.set('bia_instructions', curBia + triageRulesSection)
      }
      if (!curAi.includes('TRIAGEM DE ASSUNTOS NÃO-COMERCIAIS')) {
        u.set('ai_instructions', curAi + triageRulesSection)
      }
      app.saveNoValidate(u)
    }

    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('type', 'bia_triage_migration')
      log.set(
        'message',
        'Tabela mauro_messages criada e regras de triagem não-comercial registradas no prompt da Bia',
      )
      log.set(
        'details',
        'Suporte a categorias: fornecedor, parceria, imprensa, financeiro, falar_com_mauro, duvida_escalonamento, outros. Escalonamento para Mauro 48999728050.',
      )
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {
    const col = app.findCollectionByNameOrId('mauro_messages')
    if (col) {
      app.delete(col)
    }
  },
)
