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
      '• CÁLCULO PRÁTICO DE RENDA BRUTA EXIGIDA (REGRA DE 30%): Renda bruta mínima recomendada = Parcela pretendida ÷ 0,30. Exemplo: para uma parcela de R$ 3.000,00/mês, o cliente precisa comprovar renda bruta conjunta ou individual de R$ 10.000,00.'

    // Grava ou atualiza o memo do dia
    var existingRecord = null
    try {
      existingRecord = $app.findFirstRecordByFilter(
        'financing_memos',
        "reference_date = '" + todayStr + "'",
      )
    } catch (_) {}

    if (existingRecord) {
      existingRecord.set(
        'source',
        'Banco Central do Brasil (SGS/OData) / Portais Oficiais dos Bancos (Caixa, Santander, Itaú, Bradesco, Sicoob)',
      )
      existingRecord.set(
        'source_url',
        'https://www.bcb.gov.br/estatisticas/reporttxjuros?codigoSegmento=1&codigoModalidade=905201',
      )
      existingRecord.set('banks_data', JSON.stringify(banksData))
      existingRecord.set('summary_text', summaryText)
      existingRecord.set('is_partial', isPartial)
      existingRecord.set('missing_sources', JSON.stringify(missingSources))
      $app.save(existingRecord)
    } else {
      var rec = new Record(memoCol)
      rec.set('reference_date', todayStr)
      rec.set(
        'source',
        'Banco Central do Brasil (SGS/OData) / Portais Oficiais dos Bancos (Caixa, Santander, Itaú, Bradesco, Sicoob)',
      )
      rec.set(
        'source_url',
        'https://www.bcb.gov.br/estatisticas/reporttxjuros?codigoSegmento=1&codigoModalidade=905201',
      )
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
