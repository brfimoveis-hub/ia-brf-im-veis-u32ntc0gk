migrate(
  (app) => {
    // 1760000071_atualiza_saudacao_e_regras_texto_unico_bia.js
    //
    // TRÊS MUDANÇAS NA CONSTITUIÇÃO DA BIA (bia_learnings id='tYVJIdIFb5rW4iq'):
    // 1. SAUDAÇÃO COM IDENTIFICAÇÃO:
    //    Na primeira mensagem ao cliente (primeiro contato, retomada, remarketing), a Bia SEMPRE se identifica:
    //    "Bia da BRF Imóveis — bom dia/boa tarde/boa noite, tudo bem?" (com nome quando conhecido e confiável).
    //    Em diálogo contínuo (janela de 24h em andamento) NÃO repete a identificação.
    // 2. ATUALIZAÇÃO DOS MODELOS DA RÉGUA DE RETOMADA:
    //    Variantes de Remarketing e Follow-up iniciam com a saudação identificada {SAUDACAO}.
    // 3. REGRA DE PREÇO DO MAURO:
    //    Quando o cliente pedir preço, a Bia SEMPRE segue a tabela do dossiê do imóvel
    //    e NUNCA o valor citado em link ou material de divulgação (links são apenas referência e podem estar desatualizados).
    console.log(
      '[MIG_1760000071] Atualizando Texto Único da Bia com identificação e regra de preços...',
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
        '[MIG_1760000071] Registro da Constituição da Bia não encontrado em bia_learnings (base vazia). Ignorando.',
      )
      return
    }

    let currentText = targetRec.getString('rule_text') || ''

    // 1. Atualizar ou inserir diretriz de Identificação e Saudação no topo das regras de atendimento
    const diretrizIdentificacao = `• Identificação e Saudação Obrigatória da Bia:
  - Na PRIMEIRA mensagem ao cliente (seja primeiro contato, retomada ou remarketing), a Bia DEVE sempre se identificar com clareza e elegância:
    "Bia da BRF Imóveis — bom dia/boa tarde/boa noite, tudo bem?" (ou com o primeiro nome do cliente quando confiável, ex.: "Bia da BRF Imóveis — bom dia, João, tudo bem?").
  - Em diálogo contínuo (conversa ativa dentro da janela de 24 horas), é TERMINANTEMENTE PROIBIDO repetir a apresentação "Bia da BRF Imóveis" ou saudações temporais repetitivas. O diálogo contínuo vai direto ao ponto de forma consultiva e dinâmica.`

    if (currentText.includes('• Identificação e Saudação Obrigatória da Bia:')) {
      currentText = currentText.replace(
        /•\s*Identificação e Saudação Obrigatória da Bia:.*?(?=\n•|\n\d+\.|$)/s,
        diretrizIdentificacao + '\n',
      )
    } else {
      // Inserir antes da régua de retomadas
      const pontoInsercao = '• Régua Soberana de Retomadas e Remarketing'
      if (currentText.includes(pontoInsercao)) {
        currentText = currentText.replace(
          pontoInsercao,
          diretrizIdentificacao + '\n\n' + pontoInsercao,
        )
      } else {
        currentText = diretrizIdentificacao + '\n\n' + currentText
      }
    }

    // 2. Atualizar as variantes de Remarketing no bloco da régua para utilizarem {SAUDACAO}
    currentText = currentText.replace(
      /\[VARIANTE 1\]:\s*"Um tempo atrás você entrou em contato procurando imóvel\/lançamento\. Lembrei de você, e tomei a liberdade de enviar esta oportunidade da \[LANÇAMENTO\] em \[BAIRRO\/CIDADE\]\{MATERIAL_ANEXO\}\."/g,
      '[VARIANTE 1]: "{SAUDACAO} Lembrei de você e separei esta oportunidade do [LANÇAMENTO] em [BAIRRO/CIDADE]{MATERIAL_ANEXO}. Como estão os seus planos imobiliários por aí?"',
    )
    currentText = currentText.replace(
      /\[VARIANTE 2\]:\s*"Lembrei do seu contato anterior sobre busca de imóveis e separei esta oportunidade excelente da \[LANÇAMENTO\] em \[BAIRRO\/CIDADE\]\{MATERIAL_ANEXO\}\. Achei que faria sentido compartilhar com você\."/g,
      '[VARIANTE 2]: "{SAUDACAO} Como você já havia demonstrado interesse em oportunidades imobiliárias por aqui, tomei a liberdade de te apresentar esta novidade do [LANÇAMENTO] em [BAIRRO/CIDADE]{MATERIAL_ANEXO}."',
    )
    currentText = currentText.replace(
      /\[VARIANTE 3\]:\s*"Tudo bem\? Como você já havia demonstrado interesse em oportunidades imobiliárias por aqui, tomei a liberdade de te apresentar esta novidade da \[LANÇAMENTO\] em \[BAIRRO\/CIDADE\]\{MATERIAL_ANEXO\}\."/g,
      '[VARIANTE 3]: "{SAUDACAO} Lembrei da sua busca por imóvel e separei esta oportunidade especial do [LANÇAMENTO] em [BAIRRO/CIDADE]{MATERIAL_ANEXO}. Faz sentido para você conhecer mais detalhes?"',
    )

    // 3. REGRA DE PREÇO DO MAURO (Soberania absoluta do dossiê):
    const regraPrecoMauro = `• REGRA SOBERANA DE PREÇO (DIRETRIZ PERMANENTE DE MAURO FENGLER):
  - Quando o cliente solicitar preço, fluxo ou condição de pagamento, a Bia SEMPRE segue estritamente a tabela oficial de valores constante no DOSSIÊ DO IMÓVEL (catálogo oficial / cadastro do lançamento).
  - NUNCA use nem repita valores mencionados em links de sites, vídeos ou materiais promocionais de divulgação (esses links são apenas referência visual e conceitual e podem estar defasados).
  - A tabela do dossiê oficial é a ÚNICA fonte de verdade jurídica e comercial autorizada para cotação de valores e fluxo de pagamento.`

    if (currentText.includes('• REGRA SOBERANA DE PREÇO')) {
      currentText = currentText.replace(
        /•\s*REGRA SOBERANA DE PREÇO.*?(?=\n•|\n\d+\.|$)/s,
        regraPrecoMauro + '\n',
      )
    } else {
      const anchorInterp = '[INTERPRETAÇÃO DE UNIDADES E PLANTAS ESPECÍFICAS]:'
      if (currentText.includes(anchorInterp)) {
        currentText = currentText.replace(anchorInterp, regraPrecoMauro + '\n\n' + anchorInterp)
      } else {
        currentText = currentText + '\n\n' + regraPrecoMauro
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
      console.warn('[MIG_1760000071] Aviso ao sincronizar users:', String(syncErr))
    }

    console.log('[MIG_1760000071] Texto Único da Bia atualizado com sucesso!')
  },
  (app) => {
    console.log('[MIG_1760000071] Reversão executada.')
  },
)
