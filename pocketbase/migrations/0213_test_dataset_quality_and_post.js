migrate(
  (app) => {
    const token =
      'EAANEkx5ozUABSdj7qZB4jlOJiZA6Yt412B3xrTIq0XLMhloumJfyuqJAucYlr7wYIpjlyw8Y2BOICEnT4J7DGfvuEVNy9oj4zZBtNAdHQfUXH91jZA6hoZC4RIiS3zy2YkPf3ZABippxZA6CJv61CFbzs70mC5YMFgyRMWCiBZAOJPLUWJIWDB06QHnXcubfdAZDZD'
    const datasetId = '10865204105053224'

    // 1. Testar sem test_event_code, com action_source website e sem test_event_code
    // 2. Testar GET na Dataset Quality API: /v21.0/dataset_quality?dataset_id=10865204105053224
    let qualityRes = null
    try {
      const q = $http.send({
        url:
          'https://graph.facebook.com/v21.0/dataset_quality?dataset_id=' +
          datasetId +
          '&access_token=' +
          token,
        method: 'GET',
        timeout: 15,
      })
      qualityRes = { status: q.statusCode, body: q.json || q.body }
    } catch (e) {
      qualityRes = { error: e.message }
    }

    // 3. Testar POST /events com payload padrão de Conversions API (sem event_id custom, sem test_code)
    let postStandard = null
    try {
      const p = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + datasetId + '/events',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          data: [
            {
              event_name: 'Lead',
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: 'https://www.brfimoveis.com.br',
              user_data: {
                em: [$security.sha256('teste@brfimoveis.com.br')],
                client_ip_address: '177.18.20.30',
                client_user_agent:
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
            },
          ],
        }),
        timeout: 15,
      })
      postStandard = { status: p.statusCode, body: p.json || p.body }
    } catch (e) {
      postStandard = { error: e.message }
    }

    // 4. Testar POST com access_token na query string em vez de header Bearer (comum na documentação Meta CAPI)
    let postQueryToken = null
    try {
      const pq = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          datasetId +
          '/events?access_token=' +
          encodeURIComponent(token),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            {
              event_name: 'Lead',
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: 'https://www.brfimoveis.com.br',
              user_data: {
                em: [$security.sha256('teste@brfimoveis.com.br')],
              },
            },
          ],
        }),
        timeout: 15,
      })
      postQueryToken = { status: pq.statusCode, body: pq.json || pq.body }
    } catch (e) {
      postQueryToken = { error: e.message }
    }

    // 5. Salvar resultado em system_logs
    try {
      const dumpCol = app.findCollectionByNameOrId('system_logs')
      const rec = new Record(dumpCol)
      rec.set('type', 'diagnostic_tests_213')
      rec.set(
        'message',
        'quality: ' +
          (qualityRes ? qualityRes.status : '') +
          ' | postStd: ' +
          (postStandard ? postStandard.status : '') +
          ' | postQuery: ' +
          (postQueryToken ? postQueryToken.status : ''),
      )
      rec.set(
        'details',
        JSON.stringify({
          qualityRes: qualityRes,
          postStandard: postStandard,
          postQueryToken: postQueryToken,
        }),
      )
      app.saveNoValidate(rec)
    } catch (_) {}
  },
  (app) => {},
)
