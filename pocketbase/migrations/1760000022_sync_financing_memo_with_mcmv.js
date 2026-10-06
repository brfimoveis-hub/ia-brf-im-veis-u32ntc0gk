migrate(
  (app) => {
    // Executa a sincronização do memo de financiamento no momento da migração para alimentar o registro imediatamente com o bloco MCMV
    try {
      const todayStr = new Date().toISOString().substring(0, 10)
      const memoCol = app.findCollectionByNameOrId('financing_memos')

      let missingSources = []
      let bcbMonthlyAverage = null

      try {
        const bcbRes = $http.send({
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

      const bankConfigs = [
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

      const banksData = []
      for (let bi = 0; bi < bankConfigs.length; bi++) {
        const cfg = bankConfigs[bi]
        let bcbEntry = null
        if (Array.isArray(bcbMonthlyAverage) && bcbMonthlyAverage.length > 0) {
          for (let bj = 0; bj < bcbMonthlyAverage.length; bj++) {
            const item = bcbMonthlyAverage[bj]
            const instit = ((item && item.InstituicaoFinanceira) || '').toUpperCase()
            for (let bk = 0; bk < cfg.bcbKeywords.length; bk++) {
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

        const isLiveRate = bcbEntry && !isNaN(bcbEntry.rate) && bcbEntry.rate > 0
        const effectiveRate = isLiveRate ? bcbEntry.rate : cfg.rateAnnualFallback
        const rateDetails = isLiveRate
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

      let mcmvCollectedFromLive = false
      try {
        const mcmvRes = $http.send({
          url: 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida/sobre-o-minha-casa-minha-vida-1',
          method: 'GET',
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SkipBackendCrawler/1.0',
          },
          timeout: 10,
        })
        const mcmvBody =
          mcmvRes && mcmvRes.statusCode === 200 && mcmvRes.body
            ? String.fromCharCode.apply(null, mcmvRes.body)
            : ''
        if (mcmvBody && mcmvBody.indexOf('Faixa') !== -1) {
          mcmvCollectedFromLive = true
        } else {
          missingSources.push(
            'mcmv_official_portal_http_' + (mcmvRes ? mcmvRes.statusCode : 'timeout'),
          )
        }
      } catch (mcmvFetchErr) {
        missingSources.push('mcmv_official_portal_error')
      }

      const mcmvBlockData = {
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

      const isPartial = missingSources.length > 0

      let summaryText =
        'CONDIÇÕES VIGENTES DE FINANCIAMENTO IMOBILIÁRIO RESIDENCIAL (Data de referência: ' +
        todayStr +
        '):\n'
      summaryText +=
        '• REGRA GERAL DE ENTRADA E COMPROMETIMENTO: A maioria dos bancos financia até 80% do valor do imóvel (exigindo entrada mínima de 20%, que pode ser paga com recursos próprios e/ou FGTS). O comprometimento máximo de parcela admitido pelos bancos é de 30% da renda bruta comprovada (podendo haver composição de renda familiar ou de cônjuge/parceiros).\n'
      for (let bi = 0; bi < banksData.length; bi++) {
        const bd = banksData[bi]
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
      for (let fi = 0; fi < mcmvBlockData.faixas.length; fi++) {
        const fx = mcmvBlockData.faixas[fi]
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

      const fullSourcesStr =
        'Banco Central do Brasil (SGS/OData) / Portais Oficiais dos Bancos (Caixa, Santander, Itaú, Bradesco, Sicoob) / Ministério das Cidades e Caixa (Minha Casa Minha Vida)'
      const fullSourceUrlStr =
        'https://www.bcb.gov.br/estatisticas/reporttxjuros?codigoSegmento=1&codigoModalidade=905201 | https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida'

      let existingRecord = null
      try {
        existingRecord = app.findFirstRecordByFilter(
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
        app.saveNoValidate(existingRecord)
      } else {
        const rec = new Record(memoCol)
        rec.set('reference_date', todayStr)
        rec.set('source', fullSourcesStr)
        rec.set('source_url', fullSourceUrlStr)
        rec.set('banks_data', JSON.stringify(banksData))
        rec.set('summary_text', summaryText)
        rec.set('is_partial', isPartial)
        rec.set('missing_sources', JSON.stringify(missingSources))
        app.saveNoValidate(rec)
      }
    } catch (err) {
      console.error(
        '[MIGRATION 1760000022] Erro ao sincronizar memo de financiamento: ' + String(err),
      )
    }
  },
  (app) => {},
)
