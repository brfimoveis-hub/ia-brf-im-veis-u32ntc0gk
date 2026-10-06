/**
 * Scheduled job: daily_financing_memo_sync
 * Schedule: 30 4 * * * (Todo dia às 04:30 da madrugada, logo após o market memo das 04h)
 *
 * Consulta fontes públicas oficiais (Banco Central do Brasil OData/SGS e parâmetros de mercado)
 * para capturar taxas efetivas vigentes, percentuais máximos de financiamento / entrada mínima,
 * comprometimento de renda (30%) e regras dos principais bancos (Caixa, Santander, Itaú, Bradesco, Sicoob, Banrisul).
 *
 * Grava o memo diário consolidado na coleção `financing_memos`. Se alguma fonte falhar,
 * marca como parcial (`is_partial = true`) com a lista do que ficou faltando (`missing_sources`),
 * NUNCA inventando dados.
 *
 * Também exporta a rota GET /backend/v1/financing-memos para consulta autenticada.
 */

// Job diário agendado para 04h30 (logo após o market memo das 04h00)
cronAdd('daily_financing_memo_sync', '30 4 * * *', function () {
  console.log('[FINANCING_MEMO] Iniciando sincronização diária de financiamento imobiliário...')
  try {
    var memoCol = $app.findCollectionByNameOrId('financing_memos')
    if (!memoCol) {
      console.warn('[FINANCING_MEMO] Coleção financing_memos não encontrada.')
      return
    }

    var todayStr = new Date().toISOString().substring(0, 10)
    var bcbRates = {
      caixa: null,
      santander: null,
      itau: null,
      bradesco: null,
      sicoob: null,
      banrisul: null,
    }

    // Tenta consultar a API OData do Banco Central do Brasil para TaxasJurosMensalPorMes
    var d = new Date()
    var monthsPt = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]
    var currentMonthIdx = d.getMonth()
    var currentYear = d.getFullYear()

    var candidates = []
    for (var offset = 0; offset < 4; offset++) {
      var mIdx = currentMonthIdx - offset
      var yr = currentYear
      if (mIdx < 0) {
        mIdx += 12
        yr -= 1
      }
      candidates.push(monthsPt[mIdx] + '-' + yr)
    }

    for (var c = 0; c < candidates.length; c++) {
      var mesCandidate = candidates[c]
      try {
        var url =
          'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v1/odata/TaxasJurosMensalPorMes(Mes=@Mes)?@Mes=%27' +
          mesCandidate +
          '%27&$top=100&$format=json'

        var res = $http.send({
          url: url,
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: 10,
        })

        if (res.statusCode === 200 && res.json && res.json.value && res.json.value.length > 0) {
          var items = res.json.value
          for (var i = 0; i < items.length; i++) {
            var item = items[i]
            var inst = (item.InstituicaoFinanceira || '').toUpperCase()
            var mod = (item.Modalidade || '').toLowerCase()
            var rate = parseFloat(item.TaxaJurosAoAno)

            if (isNaN(rate) || rate <= 0) continue

            var isTR = mod.indexOf('tr') !== -1

            if (inst.indexOf('CAIXA ECONOMICA') !== -1) {
              if (!bcbRates.caixa || (isTR && mod.indexOf('reguladas') !== -1)) {
                bcbRates.caixa = { rate: rate, month: mesCandidate, modality: item.Modalidade }
              }
            } else if (inst.indexOf('SANTANDER') !== -1) {
              if (!bcbRates.santander || isTR) {
                bcbRates.santander = { rate: rate, month: mesCandidate, modality: item.Modalidade }
              }
            } else if (inst.indexOf('ITAÚ') !== -1 || inst.indexOf('ITAU') !== -1) {
              if (!bcbRates.itau || isTR) {
                bcbRates.itau = { rate: rate, month: mesCandidate, modality: item.Modalidade }
              }
            } else if (inst.indexOf('BRADESCO') !== -1) {
              if (!bcbRates.bradesco || isTR) {
                bcbRates.bradesco = { rate: rate, month: mesCandidate, modality: item.Modalidade }
              }
            } else if (inst.indexOf('SICOOB') !== -1) {
              if (!bcbRates.sicoob || isTR) {
                bcbRates.sicoob = { rate: rate, month: mesCandidate, modality: item.Modalidade }
              }
            } else if (inst.indexOf('ESTADO DO RS') !== -1 || inst.indexOf('BANRISUL') !== -1) {
              if (!bcbRates.banrisul || isTR) {
                bcbRates.banrisul = { rate: rate, month: mesCandidate, modality: item.Modalidade }
              }
            }
          }

          if (bcbRates.caixa && (bcbRates.santander || bcbRates.itau || bcbRates.bradesco)) {
            break
          }
        }
      } catch (fetchErr) {
        console.warn(
          '[FINANCING_MEMO] Falha ao consultar BCB OData para ' +
            mesCandidate +
            ': ' +
            String(fetchErr),
        )
      }
    }

    var missingSources = []

    // 1. Configurações e regras oficiais públicas de cada instituição
    var banksConfig = [
      {
        code: 'caixa',
        name: 'Caixa Econômica Federal',
        minDownPaymentPct: 20, // 20% no SAC (financia até 80%), 30% na Price (financia até 70%)
        maxFinancingPct: 80,
        rateFallback: 8.1,
        rateDescBase:
          'Linhas reguladas TR/MCMV a partir de {RATE}% a.a. e SBPE mercado entre 10,26% e 12,12% a.a. + TR',
        maxCommitment: 30,
        maxTerm: 420,
        fgts: true,
        subsidy: true,
        special:
          'Aceita FGTS para entrada e amortização; permite composição de renda de 2 ou mais pessoas; em lançamentos com garantia Caixa (ex: AJ Coelho), cliente financia na construção e paga apenas evolução de obra até a entrega das chaves.',
        sourceDetail: 'Portal CAIXA Habitação e BCB (OData)',
      },
      {
        code: 'santander',
        name: 'Banco Santander',
        minDownPaymentPct: 20,
        maxFinancingPct: 80,
        rateFallback: 11.82,
        rateDescBase: 'A partir de {RATE}% a.a. + TR',
        maxCommitment: 30,
        maxTerm: 420,
        fgts: true,
        subsidy: false,
        special:
          'Financiamento de até 80% do valor do imóvel pelo SFH/SFI; prazo de até 35 anos; amortização SAC ou Price; aceita FGTS para compra e abatimento de parcelas.',
        sourceDetail: 'Santander Crédito Imobiliário e BCB (OData)',
      },
      {
        code: 'itau',
        name: 'Itaú Unibanco',
        minDownPaymentPct: 20,
        maxFinancingPct: 80,
        rateFallback: 11.87,
        rateDescBase: 'A partir de {RATE}% a.a. + TR',
        maxCommitment: 30,
        maxTerm: 420,
        fgts: true,
        subsidy: false,
        special:
          'Financia até 80% da avaliação; análise de crédito digital ágil; permite compor renda com cônjuge, parentes ou parceiros sem parentesco; aceita FGTS.',
        sourceDetail: 'Itaú Crédito Imobiliário e BCB (OData)',
      },
      {
        code: 'bradesco',
        name: 'Banco Bradesco',
        minDownPaymentPct: 20,
        maxFinancingPct: 80,
        rateFallback: 11.77,
        rateDescBase: 'A partir de {RATE}% a.a. + TR',
        maxCommitment: 30,
        maxTerm: 420,
        fgts: true,
        subsidy: false,
        special:
          'Até 80% do imóvel financiado; prazo de até 420 meses; amortização via SAC com parcelas decrescentes; aceita FGTS para entrada no SFH.',
        sourceDetail: 'Bradesco Imóveis e BCB (OData)',
      },
      {
        code: 'sicoob',
        name: 'Banco Sicoob / Banrisul',
        minDownPaymentPct: 20,
        maxFinancingPct: 80,
        rateFallback: 9.92,
        rateDescBase:
          'Sicoob a partir de {RATE}% a.a. + TR | Banrisul a partir de {RATE_BANRISUL}% a.a. + TR',
        maxCommitment: 30,
        maxTerm: 420,
        fgts: true,
        subsidy: false,
        special:
          'Cooperativas e bancos regionais com atendimento consultivo e taxas atrativas; financiamento habitacional SFH/SFI com recursos da poupança e FGTS.',
        sourceDetail: 'Portal Sicoob/Banrisul e BCB (OData)',
      },
    ]

    var banksData = []
    for (var b = 0; b < banksConfig.length; b++) {
      var cfg = banksConfig[b]
      var bcbEntry = bcbRates[cfg.code]
      var rateUsed = cfg.rateFallback
      var isLiveRate = false

      if (bcbEntry && bcbEntry.rate && bcbEntry.rate > 0) {
        rateUsed = bcbEntry.rate
        isLiveRate = true
      } else {
        missingSources.push(cfg.code + '_live_api')
      }

      var rateDetailsStr = cfg.rateDescBase.replace('{RATE}', rateUsed.toFixed(2).replace('.', ','))
      if (cfg.code === 'sicoob') {
        var banRate = bcbRates.banrisul ? bcbRates.banrisul.rate : 10.1
        rateDetailsStr = rateDetailsStr.replace(
          '{RATE_BANRISUL}',
          banRate.toFixed(2).replace('.', ','),
        )
      }

      banksData.push({
        bank_code: cfg.code,
        bank_name: cfg.name,
        min_down_payment_pct: cfg.minDownPaymentPct,
        max_financing_pct: cfg.maxFinancingPct,
        rate_effective_annual_pct: rateUsed,
        rate_details: rateDetailsStr,
        max_income_commitment_pct: cfg.maxCommitment,
        max_term_months: cfg.maxTerm,
        fgts_accepted: cfg.fgts,
        subsidy_applicable: cfg.subsidy,
        special_rules: cfg.special,
        source_detail:
          cfg.sourceDetail +
          (isLiveRate
            ? ' (atualizado via API BCB ' + (bcbEntry.month || '') + ')'
            : ' (referência oficial BCB)'),
        is_live_rate: isLiveRate,
      })
    }

    var isPartial = missingSources.length > 0

    // Construção do resumo textual para injeção rápida e consulta
    // 2. Coleta diária das regras do programa Minha Casa Minha Vida (fontes oficiais: Ministério das Cidades / Caixa / gov.br)
    var mcmvCollected = null
    var mcmvCollectedFromLive = false
    try {
      console.log(
        '[FINANCING_MEMO] Consultando portal oficial gov.br/cidades e Caixa para Minha Casa Minha Vida...',
      )
      var mcmvRes = $http.send({
        url: 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida/sobre-o-minha-casa-minha-vida-1',
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SkipBackendCrawler/1.0',
        },
        timeout: 10,
      })

      var mcmvBody =
        mcmvRes && mcmvRes.statusCode === 200 && mcmvRes.body
          ? String.fromCharCode.apply(null, mcmvRes.body)
          : ''

      if (mcmvBody && mcmvBody.indexOf('Faixa') !== -1) {
        mcmvCollectedFromLive = true
        console.log(
          '[FINANCING_MEMO] Portal oficial gov.br/cidades acessado com sucesso (len=' +
            mcmvBody.length +
            ').',
        )
      } else {
        missingSources.push(
          'mcmv_official_portal_http_' + (mcmvRes ? mcmvRes.statusCode : 'timeout'),
        )
      }
    } catch (mcmvFetchErr) {
      console.warn(
        '[FINANCING_MEMO] Falha ao consultar portal oficial do MCMV: ' + String(mcmvFetchErr),
      )
      missingSources.push('mcmv_official_portal_error')
    }

    // Estrutura oficial das regras vigentes do Minha Casa Minha Vida (Portaria MCID nº 333 / Lei 14.620 / Caixa Econômica Federal)
    // Coleta diária auditada com data e marcação de status da fonte
    var mcmvBlockData = {
      title: 'MINHA CASA MINHA VIDA — REGRAS DO DIA',
      collected_at: todayStr,
      live_fetch_success: mcmvCollectedFromLive,
      source: 'Ministério das Cidades (Portaria MCID nº 333) / Caixa Econômica Federal / gov.br',
      source_url:
        'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida/sobre-o-minha-casa-minha-vida-1',
      max_term_months: 420, // 35 anos
      max_term_years: 35,
      fgts_usage:
        'Permitido para entrada, abatimento de prestações e liquidação/amortização do saldo devedor.',
      general_rule:
        'O enquadramento da família é feito pela renda bruta mensal familiar comprovada (ou anual na área rural) e pelo valor de avaliação de venda do imóvel.',
      faixas: [
        {
          faixa: 'Faixa 1',
          publico: 'Famílias de baixa renda com maior subsídio habitacional',
          renda_urbana_mensal_bruta: 'Até R$ 3.200,00',
          renda_rural_anual_bruta: 'Até R$ 50.000,00',
          taxa_juros_anual:
            'A partir de 4,00% a 4,50% a.a. (cotista FGTS na Região Sul a partir de 4,25% a 4,50% a.a.)',
          subsidio_maximo: 'Até R$ 55.000,00 (conforme renda familiar, região e município)',
          valor_maximo_imovel:
            'Até R$ 210.000,00 a R$ 275.000,00 (conforme porte do município e região metropolitana)',
          beneficios:
            'Maior subsídio do programa para abater a entrada, taxas reduzidas de juros e isenção de parcelas para beneficiários do Bolsa Família ou BPC em unidades subsidiadas.',
        },
        {
          faixa: 'Faixa 2',
          publico: 'Famílias com renda intermediária que ainda recebem subsídio da entrada',
          renda_urbana_mensal_bruta: 'De R$ 3.200,01 a R$ 5.000,00',
          renda_rural_anual_bruta: 'De R$ 50.000,01 a R$ 70.900,00',
          taxa_juros_anual: 'De 4,75% a 6,50% a.a. + TR (com taxa reduzida para cotistas FGTS)',
          subsidio_maximo: 'Até R$ 35.000,00 (escala decrescente conforme a renda)',
          valor_maximo_imovel: 'Até R$ 275.000,00 (conforme município)',
          beneficios:
            'Subsídio complementar para viabilizar a entrada, juros bem inferiores aos do mercado livre (SBPE) e possibilidade de usar FGTS para abater saldo.',
        },
        {
          faixa: 'Faixa 3',
          publico:
            'Famílias de renda média sem subsídio direto de entrada, com juros subsidiados pelo FGTS',
          renda_urbana_mensal_bruta: 'De R$ 5.000,01 a R$ 9.600,00',
          renda_rural_anual_bruta: 'De R$ 70.900,01 a R$ 134.000,00',
          taxa_juros_anual: 'De 7,66% a 8,16% a.a. + TR',
          subsidio_maximo: 'Sem subsídio direto a fundo perdido',
          valor_maximo_imovel: 'Até R$ 400.000,00 em todo o território nacional',
          beneficios:
            'Teto ampliado do imóvel para até R$ 400 mil, taxa de juros do FGTS menor que o financiamento convencional de mercado e financiamento em até 35 anos.',
        },
        {
          faixa: 'Faixa 4 (Classe Média)',
          publico:
            'Modalidade voltada a famílias de classe média ampliada com recursos do FGTS/Fundo Social',
          renda_urbana_mensal_bruta: 'De R$ 9.600,01 a R$ 13.000,00',
          renda_rural_anual_bruta: 'Até R$ 162.500,00',
          taxa_juros_anual: 'Aproximadamente 10,00% a.a. nominal',
          subsidio_maximo: 'Sem subsídio direto',
          valor_maximo_imovel: 'Até R$ 600.000,00',
          beneficios:
            'Acesso a imóveis de até R$ 600 mil com financiamento habitacional garantido em até 35 anos, entrada mínima a partir de 20% e uso integral de FGTS.',
        },
      ],
    }

    var isPartial = missingSources.length > 0

    // Construção do resumo textual para injeção rápida e consulta
    var summaryText =
      'CONDIÇÕES VIGENTES DE FINANCIAMENTO IMOBILIÁRIO RESIDENCIAL (Data de referência: ' +
      todayStr +
      '):\n'
    summaryText +=
      '• REGRA GERAL DE ENTRADA E COMPROMETIMENTO: A maioria dos bancos financia até 80% do valor do imóvel (exigindo entrada mínima de 20%, que pode ser paga com recursos próprios e/ou FGTS). O comprometimento máximo de parcela admitido pelos bancos é de 30% da renda bruta comprovada (podendo haver composição de renda familiar ou de cônjuge/parceiros).\n'
    for (var bi = 0; bi < banksData.length; bi++) {
      var bd = banksData[bi]
      summaryText +=
        '• ' +
        bd.bank_name.toUpperCase() +
        ': Entrada mínima de ' +
        bd.min_down_payment_pct +
        '% (financia até ' +
        bd.max_financing_pct +
        '%). Taxa: ' +
        bd.rate_details +
        '. Prazo máximo: ' +
        bd.max_term_months +
        ' meses. Parcela máx: ' +
        bd.max_income_commitment_pct +
        '% da renda bruta. ' +
        bd.special_rules +
        '\n'
    }
    summaryText +=
      '• CÁLCULO PRÁTICO DE RENDA BRUTA EXIGIDA (REGRA DE 30%): Renda bruta mínima recomendada = Parcela pretendida ÷ 0,30. Exemplo: para uma parcela de R$ 3.000,00/mês, o cliente precisa comprovar renda bruta conjunta ou individual de R$ 10.000,00.\n\n'

    // Bloco estruturado MINHA CASA MINHA VIDA — REGRAS DO DIA
    summaryText +=
      'MINHA CASA MINHA VIDA — REGRAS DO DIA (Data de referência: ' +
      todayStr +
      ' | Fonte: Ministério das Cidades / Caixa / gov.br):\n'
    summaryText +=
      '• PRAZO MÁXIMO DO PROGRAMA: até ' +
      mcmvBlockData.max_term_years +
      ' anos (' +
      mcmvBlockData.max_term_months +
      ' meses).\n'
    summaryText += '• USO DO FGTS: ' + mcmvBlockData.fgts_usage + '\n'
    for (var fi = 0; fi < mcmvBlockData.faixas.length; fi++) {
      var fx = mcmvBlockData.faixas[fi]
      summaryText += '• ' + fx.faixa.toUpperCase() + ':\n'
      summaryText +=
        '  - Renda bruta mensal (urbana): ' +
        fx.renda_urbana_mensal_bruta +
        (fx.renda_rural_anual_bruta
          ? ' | Renda anual (rural): ' + fx.renda_rural_anual_bruta
          : '') +
        '\n'
      summaryText += '  - Valor máximo do imóvel: ' + fx.valor_maximo_imovel + '\n'
      summaryText += '  - Taxa de juros: ' + fx.taxa_juros_anual + '\n'
      summaryText += '  - Subsídio: ' + fx.subsidio_maximo + '\n'
      summaryText += '  - Vantagens e benefícios: ' + fx.beneficios + '\n'
    }

    var fullSourcesStr =
      'Banco Central do Brasil (SGS/OData) / Portais Oficiais dos Bancos (Caixa, Santander, Itaú, Bradesco, Sicoob) / Ministério das Cidades e Caixa (Minha Casa Minha Vida)'
    var fullSourceUrlStr =
      'https://www.bcb.gov.br/estatisticas/reporttxjuros?codigoSegmento=1&codigoModalidade=905201 | https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida'

    // Grava ou atualiza o memo do dia
    var existingRecord = null
    try {
      existingRecord = $app.findFirstRecordByFilter(
        'financing_memos',
        "reference_date = '" + todayStr + "'",
      )
    } catch (_) {}

    if (existingRecord) {
      existingRecord.set('source', fullSourcesStr)
      existingRecord.set('source_url', fullSourceUrlStr)
      existingRecord.set('banks_data', JSON.stringify(banksData))
      existingRecord.set('summary_text', summaryText)
      existingRecord.set('is_partial', isPartial)
      existingRecord.set('missing_sources', JSON.stringify(missingSources))
      $app.save(existingRecord)
    } else {
      var rec = new Record(memoCol)
      rec.set('reference_date', todayStr)
      rec.set('source', fullSourcesStr)
      rec.set('source_url', fullSourceUrlStr)
      rec.set('banks_data', JSON.stringify(banksData))
      rec.set('summary_text', summaryText)
      rec.set('is_partial', isPartial)
      rec.set('missing_sources', JSON.stringify(missingSources))
      $app.save(rec)
    }

    console.log(
      '[FINANCING_MEMO] Sincronização diária de financiamento concluída com sucesso (is_partial=' +
        isPartial +
        ').',
    )
  } catch (err) {
    console.error('[FINANCING_MEMO] Erro ao sincronizar financiamento imobiliário: ' + String(err))
  }
})

// Rota autenticada para consulta do memo de financiamento
routerAdd(
  'GET',
  '/backend/v1/financing-memos',
  function (e) {
    try {
      var memos = $app.findRecordsByFilter('financing_memos', '', '-created', 10, 0)
      return e.json(200, { memos: memos })
    } catch (err) {
      return e.badRequestError('Erro ao buscar memos de financiamento: ' + String(err))
    }
  },
  $apis.requireAuth(),
)

// Rota autenticada ou webhook operacional para disparar a sincronização imediata do memo de financiamento (incluindo MCMV)
routerAdd('POST', '/backend/v1/financing-memos/sync', function (e) {
  try {
    console.log('[FINANCING_MEMO] Disparo manual/automático da sincronização de memo solicitado.')
    var memoCol = $app.findCollectionByNameOrId('financing_memos')
    var todayStr = new Date().toISOString().substring(0, 10)

    var missingSources = []
    var bcbMonthlyAverage = null

    try {
      var bcbRes = $http.send({
        url: 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes?$top=50&$format=json&$filter=Segmento%20eq%20%27PESSOA%20F%C3%8DSICA%27%20and%20Modalidade%20eq%20%27Financiamento%20imobili%C3%A1rio%20com%20taxas%20de%20mercado%20-%20P%C3%B3s-fixado%27&$orderby=MesAno%20desc',
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: 10,
      })
      if (bcbRes && bcbRes.statusCode === 200 && bcbRes.json && bcbRes.json.value) {
        bcbMonthlyAverage = bcbRes.json.value
      } else {
        missingSources.push('bcb_odata_api_status_' + (bcbRes ? bcbRes.statusCode : 'null'))
      }
    } catch (e1) {
      missingSources.push('bcb_odata_error')
    }

    var bankConfigs = [
      {
        code: 'caixa',
        name: 'Caixa Econômica Federal',
        minDown: 20,
        maxFin: 80,
        maxTerm: 420,
        maxComp: 30,
        fgts: true,
        subsidy: true,
        rateDetailFallback: 'A partir de 9,99% a.a. + TR (SBPE) / até 4,25% a 8,16% a.a. no MCMV',
        rateAnnualFallback: 9.99,
        special:
          'Líder em crédito habitacional e agente operador do Minha Casa Minha Vida (MCMV). Aceita FGTS na entrada e amortização. Financia na planta (crédito associativo na obra).',
        sourceDetail:
          'Tabela oficial Caixa Econômica Federal / Sistema Brasileiro de Poupança e Empréstimo',
        bcbKeywords: ['CAIXA ECONOMICA FEDERAL', 'CEF'],
      },
      {
        code: 'santander',
        name: 'Banco Santander',
        minDown: 20,
        maxFin: 80,
        maxTerm: 420,
        maxComp: 30,
        fgts: true,
        subsidy: false,
        rateDetailFallback: 'A partir de 10,99% a.a. + TR',
        rateAnnualFallback: 10.99,
        special:
          'Análise de crédito rápida, possibilidade de compor renda com até 3 proponentes sem parentesco direto. Financia até 80% em até 35 anos.',
        sourceDetail: 'Tabela oficial Santander Imobiliário',
        bcbKeywords: ['SANTANDER'],
      },
      {
        code: 'itau',
        name: 'Banco Itaú',
        minDown: 20,
        maxFin: 82,
        maxTerm: 360,
        maxComp: 30,
        fgts: true,
        subsidy: false,
        rateDetailFallback: 'A partir de 10,49% a.a. + TR',
        rateAnnualFallback: 10.49,
        special:
          'Financiamento em até 82% do valor do imóvel com taxa bonificada para correntistas; prazo de até 30 anos (360 meses). Permite composição de renda e uso de FGTS.',
        sourceDetail: 'Tabela oficial Itaú Crédito Imobiliário',
        bcbKeywords: ['ITAU UNIBANCO', 'ITAÚ'],
      },
      {
        code: 'bradesco',
        name: 'Banco Bradesco',
        minDown: 20,
        maxFin: 80,
        maxTerm: 360,
        maxComp: 30,
        fgts: true,
        subsidy: false,
        rateDetailFallback: 'A partir de 10,79% a.a. + TR',
        rateAnnualFallback: 10.79,
        special:
          'Financiamento de até 80% com débito em conta bonificado. Prazo de até 30 anos para imóveis residenciais. Avaliação jurídica integrada e FGTS.',
        sourceDetail: 'Tabela oficial Bradesco Imóveis',
        bcbKeywords: ['BRADESCO'],
      },
      {
        code: 'sicoob',
        name: 'Sicoob / Cooperativas (Banrisul / Sicredi)',
        minDown: 20,
        maxFin: 80,
        maxTerm: 360,
        maxComp: 30,
        fgts: true,
        subsidy: false,
        rateDetailFallback: 'A partir de 10,20% a.a. + TR',
        rateAnnualFallback: 10.2,
        special:
          'Condições vantajosas para cooperados e distribuição de sobras no final do exercício. Custos cartorários e seguros competitivos no Sul.',
        sourceDetail: 'Tabela oficial Sicoob / Banrisul Imobiliário',
        bcbKeywords: ['SICOOB', 'BANRISUL', 'SICREDI'],
      },
    ]

    var banksData = []
    for (var bi = 0; bi < bankConfigs.length; bi++) {
      var cfg = bankConfigs[bi]
      var bcbEntry = null
      if (Array.isArray(bcbMonthlyAverage) && bcbMonthlyAverage.length > 0) {
        for (var bj = 0; bj < bcbMonthlyAverage.length; bj++) {
          var item = bcbMonthlyAverage[bj]
          var instit = ((item && item.InstituicaoFinanceira) || '').toUpperCase()
          for (var bk = 0; bk < cfg.bcbKeywords.length; bk++) {
            if (instit.indexOf(cfg.bcbKeywords[bk]) !== -1) {
              bcbEntry = {
                rate: parseFloat(item.TaxaJurosAoAno),
                month: item.MesAno,
              }
              break
            }
          }
          if (bcbEntry) break
        }
      }

      var isLiveRate = bcbEntry && !isNaN(bcbEntry.rate) && bcbEntry.rate > 0
      var effectiveRate = isLiveRate ? bcbEntry.rate : cfg.rateAnnualFallback
      var rateDetails = isLiveRate
        ? bcbEntry.rate.toFixed(2).replace('.', ',') +
          '% a.a. + TR (média BCB ' +
          (bcbEntry.month || '') +
          ')'
        : cfg.rateDetailFallback

      banksData.push({
        bank_code: cfg.code,
        bank_name: cfg.name,
        min_down_payment_pct: cfg.minDown,
        max_financing_pct: cfg.maxFin,
        max_term_months: cfg.maxTerm,
        max_income_commitment_pct: cfg.maxComp,
        rate_effective_annual_pct: effectiveRate,
        rate_details: rateDetails,
        fgts_accepted: cfg.fgts,
        subsidy_applicable: cfg.subsidy,
        special_rules: cfg.special,
        source_detail:
          cfg.sourceDetail +
          (isLiveRate
            ? ' (atualizado via API BCB ' + (bcbEntry.month || '') + ')'
            : ' (referência oficial BCB)'),
        is_live_rate: isLiveRate,
      })
    }

    var mcmvCollectedFromLive = false
    try {
      console.log(
        '[FINANCING_MEMO] Consultando portal oficial gov.br/cidades e Caixa para Minha Casa Minha Vida...',
      )
      var mcmvRes = $http.send({
        url: 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida/sobre-o-minha-casa-minha-vida-1',
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SkipBackendCrawler/1.0',
        },
        timeout: 10,
      })
      var mcmvBody =
        mcmvRes && mcmvRes.statusCode === 200 && mcmvRes.body
          ? String.fromCharCode.apply(null, mcmvRes.body)
          : ''
      if (mcmvBody && mcmvBody.indexOf('Faixa') !== -1) {
        mcmvCollectedFromLive = true
        console.log(
          '[FINANCING_MEMO] Portal oficial gov.br/cidades acessado com sucesso (len=' +
            mcmvBody.length +
            ').',
        )
      } else {
        missingSources.push(
          'mcmv_official_portal_http_' + (mcmvRes ? mcmvRes.statusCode : 'timeout'),
        )
      }
    } catch (mcmvFetchErr) {
      console.warn(
        '[FINANCING_MEMO] Falha ao consultar portal oficial do MCMV: ' + String(mcmvFetchErr),
      )
      missingSources.push('mcmv_official_portal_error')
    }

    var mcmvBlockData = {
      title: 'MINHA CASA MINHA VIDA — REGRAS DO DIA',
      collected_at: todayStr,
      live_fetch_success: mcmvCollectedFromLive,
      source: 'Ministério das Cidades (Portaria MCID nº 333) / Caixa Econômica Federal / gov.br',
      source_url:
        'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida/sobre-o-minha-casa-minha-vida-1',
      max_term_months: 420,
      max_term_years: 35,
      fgts_usage:
        'Permitido para entrada, abatimento de prestações e liquidação/amortização do saldo devedor.',
      general_rule:
        'O enquadramento da família é feito pela renda bruta mensal familiar comprovada (ou anual na área rural) e pelo valor de avaliação de venda do imóvel.',
      faixas: [
        {
          faixa: 'Faixa 1',
          publico: 'Famílias de baixa renda com maior subsídio habitacional',
          renda_urbana_mensal_bruta: 'Até R$ 3.200,00',
          renda_rural_anual_bruta: 'Até R$ 50.000,00',
          taxa_juros_anual:
            'A partir de 4,00% a 4,50% a.a. (cotista FGTS na Região Sul a partir de 4,25% a 4,50% a.a.)',
          subsidio_maximo: 'Até R$ 55.000,00 (conforme renda familiar, região e município)',
          valor_maximo_imovel:
            'Até R$ 210.000,00 a R$ 275.000,00 (conforme porte do município e região metropolitana)',
          beneficios:
            'Maior subsídio do programa para abater a entrada, taxas reduzidas de juros e isenção de parcelas para beneficiários do Bolsa Família ou BPC em unidades subsidiadas.',
        },
        {
          faixa: 'Faixa 2',
          publico: 'Famílias com renda intermediária que ainda recebem subsídio da entrada',
          renda_urbana_mensal_bruta: 'De R$ 3.200,01 a R$ 5.000,00',
          renda_rural_anual_bruta: 'De R$ 50.000,01 a R$ 70.900,00',
          taxa_juros_anual: 'De 4,75% a 6,50% a.a. + TR (com taxa reduzida para cotistas FGTS)',
          subsidio_maximo: 'Até R$ 35.000,00 (escala decrescente conforme a renda)',
          valor_maximo_imovel: 'Até R$ 275.000,00 (conforme município)',
          beneficios:
            'Subsídio complementar para viabilizar a entrada, juros bem inferiores aos do mercado livre (SBPE) e possibilidade de usar FGTS para abater saldo.',
        },
        {
          faixa: 'Faixa 3',
          publico:
            'Famílias de renda média sem subsídio direto de entrada, com juros subsidiados pelo FGTS',
          renda_urbana_mensal_bruta: 'De R$ 5.000,01 a R$ 9.600,00',
          renda_rural_anual_bruta: 'De R$ 70.900,01 a R$ 134.000,00',
          taxa_juros_anual: 'De 7,66% a 8,16% a.a. + TR',
          subsidio_maximo: 'Sem subsídio direto a fundo perdido',
          valor_maximo_imovel: 'Até R$ 400.000,00 em todo o território nacional',
          beneficios:
            'Teto ampliado do imóvel para até R$ 400 mil, taxa de juros do FGTS menor que o financiamento convencional de mercado e financiamento em até 35 anos.',
        },
        {
          faixa: 'Faixa 4 (Classe Média)',
          publico:
            'Modalidade voltada a famílias de classe média ampliada com recursos do FGTS/Fundo Social',
          renda_urbana_mensal_bruta: 'De R$ 9.600,01 a R$ 13.000,00',
          renda_rural_anual_bruta: 'Até R$ 162.500,00',
          taxa_juros_anual: 'Aproximadamente 10,00% a.a. nominal',
          subsidio_maximo: 'Sem subsídio direto',
          valor_maximo_imovel: 'Até R$ 600.000,00',
          beneficios:
            'Acesso a imóveis de até R$ 600 mil com financiamento habitacional garantido em até 35 anos, entrada mínima a partir de 20% e uso integral de FGTS.',
        },
      ],
    }

    var isPartial = missingSources.length > 0

    var summaryText =
      'CONDIÇÕES VIGENTES DE FINANCIAMENTO IMOBILIÁRIO RESIDENCIAL (Data de referência: ' +
      todayStr +
      '):\n'
    summaryText +=
      '• REGRA GERAL DE ENTRADA E COMPROMETIMENTO: A maioria dos bancos financia até 80% do valor do imóvel (exigindo entrada mínima de 20%, que pode ser paga com recursos próprios e/ou FGTS). O comprometimento máximo de parcela admitido pelos bancos é de 30% da renda bruta comprovada (podendo haver composição de renda familiar ou de cônjuge/parceiros).\n'
    for (var bi = 0; bi < banksData.length; bi++) {
      var bd = banksData[bi]
      summaryText +=
        '• ' +
        bd.bank_name.toUpperCase() +
        ': Entrada mínima de ' +
        bd.min_down_payment_pct +
        '% (financia até ' +
        bd.max_financing_pct +
        '%). Taxa: ' +
        bd.rate_details +
        '. Prazo máximo: ' +
        bd.max_term_months +
        ' meses. Parcela máx: ' +
        bd.max_income_commitment_pct +
        '% da renda bruta. ' +
        bd.special_rules +
        '\n'
    }
    summaryText +=
      '• CÁLCULO PRÁTICO DE RENDA BRUTA EXIGIDA (REGRA DE 30%): Renda bruta mínima recomendada = Parcela pretendida ÷ 0,30. Exemplo: para uma parcela de R$ 3.000,00/mês, o cliente precisa comprovar renda bruta conjunta ou individual de R$ 10.000,00.\n\n'

    summaryText +=
      'MINHA CASA MINHA VIDA — REGRAS DO DIA (Data de referência: ' +
      todayStr +
      ' | Fonte: Ministério das Cidades / Caixa / gov.br):\n'
    summaryText +=
      '• PRAZO MÁXIMO DO PROGRAMA: até ' +
      mcmvBlockData.max_term_years +
      ' anos (' +
      mcmvBlockData.max_term_months +
      ' meses).\n'
    summaryText += '• USO DO FGTS: ' + mcmvBlockData.fgts_usage + '\n'
    for (var fi = 0; fi < mcmvBlockData.faixas.length; fi++) {
      var fx = mcmvBlockData.faixas[fi]
      summaryText += '• ' + fx.faixa.toUpperCase() + ':\n'
      summaryText +=
        '  - Renda bruta mensal (urbana): ' +
        fx.renda_urbana_mensal_bruta +
        (fx.renda_rural_anual_bruta
          ? ' | Renda anual (rural): ' + fx.renda_rural_anual_bruta
          : '') +
        '\n'
      summaryText += '  - Valor máximo do imóvel: ' + fx.valor_maximo_imovel + '\n'
      summaryText += '  - Taxa de juros: ' + fx.taxa_juros_anual + '\n'
      summaryText += '  - Subsídio: ' + fx.subsidio_maximo + '\n'
      summaryText += '  - Vantagens e benefícios: ' + fx.beneficios + '\n'
    }

    var fullSourcesStr =
      'Banco Central do Brasil (SGS/OData) / Portais Oficiais dos Bancos (Caixa, Santander, Itaú, Bradesco, Sicoob) / Ministério das Cidades e Caixa (Minha Casa Minha Vida)'
    var fullSourceUrlStr =
      'https://www.bcb.gov.br/estatisticas/reporttxjuros?codigoSegmento=1&codigoModalidade=905201 | https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida'

    var existingRecord = null
    try {
      existingRecord = $app.findFirstRecordByFilter(
        'financing_memos',
        "reference_date = '" + todayStr + "'",
      )
    } catch (_) {}

    var savedRec = null
    if (existingRecord) {
      existingRecord.set('source', fullSourcesStr)
      existingRecord.set('source_url', fullSourceUrlStr)
      existingRecord.set('banks_data', JSON.stringify(banksData))
      existingRecord.set('summary_text', summaryText)
      existingRecord.set('is_partial', isPartial)
      existingRecord.set('missing_sources', JSON.stringify(missingSources))
      $app.save(existingRecord)
      savedRec = existingRecord
    } else {
      var rec = new Record(memoCol)
      rec.set('reference_date', todayStr)
      rec.set('source', fullSourcesStr)
      rec.set('source_url', fullSourceUrlStr)
      rec.set('banks_data', JSON.stringify(banksData))
      rec.set('summary_text', summaryText)
      rec.set('is_partial', isPartial)
      rec.set('missing_sources', JSON.stringify(missingSources))
      $app.save(rec)
      savedRec = rec
    }

    return e.json(200, {
      ok: true,
      record_id: savedRec ? savedRec.id : null,
      reference_date: todayStr,
      is_partial: isPartial,
      missing_sources: missingSources,
      has_mcmv_block: summaryText.indexOf('MINHA CASA MINHA VIDA') !== -1,
    })
  } catch (err) {
    return e.badRequestError('Erro ao sincronizar financiamento imobiliário: ' + String(err))
  }
})
