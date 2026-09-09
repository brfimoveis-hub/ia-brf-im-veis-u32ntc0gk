migrate(
  (app) => {
    const token =
      'EAANEkx5ozUABSdj7qZB4jlOJiZA6Yt412B3xrTIq0XLMhloumJfyuqJAucYlr7wYIpjlyw8Y2BOICEnT4J7DGfvuEVNy9oj4zZBtNAdHQfUXH91jZA6hoZC4RIiS3zy2YkPf3ZABippxZA6CJv61CFbzs70mC5YMFgyRMWCiBZAOJPLUWJIWDB06QHnXcubfdAZDZD'
    const datasetId = '10865204105053224'

    const versions = ['v22.0', 'v21.0', 'v20.0', 'v19.0', 'v18.0']
    const results = []

    for (let i = 0; i < versions.length; i++) {
      const v = versions[i]
      try {
        const res = $http.send({
          url:
            'https://graph.facebook.com/' +
            v +
            '/' +
            datasetId +
            '/events?access_token=' +
            encodeURIComponent(token),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              {
                event_name: 'Lead',
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                event_source_url: 'https://www.brfimoveis.com.br',
                user_data: {
                  em: [$security.sha256('contato@brfimoveis.com.br')],
                },
              },
            ],
          }),
          timeout: 10,
        })
        results.push({ version: v, status: res.statusCode, body: res.json || res.body })
      } catch (err) {
        results.push({ version: v, error: err.message })
      }
    }

    // Também testar /debug_token com mais campos: fields=app_id,type,application,data_access_expires_at,expires_at,is_valid,issued_at,scopes,granular_scopes,user_id,target_ids
    let detailedDebug = null
    try {
      const dbg = $http.send({
        url:
          'https://graph.facebook.com/v21.0/debug_token?input_token=' +
          encodeURIComponent(token) +
          '&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 10,
      })
      detailedDebug = dbg.json
    } catch (e) {
      detailedDebug = { error: e.message }
    }

    try {
      const dumpCol = app.findCollectionByNameOrId('system_logs')
      const rec = new Record(dumpCol)
      rec.set('type', 'diagnostic_versions')
      rec.set(
        'message',
        'Versions tested: ' +
          results
            .map(function (r) {
              return r.version + ':' + r.status
            })
            .join(' | '),
      )
      rec.set('details', JSON.stringify({ results: results, detailedDebug: detailedDebug }))
      app.saveNoValidate(rec)
    } catch (_) {}
  },
  (app) => {},
)
