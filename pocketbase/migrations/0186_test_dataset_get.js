migrate(
  (app) => {
    try {
      const newToken =
        'EAAita2fhUI4BSQ74UV8zut9vVLZCIStC4ZA4hrP7yBnZCaB2IsnSeQ5wNQ1vdYVa9M8YxceMlswJx0ehM09n7FDs7pfAlsw6gBZAgvNP6rjceMoF3e18PLhOt5ccjE6T8bjR2GT5hEk6wFvmFLLd0OebsVgxpcspweRnzOXZBMRc6oUsodlPlTe4n5IF7yQZDZD'
      const pixelId = '1093869151209421'

      // GET https://graph.facebook.com/v21.0/1093869151209421?access_token=TOKEN
      const dsRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          pixelId +
          '?access_token=' +
          encodeURIComponent(newToken),
        method: 'GET',
        timeout: 15,
      })

      const logCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logCol)
      logRec.set('user_id', 'g5jto8bhulw01bz')
      logRec.set('type', 'api_integration')
      logRec.set('message', 'Direct Dataset GET test: HTTP ' + dsRes.statusCode)
      logRec.set(
        'details',
        JSON.stringify({
          statusCode: dsRes.statusCode,
          body: dsRes.json || dsRes.body,
        }),
      )
      logRec.set('payload', JSON.stringify({ action: 'direct_dataset_get_test' }))
      app.saveNoValidate(logRec)
    } catch (e) {
      const logCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logCol)
      logRec.set('user_id', 'g5jto8bhulw01bz')
      logRec.set('type', 'api_integration')
      logRec.set('message', 'Direct Dataset GET error: ' + e.message)
      app.saveNoValidate(logRec)
    }
  },
  (app) => {},
)
