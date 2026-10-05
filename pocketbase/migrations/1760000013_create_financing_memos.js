migrate(
  (app) => {
    // 1. Criar coleção financing_memos (mesmo padrão de market_memos)
    try {
      let finCol = null
      try {
        finCol = app.findCollectionByNameOrId('financing_memos')
      } catch (_) {}

      if (!finCol) {
        finCol = new Collection({
          name: 'financing_memos',
          type: 'base',
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "@request.auth.id != ''",
          deleteRule: "@request.auth.id != ''",
          fields: [
            { name: 'reference_date', type: 'text', required: true },
            { name: 'source', type: 'text', required: true },
            { name: 'source_url', type: 'text' },
            { name: 'banks_data', type: 'json', required: true },
            { name: 'summary_text', type: 'text', required: true },
            { name: 'is_partial', type: 'bool' },
            { name: 'missing_sources', type: 'json' },
            { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
            { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
          ],
          indexes: [
            'CREATE INDEX idx_financing_memos_refdate ON financing_memos (reference_date)',
            'CREATE INDEX idx_financing_memos_created ON financing_memos (created DESC)',
          ],
        })
        app.save(finCol)
        console.log('[MIG_1760000013] Coleção financing_memos criada com sucesso.')
      }
    } catch (finErr) {
      console.warn('[MIG_1760000013] Erro ao criar coleção financing_memos: ' + finErr.message)
    }

    // 2. Semear memo baseline real inicial para a Bia não nascer vazia
    try {
      const finCol = app.findCollectionByNameOrId('financing_memos')
      const todayStr = new Date().toISOString().substring(0, 10)

      let existing = null
      try {
        existing = app.findFirstRecordByFilter('financing_memos', `reference_date = '${todayStr}'`)
      } catch (_) {}

      if (!existing) {
        const banksBaseline = [
          {
            bank_code: 'caixa',
            bank_name: 'Caixa Econômica Federal',
            min_down_payment_pct: 20, // 20% SAC (até 80% financiado) / 30% PRICE (até 70%)
            max_financing_pct: 80,
            rate_effective_annual_pct: 8.1, // BCB taxas reguladas TR: 8,10% a.a.; SBPE mercado: 10,26% a 12,12% a.a.
            rate_details:
              'A partir de 8,10% a.a. (taxas reguladas TR/MCMV) e 10,26% a 12,12% a.a. + TR (SBPE mercado)',
            max_income_commitment_pct: 30, // Parcela de até 30% da renda bruta comprovada
            max_term_months: 420, // 35 anos
            fgts_accepted: true,
            subsidy_applicable: true,
            special_rules:
              'Permite compor renda com cônjuge, familiares ou terceiros; aceita FGTS para entrada/amortização; na construtora com garantia Caixa (ex: AJ Coelho), financiamento inicia já na construção onde o cliente só paga evolução de obra e juros até as chaves.',
            source_detail: 'Portal da Habitação CAIXA e Banco Central do Brasil (SGS/OData)',
          },
          {
            bank_code: 'santander',
            bank_name: 'Banco Santander',
            min_down_payment_pct: 20,
            max_financing_pct: 80,
            rate_effective_annual_pct: 11.82,
            rate_details: 'A partir de 11,69% a 11,82% a.a. + TR',
            max_income_commitment_pct: 30,
            max_term_months: 420,
            fgts_accepted: true,
            subsidy_applicable: false,
            special_rules:
              'Financia até 80% do valor do imóvel; soma de renda de até 2 ou mais pessoas; parcelas decrescentes (SAC) ou fixas (Price); aceita FGTS no SFH.',
            source_detail: 'Santander Crédito Imobiliário e Banco Central do Brasil',
          },
          {
            bank_code: 'itau',
            bank_name: 'Itaú Unibanco',
            min_down_payment_pct: 20,
            max_financing_pct: 80,
            rate_effective_annual_pct: 11.87,
            rate_details: 'A partir de 11,87% a 11,99% a.a. + TR',
            max_income_commitment_pct: 30,
            max_term_months: 420,
            fgts_accepted: true,
            subsidy_applicable: false,
            special_rules:
              'Financiamento de até 80% do valor de avaliação; análise de crédito digital ágil; permite compor renda sem grau de parentesco; uso do FGTS para entrada no SFH.',
            source_detail: 'Itaú Crédito Imobiliário e Banco Central do Brasil',
          },
          {
            bank_code: 'bradesco',
            bank_name: 'Banco Bradesco',
            min_down_payment_pct: 20,
            max_financing_pct: 80,
            rate_effective_annual_pct: 11.77,
            rate_details: 'A partir de 11,45% a 11,77% a.a. + TR',
            max_income_commitment_pct: 30,
            max_term_months: 420,
            fgts_accepted: true,
            subsidy_applicable: false,
            special_rules:
              'Financia até 80% do valor do imóvel; prazo de até 35 anos; possibilidade de compor renda com familiares; utilização de recursos da conta vinculada do FGTS.',
            source_detail: 'Bradesco Imóveis e Banco Central do Brasil',
          },
          {
            bank_code: 'sicoob',
            bank_name: 'Banco Sicoob / Banrisul',
            min_down_payment_pct: 20,
            max_financing_pct: 80,
            rate_effective_annual_pct: 9.92,
            rate_details:
              'Sicoob: a partir de 9,92% a.a. + TR | Banrisul: a partir de 10,10% a.a. + TR',
            max_income_commitment_pct: 30,
            max_term_months: 420,
            fgts_accepted: true,
            subsidy_applicable: false,
            special_rules:
              'Cooperativas e bancos regionais com taxas competitivas; crédito imobiliário com recursos da poupança e FGTS; análise cooperativa personalizada.',
            source_detail: 'Portal Sicoob/Banrisul e Banco Central do Brasil',
          },
        ]

        let summaryText = `CONDIÇÕES VIGENTES DE FINANCIAMENTO IMOBILIÁRIO RESIDENCIAL (Data de referência: ${todayStr}):\n`
        summaryText += `• REGRA GERAL DE ENTRADA E COMPROMETIMENTO: A maioria dos bancos financia até 80% do valor do imóvel (exigindo entrada mínima de 20%, que pode ser paga com recursos próprios e/ou FGTS). O comprometimento máximo de parcela admitido pelos bancos é de 30% da renda bruta comprovada (podendo haver composição de renda familiar ou de cônjuge/parceiros).\n`
        summaryText += `• CAIXA ECONÔMICA FEDERAL: Entrada mínima de 20% (SAC, até 80% financiado) ou 30% (Price, até 70% financiado). Taxas: a partir de 8,10% a.a. (linhas reguladas TR) e de 10,26% a 12,12% a.a. + TR no SBPE. Prazo máximo: 420 meses (35 anos). Aceita FGTS e subsídio. Destaque: em lançamentos com garantia Caixa (ex: AJ Coelho), financia na planta com pagamento apenas de juros/obra até a entrega.\n`
        summaryText += `• BANCO SANTANDER: Entrada mínima de 20% (financia até 80%). Taxa: a partir de 11,69% a 11,82% a.a. + TR. Prazo máximo: 420 meses (35 anos). Parcela máxima de 30% da renda. Aceita composição de renda e FGTS.\n`
        summaryText += `• ITAÚ UNIBANCO: Entrada mínima de 20% (financia até 80%). Taxa: a partir de 11,87% a 11,99% a.a. + TR. Prazo máximo: 420 meses (35 anos). Parcela máxima de 30% da renda. Permite compor renda sem parentesco e aceita FGTS.\n`
        summaryText += `• BANCO BRADESCO: Entrada mínima de 20% (financia até 80%). Taxa: a partir de 11,45% a 11,77% a.a. + TR. Prazo máximo: 420 meses (35 anos). Parcela máxima de 30% da renda. Aceita FGTS e composição de renda familiar.\n`
        summaryText += `• SICOOB / BANRISUL: Entrada mínima de 20%. Taxas: Sicoob a partir de 9,92% a.a. + TR e Banrisul a partir de 10,10% a.a. + TR. Prazo de até 420 meses. Comprometimento de renda até 30%.\n`
        summaryText += `• CÁLCULO PRÁTICO DE RENDA BRUTA EXIGIDA (REGRA DE 30%): Renda bruta mínima recomendada = Parcela pretendida ÷ 0,30. Exemplo: para uma parcela de R$ 3.000,00/mês, o cliente precisa comprovar renda bruta conjunta ou individual de R$ 10.000,00.`

        const rec = new Record(finCol)
        rec.set('reference_date', todayStr)
        rec.set(
          'source',
          'Banco Central do Brasil (SGS/OData) / Portais Oficiais dos Bancos (Caixa, Santander, Itaú, Bradesco, Sicoob)',
        )
        rec.set(
          'source_url',
          'https://www.bcb.gov.br/estatisticas/reporttxjuros?codigoSegmento=1&codigoModalidade=905201',
        )
        rec.set('banks_data', JSON.stringify(banksBaseline))
        rec.set('summary_text', summaryText)
        rec.set('is_partial', false)
        rec.set('missing_sources', JSON.stringify([]))
        app.save(rec)
        console.log('[MIG_1760000013] Memo baseline de financiamento semeado com sucesso.')
      }
    } catch (seedErr) {
      console.warn(
        '[MIG_1760000013] Erro ao semear baseline de financing_memos: ' + seedErr.message,
      )
    }
  },
  (app) => {
    try {
      const finCol = app.findCollectionByNameOrId('financing_memos')
      if (finCol) {
        app.delete(finCol)
      }
    } catch (_) {}
  },
)
