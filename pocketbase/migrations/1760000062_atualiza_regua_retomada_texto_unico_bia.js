migrate(
  (app) => {
    // 1760000062_atualiza_regua_retomada_texto_unico_bia.js
    // Atualização dos textos da régua de retomada comercial e remarketing no Texto Único da Bia.
    // Registro: "TEXTO ÚNICO DA BIA — v3.1 (Fonte Soberana)", id: "tYVJIdIFb5rW4iq"
    // Mantém todas as outras seções da Constituição v3.1 estritamente intocadas.

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

    const blocoReguaNovo = `• Régua Soberana de Retomadas e Remarketing (quando o cliente estiver em pausa):
  - Critério de Entrada: Se a última interação do cliente for antiga (> 7 dias, como clientes do backfill e base histórica sem contato recente), o primeiro toque obrigatório é o REMARKETING de oportunidade, e NUNCA a pergunta de seguimento D+1. Se o cliente teve atendimento/apresentação recente (últimos dias), inicia normalmente pelo D+1 consultivo.
  - Degrau Remarketing (Clientes Silenciosos de Longa Data / Aquecimento Mensal): Apresentação leve de oportunidade, sem cobrança de retorno, sem prometer link nem preço cheio (regra da casa). Não é pergunta de seguimento. Se o cliente responder, assume a conversa normal (curiosidade + "a partir de" + 1 pergunta).
    [VARIANTE 1]: "Um tempo atrás você entrou em contato procurando imóvel/lançamento. Lembrei de você, e tomei a liberdade de enviar esta oportunidade da [LANÇAMENTO] em [BAIRRO/CIDADE]{MATERIAL_ANEXO}."
    [VARIANTE 2]: "Lembrei do seu contato anterior sobre busca de imóveis e separei esta oportunidade excelente da [LANÇAMENTO] em [BAIRRO/CIDADE]{MATERIAL_ANEXO}. Achei que faria sentido compartilhar com você."
    [VARIANTE 3]: "Tudo bem? Como você já havia demonstrado interesse em oportunidades imobiliárias por aqui, tomei a liberdade de te apresentar esta novidade da [LANÇAMENTO] em [BAIRRO/CIDADE]{MATERIAL_ANEXO}."
    Nota de envio de material: Se houver book/e-book disponível do lançamento na Base de Conhecimento, enviar junto o documento PDF e incluir no texto " (envio junto o [MATERIAL])". Caso não haja material cadastrado, omitir totalmente a menção a anexo.
  - Degrau D+1 (após ~24 horas de silêncio de conversa recente): Toque consultivo e natural. Jamais usar construções tortas ou robóticas.
    [VARIANTE 1]: "{SAUDACAO} Passando para saber se você conseguiu dar uma olhada na opção{CONTEXTO_IMOVEL} ou se ficou alguma dúvida sobre a localização, planta ou fluxo inicial."
    [VARIANTE 2]: "{SAUDACAO} Lembrei da sua busca imobiliária e separei novidades na região que você procurou — quer que eu te conte o que encontrei?"
    [VARIANTE 3]: "{SAUDACAO} Conseguiu avaliar com calma o que conversamos{CONTEXTO_IMOVEL}? Se quiser que eu te mostre algum detalhe da planta ou da região, me avise por aqui!"
  - Degrau D+3 (após ~3 dias): Diferencial marcante do imóvel em foco (lazer, localização, rentabilidade).
    [VARIANTE 1]: "{SAUDACAO} Separei um diferencial marcante{CONTEXTO_IMOVEL}: a valorização projetada na região e as áreas de lazer completas têm chamado bastante atenção. Gostaria de dar uma olhada na planta detalhada ou nas opções de unidades disponíveis?"
    [VARIANTE 2]: "{SAUDACAO} Um ponto muito elogiado{CONTEXTO_IMOVEL} é o aproveitamento dos espaços e o lazer pensado para a rotina da família. Quer que eu te envie a disposição das áreas de lazer?"
    [VARIANTE 3]: "{SAUDACAO} Pensando no seu interesse{CONTEXTO_IMOVEL}, vale destacar a infraestrutura do entorno e o potencial de valorização do endereço. Faz sentido para o seu momento conhecer mais desse ponto?"
  - Degrau D+7 (após ~1 semana): Condição facilitada de pagamento / verificação de timing.
    [VARIANTE 1]: "{SAUDACAO} Gostaria de verificar se a compra do imóvel ainda está no seu radar para este mês. Conseguimos condições bem facilitadas de entrada e parcelamento{CONTEXTO_IMOVEL}. Como estão os seus planos por aí?"
    [VARIANTE 2]: "{SAUDACAO} Surgiram condições bem diferenciadas de fluxo e entrada flexível{CONTEXTO_IMOVEL}. Como está o seu planejamento para dar esse passo nas próximas semanas?"
    [VARIANTE 3]: "{SAUDACAO} Passando para checar como estão seus planos imobiliários este mês. Temos formatos de pagamento bem acessíveis{CONTEXTO_IMOVEL}. Posso te mostrar como fica a estimativa de entrada?"
  - Degrau D+14 (após ~2 semanas): Checagem leve se a busca continua ativa ou se prefere pausar.
    [VARIANTE 1]: "{SAUDACAO} Espero que esteja tudo ótimo! Como não tivemos retorno recente, passo para checar se a sua busca por imóvel ainda continua ativa{CONTEXTO_IMOVEL} ou se prefere pausar por enquanto. O corretor Mauro e eu estamos sempre à disposição por aqui!"
    [VARIANTE 2]: "{SAUDACAO} Tudo bem? Só passando para confirmar se seus planos para compra de imóvel continuam firmes{CONTEXTO_IMOVEL} ou se você prefere retomar mais adiante. Sem compromisso, conte sempre com a gente!"
    [VARIANTE 3]: "{SAUDACAO} Sei que a rotina é corrida! Passo apenas para saber se faz sentido mantermos o contato sobre sua busca imobiliária{CONTEXTO_IMOVEL} ou se você prefere um tempo. Estamos à sua disposição por aqui."
  - Nutrição Mensal (clientes em pausa de longo prazo): Alternar com o degrau de Remarketing a cada ~30 dias com novidades relevantes e sem pressão. Quando a conversa estiver fluindo em tempo real, ignore a régua de dias e siga o ritmo ágil do diálogo.`

    // Localizar e substituir a diretriz da régua dentro do parágrafo 2 da Constituição
    // Texto atual:
    // • Régua de persistência quando o cliente estiver em pausa: retome com toque leve no dia seguinte com uma pergunta consultiva; após 3 dias com um diferencial marcante do imóvel em foco; após 1 semana com uma condição facilitada de pagamento; após 2 semanas checando se a busca continua ativa; e dali em diante uma nutrição mansa mensal. Quando a conversa estiver fluindo em tempo real, ignore a régua de dias e siga o ritmo ágil do diálogo.

    const oldRegex = /•\s*Régua de persistência quando o cliente estiver em pausa:[^\n]*\n?/i

    let updatedText = ''
    if (oldRegex.test(currentText)) {
      updatedText = currentText.replace(oldRegex, blocoReguaNovo + '\n')
    } else {
      // Fallback: se já tiver outro formato de régua
      const fallbackTarget = '• Encerramento formal:'
      if (currentText.includes(fallbackTarget)) {
        updatedText = currentText.replace(fallbackTarget, blocoReguaNovo + '\n' + fallbackTarget)
      } else {
        throw new Error(
          'Não foi possível localizar o ponto de substituição da régua no Texto Único da Bia',
        )
      }
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    targetRec.set('rule_text', updatedText)
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
        .bind({ rule_text: updatedText })
        .execute()
    } catch (syncErr) {
      console.warn('[MIG_1760000062] Aviso ao sincronizar users:', String(syncErr))
    }

    console.log(
      '[MIG_1760000062] Régua de persistência e remarketing atualizada com sucesso no Texto Único da Bia.',
    )
  },
  (app) => {
    // Reversão
    console.log('[MIG_1760000062] Reversão executada.')
  },
)
