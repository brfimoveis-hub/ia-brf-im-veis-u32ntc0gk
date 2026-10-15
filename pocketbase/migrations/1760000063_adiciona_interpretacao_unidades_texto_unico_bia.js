migrate(
  (app) => {
    // 1760000063_adiciona_interpretacao_unidades_texto_unico_bia.js
    // Implantação da FRENTE 2 no Texto Único da Bia (bia_learnings id tYVJIdIFb5rW4iq, prioridade 1000)
    // Diretriz aprovada: [INTERPRETAÇÃO DE UNIDADES E PLANTAS ESPECÍFICAS]
    // Inserção no bloco de apresentação de valores (Art. 6 / Art. 10), sem alterar o restante da Constituição.

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

    const blocoAprovado = `[INTERPRETAÇÃO DE UNIDADES E PLANTAS ESPECÍFICAS]:
Quando o cliente perguntar o preço de uma unidade específica (ex.: "AP 302", "unidade 501"):
1. Verifique a tipologia correspondente no dossiê do lançamento em foco e apresente o valor oficial daquela tipologia conforme a tabela vigente do dossiê.
2. NUNCA cite um valor genérico incompatível com a unidade perguntada.
3. Se a numeração não permitir identificar com precisão a tipologia no dossiê, informe os valores-base das tipologias disponíveis e pergunte ao lead qual a tipologia da unidade de interesse antes de fechar a condição.`

    if (currentText.includes('[INTERPRETAÇÃO DE UNIDADES E PLANTAS ESPECÍFICAS]')) {
      console.log(
        '[MIG_1760000063] Diretriz de interpretação de unidades já presente. Nada a fazer.',
      )
      return
    }

    // Inserir preferencialmente após "• Apresentação de unidades em lançamentos: ..." na Seção 6
    const targetAnchor = '• Apresentação de unidades em lançamentos:'
    let updatedText = ''

    if (currentText.includes(targetAnchor)) {
      // Localiza o fim da linha ou do parágrafo do anchor
      const idx = currentText.indexOf(targetAnchor)
      const nextNewline = currentText.indexOf('\n', idx)
      const insertPos = nextNewline !== -1 ? nextNewline + 1 : idx + targetAnchor.length
      updatedText =
        currentText.substring(0, insertPos) +
        '\n' +
        blocoAprovado +
        '\n' +
        currentText.substring(insertPos)
    } else {
      // Fallback: anexa antes da seção 7
      const sec7Anchor = '7. DOMÍNIO GEOGRÁFICO REAL'
      if (currentText.includes(sec7Anchor)) {
        updatedText = currentText.replace(sec7Anchor, blocoAprovado + '\n\n' + sec7Anchor)
      } else {
        updatedText = currentText + '\n\n' + blocoAprovado
      }
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    targetRec.set('rule_text', updatedText)
    targetRec.set('updated', now)
    targetRec.set('last_reviewed_at', now)
    app.saveNoValidate(targetRec)

    // Sincroniza users.bia_instructions e ai_instructions se aplicável
    try {
      app
        .db()
        .newQuery(
          'UPDATE users SET bia_instructions = {:rule_text}, ai_instructions = {:rule_text} WHERE 1=1',
        )
        .bind({ rule_text: updatedText })
        .execute()
    } catch (uErr) {
      console.warn('[MIG_1760000063] Aviso ao sincronizar users:', String(uErr))
    }

    console.log(
      '[MIG_1760000063] Diretriz de interpretação de unidades implantada com sucesso no Texto Único da Bia.',
    )
  },
  (app) => {
    // Reversão
    try {
      const rec = app.findRecordById('bia_learnings', 'tYVJIdIFb5rW4iq')
      if (rec) {
        let txt = rec.getString('rule_text')
        const blocoAprovado = `[INTERPRETAÇÃO DE UNIDADES E PLANTAS ESPECÍFICAS]:
Quando o cliente perguntar o preço de uma unidade específica (ex.: "AP 302", "unidade 501"):
1. Verifique a tipologia correspondente no dossiê do lançamento em foco e apresente o valor oficial daquela tipologia conforme a tabela vigente do dossiê.
2. NUNCA cite um valor genérico incompatível com a unidade perguntada.
3. Se a numeração não permitir identificar com precisão a tipologia no dossiê, informe os valores-base das tipologias disponíveis e pergunte ao lead qual a tipologia da unidade de interesse antes de fechar a condição.`
        txt = txt.replace(blocoAprovado, '').replace(/\n{3,}/g, '\n\n')
        rec.set('rule_text', txt)
        app.saveNoValidate(rec)
      }
    } catch (_) {}
  },
)
