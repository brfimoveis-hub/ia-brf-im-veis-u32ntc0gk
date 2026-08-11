migrate(
  (app) => {
    // Locate the BRF Imóveis user record.
    let record
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {
      throw new Error('User brfimoveis@gmail.com not found')
    }
    if (record.id !== 'g5jto8bhulw01bz') {
      throw new Error('Unexpected user id: ' + record.id)
    }

    // ---- TAREFA 1: append operational directives to ai_instructions ----
    const aiBlock = [
      '',
      '',
      'DIRETRIZES OPERACIONAIS COMPLEMENTARES:',
      '',
      '1. GESTÃO DE INTERRUPÇÕES — Se o cliente exigir o preço antes da Cadência 4 (Apresentação de Valor), responda EXATAMENTE: "Com certeza, vou te passar os valores agora mesmo. Apenas para eu te enviar a unidade com o melhor custo-benefício para o seu perfil, o que é mais importante para você além do valor?" Essa resposta redireciona para a Descoberta da Necessidade sem confrontar o cliente.',
      '',
      '2. ADAPTAÇÃO DE RITMO — Se o cliente demonstrar pragmatismo (respostas curtas, objetivas, perguntas diretas sobre preço/prazos), acelere as Cadências 1 a 3 mas NUNCA pule a profundidade técnica. Faça perguntas de descoberta embutidas nas respostas, sem parecer um interrogatório.',
      '',
      '3. REGISTRO OBRIGATÓRIO — Toda interação deve gerar um resumo implícito para personalização futura. Ao final de cada troca significativa, a Bia deve internamente consolidar: perfil do cliente, objeções levantadas, estágio atual no funil e próximo passo recomendado. Use as tags [PROFILE: ...], [STATUS: ...] e [HANDOVER: ...] ao final de cada interação.',
      '',
      '4. TEMPO DE MATURAÇÃO — Respeite o silêncio do cliente (não pressione antes de 24h após último contato). Porém, o fluxo nunca deve ser abandonado: se o cliente ficar 48h sem resposta, reengaje com conteúdo de valor (nunca use mensagens como "sumiu?" ou "ainda tem interesse?" — ofereça algo útil relacionado ao imóvel ou ao bairro).',
    ].join('\n')

    // ---- TAREFA 2: append adaptive response format to bia_instructions ----
    const biaBlock = [
      '',
      '',
      'FORMATO DE RESPOSTA ADAPTATIVO: A Bia deve SEMPRE responder no mesmo formato em que o cliente se comunicou. Se o cliente enviou uma mensagem de texto, responda com texto. Se o cliente enviou um áudio, responda com áudio. Se o cliente enviou uma imagem ou vídeo, responda com texto + áudio descrevendo que recebeu o arquivo e dando continuidade à conversa. Essa adaptação é essencial para manter a naturalidade e o conforto do cliente em cada interação.',
    ].join('\n')

    const aiBefore = record.getString('ai_instructions')
    const biaBefore = record.getString('bia_instructions')

    const aiAfter = aiBefore + aiBlock
    const biaAfter = biaBefore + biaBlock

    record.set('ai_instructions', aiAfter)
    record.set('bia_instructions', biaAfter)
    app.save(record)

    console.log('=== BIA DIRECTIVES APPEND REPORT ===')
    console.log('ai_instructions BEFORE length:', aiBefore.length)
    console.log('ai_instructions AFTER length: ', aiAfter.length)
    console.log('bia_instructions BEFORE length:', biaBefore.length)
    console.log('bia_instructions AFTER length: ', biaAfter.length)
    console.log(
      '400000 char limit check — ai:',
      aiAfter.length <= 400000,
      '| bia:',
      biaAfter.length <= 400000,
    )
    console.log('=== END REPORT ===')
  },
  (app) => {
    // Best-effort revert: strip the appended blocks if re-run in down direction.
    let record
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    } catch (_) {
      return
    }
    const aiMarker = '\n\nDIRETRIZES OPERACIONAIS COMPLEMENTARES:'
    const biaMarker = '\n\nFORMATO DE RESPOSTA ADAPTATIVO:'
    const ai = record.getString('ai_instructions')
    const bia = record.getString('bia_instructions')
    const aiIdx = ai.indexOf(aiMarker)
    if (aiIdx !== -1) record.set('ai_instructions', ai.slice(0, aiIdx))
    const biaIdx = bia.indexOf(biaMarker)
    if (biaIdx !== -1) record.set('bia_instructions', bia.slice(0, biaIdx))
    app.save(record)
  },
)
