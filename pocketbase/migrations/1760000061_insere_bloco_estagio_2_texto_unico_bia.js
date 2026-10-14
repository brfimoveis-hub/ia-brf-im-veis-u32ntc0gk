migrate(
  (app) => {
    // 1760000061_insere_bloco_estagio_2_texto_unico_bia.js
    // Implantação de bloco aprovado pelo usuário (Mauro) no Estágio 2 (Acolhimento/Mapeamento)
    // Registro: "TEXTO ÚNICO DA BIA — v3.1 (Fonte Soberana)", id: "tYVJIdIFb5rW4iq"
    // Sem sobrepor nem alterar nenhuma outra regra existente do texto.

    const targetRecordId = 'tYVJIdIFb5rW4iq'
    let targetRec = null
    try {
      targetRec = app.findRecordById('bia_learnings', targetRecordId)
    } catch (_) {
      targetRec = null
    }

    if (!targetRec) {
      const activeRecs = app.findRecordsByFilter(
        'bia_learnings',
        'is_active = true',
        '-priority,-created',
        1,
        0,
      )
      if (activeRecs && activeRecs.length > 0) {
        targetRec = activeRecs[0]
      }
    }

    if (!targetRec) {
      throw new Error('Registro da Constituição da Bia não encontrado em bia_learnings')
    }

    const currentText = targetRec.getString('rule_text')

    const blocoAprovado = `No Estágio 2, antes de qualquer apresentação: seu primeiro objetivo é conhecer profundamente o cliente. Descubra com UMA pergunta leve, por vez, o motivo real que o trouxe até nós (aproximação do trabalho ou da faculdade, saída do aluguel, família crescendo, investimento, mudança de cidade). Depois identifique o potencial (faixa), o desejo (o que ele quer sentir no imóvel) e o tempo dele para realizar a compra. Descubra também o que o cliente NÃO abre mão no seu novo endereço: sacada, piscina, preço do condomínio, vista e outros detalhes do imóvel — assim a Bia deixa de oferecer imóvel fora do padrão e da expectativa do cliente e vai direto ao ponto. Técnica do fogo e da água: absorva o entusiasmo do cliente (o fogo aquece a conversa) sem se empolgarem juntos — a água apaga e traz de volta a calma: acolha o entusiasmo, mas mantenha o passo sereno e a sintonia. Só ofereça o imóvel depois de saber claramente a necessidade; e apresente, então, aquilo que mais se afina com o potencial, o desejo e o tempo dele — nunca o catálogo inteiro.`

    // Verifica se o bloco já não foi inserido
    if (currentText.includes(blocoAprovado)) {
      console.log('[MIG_1760000061] Bloco já presente no texto. Nada a fazer.')
      return
    }

    // Localiza o Estágio 2 dentro do texto existente
    // Padrão atual:
    // • Estágio 2 — Validação no CRM (Fase: Atendimento):
    //   - Objetivo: Estabelecer diálogo conversacional fluido, mapeando localização de preferência e faixa aproximada de investimento com UMA pergunta por vez.
    //   - Tags de CRM: [STATUS: Validação no CRM] [PHASE: Atendimento] [NEIGHBORHOOD: ...] [PRICE_RANGE: ...]
    const stage2Pattern = /•\s*Estágio\s*2[^\n]*\n([\s\S]*?)(?=\n•\s*Estágio\s*3)/i
    const match = currentText.match(stage2Pattern)

    let updatedText = ''
    if (match) {
      const oldStage2Block = match[0]
      // Inserimos a diretriz do usuário dentro do Estágio 2, preservando o cabeçalho, Objetivo, Tags e formato de bullets
      const newStage2Block = `• Estágio 2 — Validação no CRM (Fase: Atendimento):
  - Objetivo: Estabelecer diálogo conversacional fluido, mapeando localização de preferência e faixa aproximada de investimento com UMA pergunta por vez.
  - Diretriz Soberana de Diagnóstico e Conexão: ${blocoAprovado}
  - Tags de CRM: [STATUS: Validação no CRM] [PHASE: Atendimento] [NEIGHBORHOOD: ...] [PRICE_RANGE: ...]`

      updatedText = currentText.replace(oldStage2Block, newStage2Block)
    } else {
      // Fallback cirúrgico caso haja variação de formatação no cabeçalho
      const fallbackTarget = '• Estágio 3 — Contato Personalizado'
      if (currentText.includes(fallbackTarget)) {
        const insertion = `  - Diretriz Soberana de Diagnóstico e Conexão: ${blocoAprovado}\n\n`
        updatedText = currentText.replace(fallbackTarget, insertion + fallbackTarget)
      } else {
        throw new Error('Não foi possível localizar o Estágio 2 / Estágio 3 no Texto Único da Bia')
      }
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    targetRec.set('rule_text', updatedText)
    targetRec.set('last_reviewed_at', now)
    targetRec.set('reviewed_by', 'Mauro Fengler')
    targetRec.set('updated', now)
    app.saveNoValidate(targetRec)

    // Sincroniza users.bia_instructions e users.ai_instructions com o mesmo texto atualizado
    try {
      app
        .db()
        .newQuery(
          'UPDATE users SET bia_instructions = {:rule_text}, ai_instructions = {:rule_text} WHERE 1=1',
        )
        .bind({ rule_text: updatedText })
        .execute()
    } catch (syncErr) {
      console.warn('[MIG_1760000061] Aviso ao sincronizar users:', String(syncErr))
    }

    console.log('[MIG_1760000061] Bloco inserido com sucesso no Estágio 2 do Texto Único da Bia.')
  },
  (app) => {
    // Reversão: remove o bloco inserido no Estágio 2 se necessário
    try {
      const targetRec = app.findRecordById('bia_learnings', 'tYVJIdIFb5rW4iq')
      if (targetRec) {
        const text = targetRec.getString('rule_text')
        const blocoAprovado = `No Estágio 2, antes de qualquer apresentação: seu primeiro objetivo é conhecer profundamente o cliente. Descubra com UMA pergunta leve, por vez, o motivo real que o trouxe até nós (aproximação do trabalho ou da faculdade, saída do aluguel, família crescendo, investimento, mudança de cidade). Depois identifique o potencial (faixa), o desejo (o que ele quer sentir no imóvel) e o tempo dele para realizar a compra. Descubra também o que o cliente NÃO abre mão no seu novo endereço: sacada, piscina, preço do condomínio, vista e outros detalhes do imóvel — assim a Bia deixa de oferecer imóvel fora do padrão e da expectativa do cliente e vai direto ao ponto. Técnica do fogo e da água: absorva o entusiasmo do cliente (o fogo aquece a conversa) sem se empolgarem juntos — a água apaga e traz de volta a calma: acolha o entusiasmo, mas mantenha o passo sereno e a sintonia. Só ofereça o imóvel depois de saber claramente a necessidade; e apresente, então, aquilo que mais se afina com o potencial, o desejo e o tempo dele — nunca o catálogo inteiro.`

        const cleanedText = text
          .replace(`  - Diretriz Soberana de Diagnóstico e Conexão: ${blocoAprovado}\n`, '')
          .replace(blocoAprovado, '')

        targetRec.set('rule_text', cleanedText)
        app.saveNoValidate(targetRec)

        try {
          app
            .db()
            .newQuery(
              'UPDATE users SET bia_instructions = {:rule_text}, ai_instructions = {:rule_text} WHERE 1=1',
            )
            .bind({ rule_text: cleanedText })
            .execute()
        } catch (_) {}
      }
    } catch (_) {}
  },
)
