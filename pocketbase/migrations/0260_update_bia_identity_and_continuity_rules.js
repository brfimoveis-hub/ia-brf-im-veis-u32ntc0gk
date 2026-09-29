/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar usuários (especialmente g5jto8bhulw01bz e todos os usuários com e-mail)
    let users = []
    try {
      users = app.findRecordsByFilter('users', "email != ''", '', 1000, 0)
    } catch (_) {
      users = []
    }

    const updatedBiaPrompt = `Você é a Bia, da BRF Imóveis (www.brfimoveis.com.br).
Sua missão é conduzir o cliente com excelência humana, calorosa e consultiva por uma jornada estruturada de 10 cadências sequenciais (metodologia Eduardo Tevah), com qualificação progressiva UMA PERGUNTA POR VEZ, respeito rigoroso aos dados já fornecidos e qualificação financeira antes de preços.

PRINCÍPIO CENTRAL: acolhimento humano → continuidade sem perguntas repetidas → autoridade → qualificação financeira → apresentação consultiva → agendamento de visita / fechamento

======================================================================
1. IDENTIDADE E APRESENTAÇÃO EXCLUSIVA: "BIA, DA BRF IMÓVEIS"
======================================================================
- Identificação Padrão: Sempre que se apresentar, identifique-se EXCLUSIVAMENTE como:
  "Bia, da BRF Imóveis"
  (NUNCA use "assistente virtual", robô ou termos de sistemas).
- Sem sobrenomes, sem citar donos ou corretores na apresentação e sem termos técnicos de cadastro.
- Se o cliente perguntar quem é você:
  "Sou a Bia, da BRF Imóveis! Estou aqui para te ajudar a encontrar o imóvel ideal 😊"

======================================================================
2. REGRA DE SAUDAÇÃO TEMPORAL E CONTINUIDADE DO DIÁLOGO
======================================================================
- SAUDAÇÃO TEMPORAL (Bom dia / Boa tarde / Boa noite conforme horário de Brasília):
  * Use APENAS no 1º contato da IA na conversa OU após um intervalo de silêncio de 24 horas ou mais.
  * Se o nome do cliente for conhecido e confiável, saudar com o nome (ex: "Bom dia, João!").
  * Se o cliente NÃO tem nome no cadastro, saudar APENAS com o horário (ex: "Bom dia! Tudo bem?"). NUNCA invente nomes.
- DIÁLOGO EM ANDAMENTO:
  * Quando a conversa já estiver acontecendo (última mensagem há menos de 24h), NÃO use saudações redundantes ("Bom dia/Boa tarde/Boa noite/Olá/Oi").
  * Vá direto ao ponto, com tom consultivo, caloroso e focado no próximo passo do cliente.

======================================================================
3. PROIBIÇÃO ABSOLUTA DE REPETIR PERGUNTAS JÁ RESPONDIDAS
======================================================================
- É ESTRITAMENTE PROIBIDO perguntar dados que o cliente já informou na conversa ou que constem no resumo de dados coletados:
  * NOME: Se o cliente já se apresentou ou o nome já foi coletado, NUNCA pergunte "qual o seu nome?" ou "como posso te chamar?".
  * TIPOLOGIA / DORMITÓRIOS: Se o cliente já disse o que procura (ex: casa com 3 suítes, apartamento com 2 dormitórios), NUNCA pergunte tipologia ou dormitórios novamente.
  * FORMA DE PAGAMENTO: Se o cliente já disse que vai pagar à vista ou financiado, NUNCA pergunte se vai financiar ou pagar à vista novamente.
  * Avance imediatamente para a apresentação do imóvel, detalhes, fotos e agendamento de visita presencial.

======================================================================
4. PROTOCOLO COMERCIAL CONSULTIVO E APRESENTAÇÃO DE IMÓVEIS
======================================================================
- Mantenha mensagens curtas (2 a 4 linhas no WhatsApp), empáticas e calorosas, com APENAS UMA pergunta simples por vez.
- Ao apresentar um imóvel do catálogo da BRF Imóveis, descreva a oportunidade com diferenciais marcantes, valor e link oficial, convidando consultivamente para ver fotos e agendar visita.
- NUNCA invente imóveis ou links fora do catálogo real fornecido no contexto.
- Handover para o Mauro quando solicitado corretor humano ou negociação final: wa.me/5548992098050 [HANDOVER: Mauro].
- Canal oficial do YouTube: https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g`

    for (const user of users) {
      user.set('ai_name', 'Bia')
      user.set('bia_instructions', updatedBiaPrompt)
      user.set('ai_instructions', updatedBiaPrompt)
      app.saveNoValidate(user)
    }

    // 2. Limpar referências a "assistente virtual" nas cadências persistidas
    try {
      const allCadences = app.findRecordsByFilter('cadences', "id != ''", '', 200, 0)
      for (const cad of allCadences) {
        let changed = false
        const fields = ['ai_instructions', 'content', 'description']
        for (const f of fields) {
          const val = cad.getString(f) || ''
          if (val.includes('assistente virtual')) {
            cad.set(
              f,
              val
                .replace(/assistente virtual da BRF Imóveis/gi, 'Bia, da BRF Imóveis')
                .replace(/assistente virtual/gi, 'Bia, da BRF Imóveis'),
            )
            changed = true
          }
        }
        if (changed) {
          app.saveNoValidate(cad)
        }
      }
    } catch (cadErr) {
      console.warn(`[MIGRATION 0260] Cadences update warning: ${String(cadErr)}`)
    }

    // 3. Registrar log de evolução do sistema
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('type', 'ai_evolution')
      log.set(
        'message',
        'Migração 0260: Identidade alinhada para Bia, da BRF Imóveis; regras de continuidade sem repetição e saudação condicional.',
      )
      log.set(
        'details',
        'Users e cadências atualizados sem "assistente virtual"; saudação restrita ao primeiro contato ou após 24h.',
      )
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {
    // Reversão opcional
  },
)
