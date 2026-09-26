/// <reference path="../pb_data/types.d.ts" />

/**
 * Scheduled job: sync_market_indices_monthly
 * Executa todo dia 1º de cada mês às 06:00 UTC (03:00 Horário de Brasília)
 * Busca os índices INCC e IGP-M mais recentes publicados pela FGV / Banco Central do Brasil (SGS).
 * Códigos oficiais BCB SGS:
 * - 192: Índice Nacional de Custo da Construção (INCC) - Var. % mensal
 * - 189: Índice Geral de Preços - Mercado (IGP-M) - Var. % mensal
 */

cronAdd('sync_market_indices_monthly', '0 6 1 * *', () => {
  console.log('[MARKET_INDICES] Starting monthly market indices synchronization...')

  try {
    const marketCol = $app.findCollectionByNameOrId('market_indices')
    if (!marketCol) {
      console.error('[MARKET_INDICES] Collection market_indices not found.')
      return
    }

    const indicesToFetch = [
      { name: 'INCC-M', seriesId: 192, defaultSource: 'BCB SGS 192 / FGV' },
      { name: 'IGP-M', seriesId: 189, defaultSource: 'BCB SGS 189 / FGV' },
    ]

    for (let i = 0; i < indicesToFetch.length; i++) {
      const ind = indicesToFetch[i]
      let result = null

      try {
        const url =
          'https://api.bcb.gov.br/dados/serie/bcdata.sgs.' +
          ind.seriesId +
          '/dados/ultimos/1?formato=json'
        const res = $http.send({
          url: url,
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'BRFImoveis-IndexSync/1.0',
          },
          timeout: 15,
        })

        if (res && res.statusCode === 200 && res.body) {
          let bodyStr = ''
          if (typeof res.body === 'string') {
            bodyStr = res.body
          } else {
            bodyStr = String.fromCharCode.apply(null, res.body)
          }
          const parsed = JSON.parse(bodyStr)
          if (Array.isArray(parsed) && parsed.length > 0) {
            result = parsed[0] // { data: "01/08/2026", valor: "0.85" }
          }
        }
      } catch (err) {
        console.warn(
          '[MARKET_INDICES] Error fetching series ' + ind.seriesId + ' from BCB: ' + String(err),
        )
      }

      if (result && result.valor && result.data) {
        const parts = result.data.split('/')
        let refMonth = result.data
        if (parts.length === 3) {
          refMonth = parts[1] + '/' + parts[2] // "08/2026"
        }

        const numVal = parseFloat(result.valor.replace(',', '.'))
        if (!isNaN(numVal)) {
          let existingRec = null
          try {
            const existing = $app.findRecordsByFilter(
              'market_indices',
              "name = '" + ind.name + "' && reference_month = '" + refMonth + "'",
              '-created',
              1,
              0,
            )
            if (existing && existing.length > 0) {
              existingRec = existing[0]
            }
          } catch (_) {}

          if (existingRec) {
            existingRec.set('value', numVal)
            existingRec.set('fetched_at', new Date().toISOString())
            existingRec.set('raw_payload', result)
            $app.saveNoValidate(existingRec)
            console.log(
              '[MARKET_INDICES] Updated ' + ind.name + ' for ' + refMonth + ': ' + numVal + '%',
            )
          } else {
            const newRec = new Record(marketCol, {
              name: ind.name,
              reference_month: refMonth,
              value: numVal,
              source: ind.defaultSource,
              fetched_at: new Date().toISOString(),
              raw_payload: result,
            })
            $app.saveNoValidate(newRec)
            console.log(
              '[MARKET_INDICES] Created ' + ind.name + ' for ' + refMonth + ': ' + numVal + '%',
            )
          }
        }
      } else {
        console.warn(
          '[MARKET_INDICES] Could not retrieve latest data for ' +
            ind.name +
            ' (series ' +
            ind.seriesId +
            ')',
        )
      }
    }
  } catch (syncErr) {
    console.error('[MARKET_INDICES] Unexpected error in syncMarketIndices: ' + String(syncErr))
  }
})
