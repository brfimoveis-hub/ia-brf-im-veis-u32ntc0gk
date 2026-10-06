migrate(
  (app) => {
    const users = app.findRecordsByFilter(
      'users',
      'email = "brfimoveis@gmail.com"',
      '-created',
      1,
      0,
    )
    if (!users || users.length === 0) return
    const user = users[0]
    const userTok = user.getString('meta_instagram_user_token') || ''
    const pageTok = user.getString('meta_instagram_page_token') || ''

    const candidateId = '17841430026178145'
    let resCandidateWithUserTok = null
    let resCandidateWithPageTok = null

    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          candidateId +
          '?fields=id,username,name,biography,profile_picture_url&access_token=' +
          encodeURIComponent(userTok),
        method: 'GET',
        timeout: 10,
      })
      resCandidateWithUserTok = { status: res.statusCode, json: res.json }
    } catch (e1) {
      resCandidateWithUserTok = { error: String(e1) }
    }

    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          candidateId +
          '?fields=id,username,name,biography,profile_picture_url&access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      resCandidateWithPageTok = { status: res.statusCode, json: res.json }
    } catch (e2) {
      resCandidateWithPageTok = { error: String(e2) }
    }

    // Também checa se há outros endpoints para 17841430026178145
    let resCandidatePage = null
    try {
      const res = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          candidateId +
          '?access_token=' +
          encodeURIComponent(pageTok),
        method: 'GET',
        timeout: 10,
      })
      resCandidatePage = { status: res.statusCode, json: res.json }
    } catch (e3) {
      resCandidatePage = { error: String(e3) }
    }

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_probe_candidate',
      message: 'Probe 17841430026178145',
      payload: {
        with_user_token: resCandidateWithUserTok,
        with_page_token: resCandidateWithPageTok,
        direct_page: resCandidatePage,
      },
      details:
        'userTok=' +
        JSON.stringify(resCandidateWithUserTok) +
        ' | pageTok=' +
        JSON.stringify(resCandidateWithPageTok),
    })
    app.save(logRec)
  },
  (app) => {},
)
