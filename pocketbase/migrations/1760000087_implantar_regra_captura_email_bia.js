migrate(
  (app) => {
    // 1760000087_implantar_regra_captura_email_bia.js
    //
    // IMPLANTAÇÃO DA REGRA SOBERANA DE CAPTURA DE E-MAIL DA BIA
    // Pedido do Mauro: "como faço para ativar essa regra para capturar o email"
    //
    // Diretrizes aprovadas:
    // 1. Pedido APENAS em conversa qualificada (depois que o cliente respondeu/demonstrou interesse real).
    //    PROIBIDO na primeira mensagem, na apresentação fria ou antes do cliente demonstrar interesse.
    // 2. Pedido natural e leve com justificativa útil (enviar material completo, tabela, condições do lançamento em foco).
    //    Máximo de 1 pedido de e-mail por conversa. Se o cliente não quiser, não insistir.
    // 3. Ao receber o e-mail, confirmar naturalmente ("Anotado! Te envio por lá também") e emitir tag [EMAIL: endereco@dominio.com].
    // 4. Se o formato enviado pelo cliente for claramente inválido, pedir confirmação uma única vez de forma leve.
    // 5. Se o cliente já possuir e-mail cadastrado no CRM, NUNCA pedir novamente.

    console.log(
      '[MIG_1760000087] Implantando regra soberana de captura de e-mail na Constituição da Bia...',
    )

    const targetRecordId = 'tYVJIdIFb5rW4iq'
    let targetRec = null

    try {
      const foundRecs = app.findRecordsByFilter(
        'bia_learnings',
        `id = '${targetRecordId}' || is_active = true`,
        '-priority,-created',
        1,
        0,
      )
      if (foundRecs && foundRecs.length > 0) {
        targetRec = foundRecs[0]
      }
    } catch (_) {}

    if (!targetRec) {
      console.warn(
        '[MIG_1760000087] Registro da Constituição da Bia não encontrado em bia_learnings (base vazia).',
      )
      return
    }

    let currentText = targetRec.getString('rule_text') || ''

    const regraCapturaEmail = `• REGRA SOBERANA DE CAPTURA DE E-MAIL (DIRETRIZ PERMANENTE DE MAURO FENGLER):
  1. MOMENTO OBRIGATÓRIO (APENAS EM CONVERSA QUALIFICADA):
     - A Bia pede o e-mail do cliente APENAS depois que o cliente já respondeu e demonstrou interesse real (Estágio 2. Qualificação em diante, após o cliente perguntar sobre plantas, valores, localização ou solicitar materiais).
     - É TERMINANTEMENTE PROIBIDO pedir o e-mail na 1ª mensagem de apresentação, em mensagens frias ou antes do cliente ter demonstrado interesse recíproco.
  2. TOM LEVE E JUSTIFICATIVA ÚTIL (NUNCA PARECER FORMULÁRIO):
     - O pedido deve ser natural, espontâneo e justificado com um benefício claro para o cliente. Exemplo: "Se quiser, me passa seu melhor e-mail que te mando a lâmina completa com as plantas e a tabela de valores por lá também!" ou "Qual o seu melhor e-mail para eu te enviar o book completo do [LANÇAMENTO] em alta resolução?".
     - NUNCA pareça um questionário ou coletora de dados.
  3. REGRA DE UMA ÚNICA TENTATIVA (SEM INSISTÊNCIA):
     - No máximo 1 pedido de e-mail por conversa.
     - Se o cliente não quiser informar ou ignorar o pedido de e-mail, aceite com total naturalidade e continue a conversa no WhatsApp sem insistir.
     - Se o cliente já tiver e-mail informado ou cadastrado no CRM, NUNCA peça novamente.
  4. RECEBIMENTO E CONFIRMAÇÃO NATURAL:
     - Quando o cliente fornecer o e-mail, confirme com simpatia e agilidade (ex.: "Perfeito, já anotei seu e-mail! Vou deixar registrado e te envio por lá também.") e emita internamente a tag de máquina [EMAIL: usuario@dominio.com] para persistência automática no CRM.
  5. VALIDAÇÃO SIMPLES DE FORMATO:
     - Se o cliente mandar algo que nitidamente não é um e-mail (faltou o @ ou domínio), confira uma única vez de forma amigável: "Acho que faltou alguma letrinha no seu e-mail, você poderia conferir?". Se ainda assim não vier correto, não trave a conversa; siga atendendo com excelência pelo WhatsApp.`

    if (currentText.includes('• REGRA SOBERANA DE CAPTURA DE E-MAIL')) {
      currentText = currentText.replace(
        /•\s*REGRA SOBERANA DE CAPTURA DE E-MAIL.*?(?=\n•|\n\d+\.|$)/s,
        regraCapturaEmail + '\n',
      )
    } else {
      // Inserir logo após a Regra Soberana de Preço
      const pontoInsercaoPreco = '• REGRA SOBERANA DE PREÇO'
      if (currentText.includes(pontoInsercaoPreco)) {
        // Encontra o fim do bloco de preço
        const posPreco = currentText.indexOf(pontoInsercaoPreco)
        const proximoBloco = currentText.indexOf('\n•', posPreco + pontoInsercaoPreco.length)
        if (proximoBloco !== -1) {
          currentText =
            currentText.substring(0, proximoBloco) +
            '\n\n' +
            regraCapturaEmail +
            currentText.substring(proximoBloco)
        } else {
          currentText = currentText + '\n\n' + regraCapturaEmail
        }
      } else {
        currentText = currentText + '\n\n' + regraCapturaEmail
      }
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    targetRec.set('rule_text', currentText)
    targetRec.set('last_reviewed_at', now)
    targetRec.set('reviewed_by', 'Mauro Fengler')
    targetRec.set('updated', now)
    app.saveNoValidate(targetRec)

    // Sincroniza users.bia_instructions e users.ai_instructions
    try {
      app
        .db()
        .newQuery(
          'UPDATE users SET bia_instructions = {:rule_text}, ai_instructions = {:rule_text} WHERE 1=1',
        )
        .bind({ rule_text: currentText })
        .execute()
    } catch (syncErr) {
      console.warn('[MIG_1760000087] Aviso ao sincronizar users:', String(syncErr))
    }

    console.log(
      '[MIG_1760000087] Regra de captura de e-mail implantada com sucesso no Texto Único!',
    )
  },
  (app) => {
    console.log('[MIG_1760000087] Reversão executada.')
  },
)
