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
    const pageTok =
      user.getString('meta_instagram_page_token') || user.getString('meta_page_access_token') || ''
    const userTok = user.getString('meta_instagram_user_token') || ''

    console.log('[AUTO_DETECT_IG_MIGRATION] Iniciando detecção do Instagram Business ID...')

    let detectedIgId = ''
    let detectedUsername = ''
    let detectedPageId = ''
    let detectedPageName = ''
    let metaApiResponse = null
    let allPagesChecked = []

    // Consulta 1: /me/accounts com o token de usuário
    if (userTok) {
      try {
        const res = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name},connected_instagram_account{id,username,name},page_backed_instagram_accounts{id,username}&limit=50&access_token=' +
            encodeURIComponent(userTok),
          method: 'GET',
          timeout: 15,
        })

        if (
          res.statusCode >= 200 &&
          res.statusCode < 300 &&
          res.json &&
          Array.isArray(res.json.data)
        ) {
          const pages = res.json.data
          for (let i = 0; i < pages.length; i++) {
            const pg = pages[i]
            const pId = pg.id || ''
            const pName = pg.name || ''
            const pTok = pg.access_token || ''

            let igObj = pg.instagram_business_account || pg.connected_instagram_account || null
            if (
              !igObj &&
              pg.page_backed_instagram_accounts &&
              pg.page_backed_instagram_accounts.data &&
              pg.page_backed_instagram_accounts.data.length > 0
            ) {
              const pbItem = pg.page_backed_instagram_accounts.data[0]
              if (pbItem && pbItem.id) {
                igObj = { id: pbItem.id, username: pbItem.username || '' }
              }
            }

            // Se a expansão não veio, consulta a página diretamente
            if (!igObj && (pTok || pageTok || userTok)) {
              try {
                const directRes = $http.send({
                  url:
                    'https://graph.facebook.com/v22.0/' +
                    pId +
                    '?fields=id,name,instagram_business_account{id,username,name},connected_instagram_account{id,username,name},page_backed_instagram_accounts{id,username}&access_token=' +
                    encodeURIComponent(pTok || pageTok || userTok),
                  method: 'GET',
                  timeout: 10,
                })
                if (directRes.statusCode === 200 && directRes.json) {
                  if (
                    directRes.json.instagram_business_account &&
                    directRes.json.instagram_business_account.id
                  ) {
                    igObj = directRes.json.instagram_business_account
                  } else if (
                    directRes.json.connected_instagram_account &&
                    directRes.json.connected_instagram_account.id
                  ) {
                    igObj = directRes.json.connected_instagram_account
                  }
                }
              } catch (_) {}
            }

            allPagesChecked.push({
              page_id: pId,
              page_name: pName,
              has_ig: !!(igObj && igObj.id),
              ig_id: (igObj && igObj.id) || null,
              ig_username: (igObj && (igObj.username || igObj.name)) || null,
            })

            if (igObj && igObj.id && !detectedIgId) {
              detectedIgId = String(igObj.id).trim()
              detectedUsername = String(igObj.username || igObj.name || '').trim()
              detectedPageId = pId
              detectedPageName = pName
              metaApiResponse = igObj
            }
          }
        }
      } catch (eUser) {
        console.log('[AUTO_DETECT_IG_MIGRATION] Erro em /me/accounts: ' + String(eUser))
      }
    }

    // Consulta 2: Se ainda não detectou, consulta a Página oficial com o pageTok
    if (!detectedIgId && pageTok) {
      try {
        const pRes = $http.send({
          url: 'https://graph.facebook.com/v22.0/me?fields=id,name,instagram_business_account{id,username,name},connected_instagram_account{id,username,name},page_backed_instagram_accounts{id,username}',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + pageTok },
          timeout: 12,
        })
        metaApiResponse = pRes.json
        if (pRes.statusCode >= 200 && pRes.statusCode < 300 && pRes.json) {
          let igObj =
            pRes.json.instagram_business_account || pRes.json.connected_instagram_account || null
          if (igObj && igObj.id) {
            detectedIgId = String(igObj.id).trim()
            detectedUsername = String(igObj.username || igObj.name || '').trim()
            detectedPageId = pRes.json.id || ''
            detectedPageName = pRes.json.name || ''
          }
        }
      } catch (ePage) {
        console.log('[AUTO_DETECT_IG_MIGRATION] Erro em /me com pageTok: ' + String(ePage))
      }
    }

    // Grava no usuário se detectou algum ID real
    if (detectedIgId) {
      user.set('meta_instagram_business_id', detectedIgId)
      if (detectedUsername) {
        user.set('instagram_username', detectedUsername)
      }
      app.save(user)
      console.log(
        '[AUTO_DETECT_IG_MIGRATION] SUCESSO: meta_instagram_business_id gravado=' + detectedIgId,
      )
    } else {
      console.log(
        '[AUTO_DETECT_IG_MIGRATION] Nenhuma instagram_business_account retornada pela Meta.',
      )
    }

    // Registra em system_logs para auditoria imediata
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol, {
        type: 'auto_detect_instagram_business_id',
        message: detectedIgId
          ? 'Instagram Business ID detectado: ' + detectedIgId
          : 'Instagram Business ID não detectado (Página sem instagram_business_account na Meta)',
        payload: {
          detected_ig_id: detectedIgId,
          detected_username: detectedUsername,
          detected_page_id: detectedPageId,
          detected_page_name: detectedPageName,
          pages_checked: allPagesChecked,
          meta_api_response: metaApiResponse,
          timestamp: new Date().toISOString(),
        },
        details:
          'detected_id=' +
          (detectedIgId || 'VAZIO') +
          ' | pages=' +
          JSON.stringify(allPagesChecked),
      })
      app.save(logRec)
    } catch (logErr) {
      console.log('[AUTO_DETECT_IG_MIGRATION] Erro ao salvar log: ' + String(logErr))
    }
  },
  (app) => {},
)
