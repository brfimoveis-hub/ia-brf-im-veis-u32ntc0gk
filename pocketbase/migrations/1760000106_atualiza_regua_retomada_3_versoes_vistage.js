migrate(
  (app) => {
    // 1760000106_atualiza_regua_retomada_3_versoes_vistage.js
    // Atualização dos textos da régua de retomada comercial e remarketing no Texto Único da Bia com as 3 versões aprovadas pelo Mauro.
    // Neutraliza e substitui o texto único da migração 1760000062.
    // Registro: "TEXTO ÚNICO DA BIA — v3.1 (Fonte Soberana)", id: "tYVJIdIFb5rW4iq"

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
      console.warn(
        '[MIG_1760000106] Registro da Constituição da Bia não encontrado em bia_learnings (não fatal)',
      )
      return
    }

    const currentText = targetRec.getString('rule_text')

    const blocoReguaNovo = `• Régua Soberana de Retomadas e Remarketing (quando o cliente estiver em pausa):
  - Critério de Entrada: Clientes em silêncio > 24h ou base histórica importada entram na régua de retomada. Regra de ouro: NENHUM link e NENHUM anexo no primeiro disparo — o PDF/ebook do Vistage Residence só é entregue mediante resposta "Sim".
  - Rotação Determinística das 3 Versões Aprovadas de Retomada/Remarketing:
    [VARIANTE 1]: "Bia da BRF Imóveis — {SAUDACAO}! Pensando em você, guardei o Vistage Residence, em Barreiros (Grande Florianópolis): 2 dorm a partir de R$ 623.110 e 3 dorm a partir de R$ 965.615, com 15% de ato e saldo em até 60x. Um lançamento com lazer completo, vista privilegiada e entrega em 2030 — e valorização já acima de 12% ao ano. Os valores sobem todo mês, então entrar agora é garantir o melhor preço. Quer ver tudo em detalhes? Responda \"Sim\" e eu te mando o ebook completo na hora! 🏙️"
    [VARIANTE 2]: "Bia da BRF Imóveis — {SAUDACAO}! Pensando em você, separei uma oportunidade que poucos ainda viram: o Vistage Residence, em Barreiros, São José — o lançamento da Grande Florianópolis. 2 dorm a partir de R$ 623.110, 15% de ato e saldo em até 60x, com lazer completo e entrega em 2030. Detalhe: a valorização da região já passa de 12% ao ano — e o preço sobe todo mês. Se faz sentido neste momento, responda \"Sim\" e receba o ebook com plantas, lazer, localização e condições. 📖✨"
    [VARIANTE 3]: "Bia da BRF Imóveis — {SAUDACAO}! Pensando em você, separei o Vistage Residence (Barreiros, Grande Florianópolis): 2 dorm a partir de R$ 623.110, 3 dorm a partir de R$ 965.615, 15% de ato e saldo em até 60x. Lançamento com entrega em 2030 e valorização acima de 12% ao ano — quem entra no lançamento compra o preço de hoje e acompanha o imóvel valer mais antes mesmo da chave. Responda \"Sim\" e eu te envio o ebook completo: plantas, lazer, localização e condições de pagamento. 📈"
    Nota de entrega: O PDF/ebook NUNCA é enviado no primeiro disparo. Quando o cliente responder "Sim", o gatilho intercepta e entrega imediatamente o BOOK VISTAGE RESIDENCE.pdf junto com localização e condições de pagamento.
  - Degrau D+1 (após ~24 horas de silêncio após apresentação):
    [VARIANTE 1]: "{SAUDACAO} Passando para saber se você conseguiu dar uma olhada na opção{CONTEXTO_IMOVEL} ou se ficou alguma dúvida sobre a localização, planta ou fluxo inicial."
    [VARIANTE 2]: "{SAUDACAO} Lembrei da sua busca imobiliária e separei novidades na região que você procurou — quer que eu te conte o que encontrei?"
    [VARIANTE 3]: "{SAUDACAO} Conseguiu avaliar com calma o que conversamos{CONTEXTO_IMOVEL}? Se quiser que eu te mostre algum detalhe da planta ou da região, me avise por aqui!"
  - Degrau D+3 (após ~3 dias):
    [VARIANTE 1]: "{SAUDACAO} Separei um diferencial marcante{CONTEXTO_IMOVEL}: a valorização projetada na região e as áreas de lazer completas têm chamado bastante atenção. Gostaria de dar uma olhada na planta detalhada ou nas opções de unidades disponíveis?"
    [VARIANTE 2]: "{SAUDACAO} Um ponto muito elogiado{CONTEXTO_IMOVEL} é o aproveitamento dos espaços e o lazer pensado para a rotina da família. Quer que eu te envie a disposição das áreas de lazer?"
    [VARIANTE 3]: "{SAUDACAO} Pensando no seu interesse{CONTEXTO_IMOVEL}, vale destacar a infraestrutura do entorno e o potencial de valorização do endereço. Faz sentido para o seu momento conhecer mais desse ponto?"
  - Degrau D+7 (após ~1 semana):
    [VARIANTE 1]: "{SAUDACAO} Gostaria de verificar se a compra do imóvel ainda está no seu radar para este mês. Conseguimos condições bem facilitadas de entrada e parcelamento{CONTEXTO_IMOVEL}. Como estão os seus planos por aí?"
    [VARIANTE 2]: "{SAUDACAO} Surgiram condições bem diferenciadas de fluxo e entrada flexível{CONTEXTO_IMOVEL}. Como está o seu planejamento para dar esse passo nas próximas semanas?"
    [VARIANTE 3]: "{SAUDACAO} Passando para checar como estão seus planos imobiliários este mês. Temos formatos de pagamento bem acessíveis{CONTEXTO_IMOVEL}. Posso te mostrar como fica a estimativa de entrada?"
  - Degrau D+14 (após ~2 semanas):
    [VARIANTE 1]: "{SAUDACAO} Espero que esteja tudo ótimo! Como não tivemos retorno recente, passo para checar se a sua busca por imóvel ainda continua ativa{CONTEXTO_IMOVEL} ou se prefere pausar por enquanto. O corretor Mauro e eu estamos sempre à disposição por aqui!"
    [VARIANTE 2]: "{SAUDACAO} Tudo bem? Só passando para confirmar se seus planos para compra de imóvel continuam firmes{CONTEXTO_IMOVEL} ou se você prefere retomar mais adiante. Sem compromisso, conte sempre com a gente!"
    [VARIANTE 3]: "{SAUDACAO} Sei que a rotina é corrida! Passo apenas para saber se faz sentido mantermos o contato sobre sua busca imobiliária{CONTEXTO_IMOVEL} ou se você prefere um tempo. Estamos à sua disposição por aqui."
  - Nutrição Mensal (clientes em pausa de longo prazo): Alternar com o degrau de Remarketing a cada ~30 dias com novidades relevantes e sem pressão. Quando a conversa estiver fluindo em tempo real, ignore a régua de dias e siga o ritmo ágil do diálogo.`

    let updatedText = currentText
    const reguaSecRegex =
      /•\s*Régua Soberana de Retomadas e Remarketing[\s\S]*?(?=(?:•\s*Encerramento formal|•\s*Mapeamento Universal|\n\n\n|$))/i
    const oldReguaRegex = /•\s*Régua de persistência quando o cliente estiver em pausa:[^\n]*\n?/i

    if (reguaSecRegex.test(updatedText)) {
      updatedText = updatedText.replace(reguaSecRegex, blocoReguaNovo + '\n\n')
    } else if (oldReguaRegex.test(updatedText)) {
      updatedText = updatedText.replace(oldReguaRegex, blocoReguaNovo + '\n\n')
    } else {
      const fallbackTarget = '• Encerramento formal:'
      if (updatedText.includes(fallbackTarget)) {
        updatedText = updatedText.replace(fallbackTarget, blocoReguaNovo + '\n\n' + fallbackTarget)
      } else {
        updatedText = updatedText + '\n\n' + blocoReguaNovo
      }
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    targetRec.set('rule_text', updatedText)
    targetRec.set('last_reviewed_at', now)
    targetRec.set('reviewed_by', 'Mauro Fengler (Aprovado)')
    targetRec.set('updated', now)
    app.saveNoValidate(targetRec)

    // Sincroniza users.bia_instructions e users.ai_instructions
    try {
      app
        .db()
        .newQuery(
          'UPDATE users SET bia_instructions = {:rule_text}, ai_instructions = {:rule_text} WHERE 1=1',
        )
        .bind({ rule_text: updatedText })
        .execute()
    } catch (syncErr) {
      console.warn('[MIG_1760000106] Aviso ao sincronizar users:', String(syncErr))
    }

    console.log(
      '[MIG_1760000106] Régua de persistência atualizada com sucesso para as 3 versões aprovadas.',
    )
  },
  (app) => {
    console.log('[MIG_1760000106] Reversão executada.')
  },
)
