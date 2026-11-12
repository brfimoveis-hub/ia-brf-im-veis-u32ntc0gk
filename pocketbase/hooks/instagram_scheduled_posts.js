/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para Agendamento e Publicação Automática de Posts — Facebook Página + Instagram.
 *
 * Inclui:
 * 1. Cron de 5 minutos ('cron_publish_scheduled_posts') para publicar posts pendentes
 * 2. POST /backend/v1/posts/{id}/publish_now - Publicação imediata sob demanda (canais do post)
 * 3. POST /backend/v1/posts/suggest_caption - Geração de legenda com a Bia ($ai.chat)
 * 4. GET /backend/v1/posts/instagram_status - Status da integração p/ banner
 * 5. system_logs: scheduled_post_published / scheduled_post_failed (nunca falha em silêncio)
 *
 * Regra de escopo: todo helper é declarado DENTRO do próprio callback (handlers/cron),
 * pois funções top-level podem sumir do bundle deployado (ReferenceError, v0.0.1399).
 */

// 1. CRON AGENDADOR: A cada 5 minutos, processa posts agendados vencidos
cronAdd('cron_publish_scheduled_posts', '*/5 * * * *', () => {
  // ---- helpers (escopo do callback — obrigatório neste projeto) ----
  function buildFullCaption(caption, linkCta) {
    var full = (caption || '').trim()
    var cta = (linkCta || '').trim()
    if (cta) {
      full = full ? full + '\n\n' + '🔗 Saiba mais: ' + cta : '🔗 Saiba mais: ' + cta
    }
    return full
  }

  function getChannels(postRecord) {
    var ch = postRecord.get('channels')
    if (Array.isArray(ch) && ch.length > 0) {
      var out = []
      for (var i = 0; i < ch.length; i++) {
        var v = String(ch[i] || '')
          .trim()
          .toLowerCase()
        if (v === 'fb' || v === 'facebook') v = 'facebook'
        if (v === 'ig' || v === 'instagram') v = 'instagram'
        if (v === 'facebook' || v === 'instagram') out.push(v)
      }
      if (out.length > 0) return out
    }
    // Legado (piloto Instagram): sem campo channels => só Instagram
    return ['instagram']
  }

  function resolvePostImageUrl(postRecord) {
    var images = postRecord.get('images')
    if (Array.isArray(images) && images.length > 0 && images[0]) {
      var filename = images[0]
      var pbBaseUrl =
        $os.getenv('PUBLIC_URL') ||
        $os.getenv('POCKETBASE_URL') ||
        'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev'
      return (
        pbBaseUrl +
        '/api/files/scheduled_posts/' +
        postRecord.id +
        '/' +
        encodeURIComponent(filename)
      )
    }
    var imageUrls = postRecord.get('image_urls')
    if (Array.isArray(imageUrls) && imageUrls.length > 0 && imageUrls[0]) {
      return String(imageUrls[0]).trim()
    }
    return ''
  }

  function logSystem(level, type, message, postId) {
    try {
      var col = $app.findCollectionByNameOrId('system_logs')
      var rec = new Record(col)
      rec.set('level', level)
      rec.set('type', type)
      rec.set('message', message)
      if (postId) rec.set('reference_id', postId)
      $app.save(rec)
    } catch (logErr) {
      $app.logger().warn('Falha ao gravar system_logs (' + type + '): ' + String(logErr))
    }
  }

  function translateMetaError(fbErr, fallback) {
    if (!fbErr) return fallback || 'Erro desconhecido na Meta.'
    var msg = fbErr.message || fallback || 'Erro na Meta.'
    if (fbErr.error_user_msg) msg = fbErr.error_user_msg
    var code = fbErr.code
    var subcode = fbErr.error_subcode
    if (code === 190) {
      msg = 'Token da Meta expirado — renove em Configurações (Conexões). ' + (fbErr.message || '')
    }
    if (code === 10 || code === 200 || code === 2500) {
      msg =
        'Permissão ausente no token: publicar exige pages_manage_posts (Facebook) e ' +
        'instagram_content_publish (Instagram). A Bernadete precisa regenerar o token em ' +
        'Configurações > Conexões com essas permissões extras. Detalhe: ' +
        (fbErr.message || '')
    }
    if (code === 9007 || code === 15100 || code === 15101) {
      msg =
        'A imagem não pôde ser baixada pela Meta a partir da URL pública do CRM. ' +
        (fbErr.message || '')
    }
    if (subcode) msg = msg + ' (código ' + code + '/' + subcode + ')'
    else if (code) msg = msg + ' (código ' + code + ')'
    return msg
  }

  // Publica no Facebook Página. Retorna { success, postId?, permalink?, error?, expiredToken? }
  function publishToFacebook(pageId, pageToken, caption, imageUrl) {
    if (!pageId) {
      return { success: false, error: 'ID da Página do Facebook não configurado nas Conexões.' }
    }
    if (!pageToken) {
      return {
        success: false,
        error: 'meta_page_access_token ausente. Conecte a Página em Configurações > Conexões.',
      }
    }
    try {
      var res
      if (imageUrl) {
        // Com imagem: POST /{page-id}/photos (url pública)
        res = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(pageId) +
            '/photos?url=' +
            encodeURIComponent(imageUrl) +
            '&caption=' +
            encodeURIComponent(caption) +
            '&access_token=' +
            encodeURIComponent(pageToken),
          method: 'POST',
          timeout: 60,
        })
      } else {
        // Só texto: POST /{page-id}/feed
        res = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(pageId) +
            '/feed?message=' +
            encodeURIComponent(caption) +
            '&access_token=' +
            encodeURIComponent(pageToken),
          method: 'POST',
          timeout: 30,
        })
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        var errMsg = 'Erro na Meta ao publicar no Facebook (HTTP ' + res.statusCode + ')'
        var expired = false
        try {
          if (res.json && res.json.error) {
            errMsg = translateMetaError(res.json.error, errMsg)
            expired = res.json.error.code === 190
          }
        } catch (_) {}
        return { success: false, error: errMsg, expiredToken: expired }
      }

      var postId = (res.json && (res.json.post_id || res.json.id)) || ''
      var permalink = ''
      if (postId) {
        permalink = 'https://www.facebook.com/' + postId
      }
      return { success: true, postId: postId, permalink: permalink }
    } catch (netErr) {
      return {
        success: false,
        error: 'Falha de comunicação com a Graph API (Facebook): ' + String(netErr),
      }
    }
  }

  // Publica no Instagram (fluxo oficial em 2 etapas). Retorna { success, postId?, permalink?, error?, expiredToken? }
  function publishToInstagram(igBizId, token, caption, imageUrl) {
    if (!igBizId) {
      return {
        success: false,
        error:
          'ID da Conta Comercial do Instagram não configurado ou não vinculado a uma Página do Facebook.',
      }
    }
    if (!token) {
      return {
        success: false,
        error:
          'Token de acesso da Página / Instagram ausente no CRM. Conecte em Configurações > Conexões.',
      }
    }
    if (!imageUrl) {
      return { success: false, error: 'Nenhuma imagem encontrada no post para publicação.' }
    }
    try {
      var createRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          encodeURIComponent(igBizId) +
          '/media?image_url=' +
          encodeURIComponent(imageUrl) +
          '&caption=' +
          encodeURIComponent(caption) +
          '&access_token=' +
          encodeURIComponent(token),
        method: 'POST',
        timeout: 60,
      })

      if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
        var errMsg = 'Erro na Meta ao criar container de mídia (HTTP ' + createRes.statusCode + ')'
        var expired = false
        try {
          if (createRes.json && createRes.json.error) {
            errMsg = translateMetaError(createRes.json.error, errMsg)
            expired = createRes.json.error.code === 190
          }
        } catch (_) {}
        return { success: false, error: errMsg, expiredToken: expired }
      }

      var creationId = createRes.json && createRes.json.id
      if (!creationId) {
        return { success: false, error: 'Meta não retornou ID de container de mídia.' }
      }

      var t0 = Date.now()
      while (Date.now() - t0 < 1500) {}

      var pubRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          encodeURIComponent(igBizId) +
          '/media_publish?creation_id=' +
          encodeURIComponent(creationId) +
          '&access_token=' +
          encodeURIComponent(token),
        method: 'POST',
        timeout: 30,
      })

      if (pubRes.statusCode < 200 || pubRes.statusCode >= 300) {
        var pubErrMsg = 'Erro na Meta ao publicar o post (HTTP ' + pubRes.statusCode + ')'
        var pubExpired = false
        try {
          if (pubRes.json && pubRes.json.error) {
            pubErrMsg = translateMetaError(pubRes.json.error, pubErrMsg)
            pubExpired = pubRes.json.error.code === 190
          }
        } catch (_) {}
        return { success: false, error: pubErrMsg, expiredToken: pubExpired }
      }

      var publishedMediaId = (pubRes.json && pubRes.json.id) || creationId
      var permalink = ''
      try {
        var permRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(publishedMediaId) +
            '?fields=permalink&access_token=' +
            encodeURIComponent(token),
          method: 'GET',
          timeout: 10,
        })
        if (permRes.statusCode === 200 && permRes.json && permRes.json.permalink) {
          permalink = permRes.json.permalink
        }
      } catch (_) {}

      return { success: true, postId: publishedMediaId, permalink: permalink }
    } catch (netErr) {
      return {
        success: false,
        error: 'Falha de comunicação com a Graph API (Instagram): ' + String(netErr),
      }
    }
  }

  function findOwnerUser(post) {
    var user = null
    var userId = post.getString('user_id')
    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}
    }
    if (!user) {
      try {
        user = $app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
      } catch (_) {}
    }
    return user
  }

  function processPost(post) {
    var channels = getChannels(post)
    var user = findOwnerUser(post)
    var attempt = post.getInt('attempt_count') || 0

    if (!user) {
      post.set('status', 'falhou')
      post.set('error_message', 'Usuário administrador BRF Imóveis não localizado.')
      $app.save(post)
      logSystem(
        'error',
        'scheduled_post_failed',
        'Usuário não localizado para post ' + post.id,
        post.id,
      )
      return
    }

    var pageId = (
      user.getString('meta_page_id') ||
      user.getString('meta_facebook_page_id') ||
      ''
    ).trim()
    if (!pageId) {
      // Página conhecida da BRF Imóveis como fallback (Plano B Messenger/IG)
      pageId = '1401557100168686'
    }
    var pageToken = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()
    var oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    var tokenStatus = (user.getString('meta_token_status') || '').trim()
    var igBizId = (user.getString('meta_instagram_business_id') || '').trim()
    var igToken = pageToken || oauthUserToken

    var caption = buildFullCaption(post.getString('caption'), post.getString('link_cta'))
    var imageUrl = resolvePostImageUrl(post)
    var anySuccess = false
    var errors = []
    var tokenExpired = false

    for (var c = 0; c < channels.length; c++) {
      var channel = channels[c]
      var alreadyDone = false
      if (channel === 'facebook' && post.getString('fb_post_id')) alreadyDone = true
      if (channel === 'instagram' && post.getString('ig_post_id')) alreadyDone = true
      if (alreadyDone) continue

      if (tokenStatus === 'expired') {
        errors.push(
          'Token da Meta expirado — renove em Configurações (Conexões). ' +
            (channel === 'facebook' ? 'Facebook não publicado.' : 'Instagram não publicado.'),
        )
        tokenExpired = true
        continue
      }

      var r
      if (channel === 'facebook') {
        r = publishToFacebook(pageId, pageToken, caption, imageUrl)
        if (r.success) {
          post.set('fb_post_id', r.postId || '')
          post.set('fb_permalink', r.permalink || '')
        }
      } else {
        r = publishToInstagram(igBizId, igToken, caption, imageUrl)
        if (r.success) {
          post.set('ig_post_id', r.postId || '')
          post.set('ig_permalink', r.permalink || '')
        }
      }

      if (r.success) {
        anySuccess = true
        logSystem(
          'info',
          'scheduled_post_published',
          'Post ' + post.id + ' publicado no ' + channel + ' — id ' + (r.postId || '?'),
          post.id,
        )
      } else {
        errors.push(channel + ': ' + (r.error || 'erro desconhecido'))
        if (r.expiredToken) tokenExpired = true
        logSystem(
          'error',
          'scheduled_post_failed',
          'Falha ao publicar post ' + post.id + ' no ' + channel + ' — ' + (r.error || ''),
          post.id,
        )
      }
    }

    var allDone = true
    for (var c2 = 0; c2 < channels.length; c2++) {
      if (channels[c2] === 'facebook' && !post.getString('fb_post_id')) allDone = false
      if (channels[c2] === 'instagram' && !post.getString('ig_post_id')) allDone = false
    }

    if (anySuccess && allDone) {
      post.set('status', 'publicado')
      post.set('published_at', new Date().toISOString().replace('T', ' ').slice(0, 19))
      post.set('error_message', '')
      $app.save(post)
      $app.logger().info('Post ' + post.id + ' publicado em todos os canais.')
    } else if (anySuccess) {
      // Publicou em um canal e falhou no outro: deixa publicar o restante na próxima rodada
      post.set('attempt_count', attempt + 1)
      post.set('error_message', errors.join(' | ') || '')
      $app.save(post)
      $app.logger().warn('Post ' + post.id + ' parcialmente publicado; tentará o restante.')
    } else if (tokenExpired) {
      // Token expirado: NÃO retentar infinitamente — marca falhou direto
      post.set('status', 'falhou')
      post.set('attempt_count', attempt + 1)
      post.set(
        'error_message',
        'Token da Meta expirado — renove em Configurações (Conexões). ' +
          (errors.join(' | ') || ''),
      )
      $app.save(post)
      $app.logger().warn('Post ' + post.id + ' falhou: token Meta expirado.')
    } else if (attempt + 1 >= 3) {
      post.set('status', 'falhou')
      post.set('attempt_count', attempt + 1)
      post.set('error_message', errors.join(' | ') || 'Erro desconhecido após 3 tentativas.')
      $app.save(post)
      $app.logger().warn('Post ' + post.id + ' falhou definitivamente após 3 tentativas.')
    } else {
      post.set('attempt_count', attempt + 1)
      post.set('error_message', errors.join(' | ') || '')
      $app.save(post)
      $app.logger().warn('Post ' + post.id + ' falhou; tentativa ' + (attempt + 1) + '/3.')
    }
  }

  // ---- corpo do cron ----
  var nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19)

  var pendingPosts = []
  try {
    pendingPosts = $app.findRecordsByFilter(
      'scheduled_posts',
      "status = 'agendado' && scheduled_at != '' && scheduled_at <= '" + nowIso + "'",
      'scheduled_at',
      10,
      0,
    )
  } catch (err) {
    $app.logger().error('Erro ao buscar scheduled_posts no cron', 'error', String(err))
    return
  }

  if (!pendingPosts || pendingPosts.length === 0) {
    return
  }

  $app
    .logger()
    .info('Processando cron de scheduled_posts: ' + pendingPosts.length + ' posts a publicar')

  for (var i = 0; i < pendingPosts.length; i++) {
    try {
      processPost(pendingPosts[i])
    } catch (postErr) {
      $app.logger().error('Erro ao processar post ' + pendingPosts[i].id, 'error', String(postErr))
      try {
        pendingPosts[i].set('status', 'falhou')
        pendingPosts[i].set('error_message', 'Exceção interna: ' + String(postErr))
        $app.save(pendingPosts[i])
      } catch (_) {}
    }
  }
})

// 2. ENDPOINT: Publicar Agora sob demanda
routerAdd(
  'POST',
  '/backend/v1/posts/{id}/publish_now',
  (e) => {
    function buildFullCaption(caption, linkCta) {
      var full = (caption || '').trim()
      var cta = (linkCta || '').trim()
      if (cta) {
        full = full ? full + '\n\n' + '🔗 Saiba mais: ' + cta : '🔗 Saiba mais: ' + cta
      }
      return full
    }

    function resolvePostImageUrl(postRecord) {
      var images = postRecord.get('images')
      if (Array.isArray(images) && images.length > 0 && images[0]) {
        var filename = images[0]
        var pbBaseUrl =
          $os.getenv('PUBLIC_URL') ||
          $os.getenv('POCKETBASE_URL') ||
          'https://ia-uazapi-6d79e.shrd00.internal.goskip.dev'
        return (
          pbBaseUrl +
          '/api/files/scheduled_posts/' +
          postRecord.id +
          '/' +
          encodeURIComponent(filename)
        )
      }
      var imageUrls = postRecord.get('image_urls')
      if (Array.isArray(imageUrls) && imageUrls.length > 0 && imageUrls[0]) {
        return String(imageUrls[0]).trim()
      }
      return ''
    }

    function getChannels(postRecord) {
      var ch = postRecord.get('channels')
      if (Array.isArray(ch) && ch.length > 0) {
        var out = []
        for (var i = 0; i < ch.length; i++) {
          var v = String(ch[i] || '')
            .trim()
            .toLowerCase()
          if (v === 'fb' || v === 'facebook') v = 'facebook'
          if (v === 'ig' || v === 'instagram') v = 'instagram'
          if (v === 'facebook' || v === 'instagram') out.push(v)
        }
        if (out.length > 0) return out
      }
      return ['instagram']
    }

    function translateMetaError(fbErr, fallback) {
      if (!fbErr) return fallback || 'Erro desconhecido na Meta.'
      var msg = fbErr.message || fallback || 'Erro na Meta.'
      if (fbErr.error_user_msg) msg = fbErr.error_user_msg
      if (fbErr.code === 190) {
        msg =
          'Token da Meta expirado — renove em Configurações (Conexões). ' + (fbErr.message || '')
      }
      if (fbErr.code === 10 || fbErr.code === 200 || fbErr.code === 2500) {
        msg =
          'Permissão ausente no token: publicar exige pages_manage_posts (Facebook) e ' +
          'instagram_content_publish (Instagram). A Bernadete precisa regenerar o token em ' +
          'Configurações > Conexões com essas permissões extras. Detalhe: ' +
          (fbErr.message || '')
      }
      return msg
    }

    function publishToFacebook(pageId, pageToken, caption, imageUrl) {
      if (!pageId) return { success: false, error: 'ID da Página do Facebook não configurado.' }
      if (!pageToken) return { success: false, error: 'meta_page_access_token ausente.' }
      try {
        var res
        if (imageUrl) {
          res = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              encodeURIComponent(pageId) +
              '/photos?url=' +
              encodeURIComponent(imageUrl) +
              '&caption=' +
              encodeURIComponent(caption) +
              '&access_token=' +
              encodeURIComponent(pageToken),
            method: 'POST',
            timeout: 60,
          })
        } else {
          res = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              encodeURIComponent(pageId) +
              '/feed?message=' +
              encodeURIComponent(caption) +
              '&access_token=' +
              encodeURIComponent(pageToken),
            method: 'POST',
            timeout: 30,
          })
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          var errMsg = 'Erro na Meta ao publicar no Facebook (HTTP ' + res.statusCode + ')'
          var expired = false
          try {
            if (res.json && res.json.error) {
              errMsg = translateMetaError(res.json.error, errMsg)
              expired = res.json.error.code === 190
            }
          } catch (_) {}
          return { success: false, error: errMsg, expiredToken: expired }
        }
        var postId = (res.json && (res.json.post_id || res.json.id)) || ''
        return {
          success: true,
          postId: postId,
          permalink: postId ? 'https://www.facebook.com/' + postId : '',
        }
      } catch (netErr) {
        return {
          success: false,
          error: 'Falha de comunicação com a Graph API (Facebook): ' + String(netErr),
        }
      }
    }

    function publishToInstagram(igBizId, token, caption, imageUrl) {
      if (!igBizId)
        return { success: false, error: 'ID da Conta Comercial do Instagram não configurado.' }
      if (!token) return { success: false, error: 'Token de acesso da Página / Instagram ausente.' }
      if (!imageUrl) return { success: false, error: 'Nenhuma imagem encontrada no post.' }
      try {
        var createRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(igBizId) +
            '/media?image_url=' +
            encodeURIComponent(imageUrl) +
            '&caption=' +
            encodeURIComponent(caption) +
            '&access_token=' +
            encodeURIComponent(token),
          method: 'POST',
          timeout: 60,
        })
        if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
          var errMsg =
            'Erro na Meta ao criar container de mídia (HTTP ' + createRes.statusCode + ')'
          var expired = false
          try {
            if (createRes.json && createRes.json.error) {
              errMsg = translateMetaError(createRes.json.error, errMsg)
              expired = createRes.json.error.code === 190
            }
          } catch (_) {}
          return { success: false, error: errMsg, expiredToken: expired }
        }
        var creationId = createRes.json && createRes.json.id
        if (!creationId) return { success: false, error: 'Meta não retornou ID de container.' }

        var t0 = Date.now()
        while (Date.now() - t0 < 1500) {}

        var pubRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(igBizId) +
            '/media_publish?creation_id=' +
            encodeURIComponent(creationId) +
            '&access_token=' +
            encodeURIComponent(token),
          method: 'POST',
          timeout: 30,
        })
        if (pubRes.statusCode < 200 || pubRes.statusCode >= 300) {
          var pubErrMsg = 'Erro na Meta ao publicar (HTTP ' + pubRes.statusCode + ')'
          var pubExpired = false
          try {
            if (pubRes.json && pubRes.json.error) {
              pubErrMsg = translateMetaError(pubRes.json.error, pubErrMsg)
              pubExpired = pubRes.json.error.code === 190
            }
          } catch (_) {}
          return { success: false, error: pubErrMsg, expiredToken: pubExpired }
        }
        var publishedMediaId = (pubRes.json && pubRes.json.id) || creationId
        var permalink = ''
        try {
          var permRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              encodeURIComponent(publishedMediaId) +
              '?fields=permalink&access_token=' +
              encodeURIComponent(token),
            method: 'GET',
            timeout: 10,
          })
          if (permRes.statusCode === 200 && permRes.json && permRes.json.permalink) {
            permalink = permRes.json.permalink
          }
        } catch (_) {}
        return { success: true, postId: publishedMediaId, permalink: permalink }
      } catch (netErr) {
        return {
          success: false,
          error: 'Falha de comunicação com a Graph API (Instagram): ' + String(netErr),
        }
      }
    }

    function logSystem(level, type, message, postId) {
      try {
        var col = $app.findCollectionByNameOrId('system_logs')
        var rec = new Record(col)
        rec.set('level', level)
        rec.set('type', type)
        rec.set('message', message)
        if (postId) rec.set('reference_id', postId)
        $app.save(rec)
      } catch (logErr) {
        $app.logger().warn('Falha ao gravar system_logs (' + type + '): ' + String(logErr))
      }
    }

    var authRecord = e.requestInfo().auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado.' })
    }

    var postId = e.request.pathValue('id')
    if (!postId) {
      return e.json(400, { error: 'ID do post obrigatório.' })
    }

    var post = null
    try {
      post = $app.findRecordById('scheduled_posts', postId)
    } catch (_) {
      return e.json(404, { error: 'Post não encontrado.' })
    }

    if (post.getString('status') === 'cancelado') {
      return e.json(400, { error: 'Este post foi cancelado e não pode ser publicado.' })
    }

    var user = null
    try {
      user = $app.findRecordById('users', authRecord.id)
    } catch (_) {
      user = authRecord
    }

    var channels = getChannels(post)
    var pageId = (
      user.getString('meta_page_id') ||
      user.getString('meta_facebook_page_id') ||
      ''
    ).trim()
    if (!pageId) pageId = '1401557100168686'
    var pageToken = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()
    var oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    var tokenStatus = (user.getString('meta_token_status') || '').trim()
    var igBizId = (user.getString('meta_instagram_business_id') || '').trim()
    var igToken = pageToken || oauthUserToken

    var caption = buildFullCaption(post.getString('caption'), post.getString('link_cta'))
    var imageUrl = resolvePostImageUrl(post)
    var anySuccess = false
    var errors = []
    var tokenExpired = false

    for (var c = 0; c < channels.length; c++) {
      var channel = channels[c]
      var alreadyDone = false
      if (channel === 'facebook' && post.getString('fb_post_id')) alreadyDone = true
      if (channel === 'instagram' && post.getString('ig_post_id')) alreadyDone = true
      if (alreadyDone) continue

      if (tokenStatus === 'expired') {
        errors.push('Token da Meta expirado — renove em Configurações (Conexões).')
        tokenExpired = true
        continue
      }

      var r
      if (channel === 'facebook') {
        r = publishToFacebook(pageId, pageToken, caption, imageUrl)
        if (r.success) {
          post.set('fb_post_id', r.postId || '')
          post.set('fb_permalink', r.permalink || '')
        }
      } else {
        r = publishToInstagram(igBizId, igToken, caption, imageUrl)
        if (r.success) {
          post.set('ig_post_id', r.postId || '')
          post.set('ig_permalink', r.permalink || '')
        }
      }

      if (r.success) {
        anySuccess = true
        logSystem(
          'info',
          'scheduled_post_published',
          'Post ' + post.id + ' publicado no ' + channel + ' (manual) — id ' + (r.postId || '?'),
          post.id,
        )
      } else {
        errors.push(channel + ': ' + (r.error || 'erro desconhecido'))
        if (r.expiredToken) tokenExpired = true
        logSystem(
          'error',
          'scheduled_post_failed',
          'Falha (manual) post ' + post.id + ' no ' + channel + ' — ' + (r.error || ''),
          post.id,
        )
      }
    }

    var allDone = true
    for (var c2 = 0; c2 < channels.length; c2++) {
      if (channels[c2] === 'facebook' && !post.getString('fb_post_id')) allDone = false
      if (channels[c2] === 'instagram' && !post.getString('ig_post_id')) allDone = false
    }

    var nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19)

    if (anySuccess && allDone) {
      post.set('status', 'publicado')
      post.set('published_at', nowStr)
      post.set('error_message', '')
      $app.save(post)
      return e.json(200, {
        success: true,
        message: 'Post publicado com sucesso!',
        post: { id: post.id, status: 'publicado', published_at: nowStr },
      })
    }

    if (anySuccess) {
      post.set('error_message', errors.join(' | ') || '')
      $app.save(post)
      return e.json(200, {
        success: true,
        message: 'Publicado em parte dos canais. Restante: ' + errors.join(' | '),
        post: { id: post.id, status: post.getString('status'), published_at: nowStr },
      })
    }

    post.set('status', 'falhou')
    post.set('error_message', errors.join(' | ') || 'Erro desconhecido ao publicar.')
    $app.save(post)
    return e.json(200, {
      success: false,
      status: 'falhou',
      message: errors.join(' | ') || 'Erro desconhecido ao publicar.',
      degraded_mode: true,
    })
  },
  $apis.requireAuth(),
)

// 3. ENDPOINT: Sugerir Legenda com a Bia (Cérebro do CRM)
routerAdd(
  'POST',
  '/backend/v1/posts/suggest_caption',
  (e) => {
    var authRecord = e.requestInfo().auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado.' })
    }

    var body = e.requestInfo().body || {}
    var launchId = (body.launch_id || '').trim()
    var promptContext = (body.prompt || '').trim()
    var tone = (body.tone || 'engajador').trim()

    var launchData = null
    if (launchId) {
      try {
        var l = $app.findRecordById('launches', launchId)
        launchData = {
          name: l.getString('name'),
          enterprise_name: l.getString('enterprise_name'),
          headline: l.getString('headline'),
          description: l.getString('description'),
          location: l.getString('location'),
          differentials: l.get('differentials'),
          sales_arguments: l.getString('sales_arguments'),
          payment_terms: l.getString('payment_terms'),
          slug: l.getString('slug'),
        }
      } catch (err) {
        console.warn('Lançamento não encontrado para sugestão de post:', err)
      }
    }

    var systemPrompt = [
      'Você é a Bia, inteligência comercial e estrategista de conteúdo da BRF Imóveis (Florianópolis, São José e região).',
      'Sua tarefa é criar legendas altamente persuasivas e profissionais para as redes sociais da BRF Imóveis (Instagram e Facebook Página).',
      '',
      'Diretrizes de redação:',
      '1. Gancho forte nas primeiras duas linhas (antes do "ver mais").',
      '2. Valorize localização, acabamento, vista, lazer e potencial de valorização/rentabilidade.',
      '3. Divida o texto com quebras de linha confortáveis para leitura móvel.',
      '4. Uso sutil e elegante de emojis imobiliários (sem exagero).',
      '5. Inclua CTA claro convidando para clicar no link, mandar mensagem no direct ou chamar no WhatsApp.',
      '6. Inclua de 4 a 6 hashtags relevantes da região (#BRFImoveis #ImoveisFloripa #SaoJoseSC #LancamentoImobiliario, etc.).',
      '7. Retorne APENAS o texto pronto da legenda (sem preâmbulos nem aspas).',
    ].join('\n')

    var userPrompt = 'Crie uma legenda para um post das redes sociais da BRF Imóveis.\n'
    if (launchData) {
      userPrompt +=
        '\nLançamento: ' + launchData.name + ' (' + (launchData.enterprise_name || '') + ')\n'
      userPrompt += 'Localização: ' + (launchData.location || 'Grande Florianópolis') + '\n'
      if (launchData.headline) userPrompt += 'Headline: ' + launchData.headline + '\n'
      if (launchData.description) userPrompt += 'Descrição: ' + launchData.description + '\n'
      if (launchData.payment_terms) userPrompt += 'Condições: ' + launchData.payment_terms + '\n'
      if (launchData.sales_arguments)
        userPrompt += 'Argumentos: ' + launchData.sales_arguments + '\n'
    }
    if (promptContext) {
      userPrompt += '\nInstruções adicionais do corretor: ' + promptContext + '\n'
    }
    userPrompt += '\nTom desejado: ' + tone + '.'

    try {
      var chatRes = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      var captionText =
        chatRes && chatRes.choices && chatRes.choices[0] && chatRes.choices[0].message
          ? (chatRes.choices[0].message.content || '').trim()
          : ''

      return e.json(200, {
        success: true,
        caption: captionText,
        launch_used: launchData ? launchData.name : null,
      })
    } catch (aiErr) {
      console.error('Erro ao chamar $ai.chat para legenda de post:', String(aiErr))
      return e.json(500, {
        error: 'Falha ao gerar legenda com a Bia: ' + String(aiErr),
      })
    }
  },
  $apis.requireAuth(),
)

// 4. ENDPOINT: Status das integrações para banners explicativos
routerAdd(
  'GET',
  '/backend/v1/posts/instagram_status',
  (e) => {
    var authRecord = e.requestInfo().auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autorizado.' })
    }

    var user = null
    try {
      user = $app.findRecordById('users', authRecord.id)
    } catch (_) {
      user = authRecord
    }

    var igBizId = (user.getString('meta_instagram_business_id') || '').trim()
    var oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    var pageToken = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()
    var igUsername = (user.getString('instagram_username') || 'brf_imoveis_').trim()
    var tokenStatus = (user.getString('meta_token_status') || '').trim()

    var pageId = (
      user.getString('meta_page_id') ||
      user.getString('meta_facebook_page_id') ||
      ''
    ).trim()
    if (!pageId) pageId = '1401557100168686'

    var hasIgAccount = !!igBizId
    var hasToken = !!(pageToken || oauthUserToken)
    var isTokenExpired = tokenStatus === 'expired'

    var canAutoPublish = hasIgAccount && hasToken && !isTokenExpired
    var degradedReason = ''
    var fbDegradedReason = ''

    if (isTokenExpired) {
      canAutoPublish = false
      degradedReason =
        'Token da Meta expirado — renove em Configurações (Conexões). A Bernadete precisa gerar um novo token.'
      fbDegradedReason = degradedReason
    } else if (!hasToken) {
      degradedReason =
        'Token de acesso não disponível. Conecte sua conta em Configurações > Conexões.'
      fbDegradedReason = degradedReason
    } else if (!hasIgAccount) {
      degradedReason =
        'Conta profissional do Instagram não vinculada à Página da BRF Imóveis no Meta Business Suite (em processo de liberação).'
    }

    return e.json(200, {
      can_auto_publish: canAutoPublish,
      mode: canAutoPublish ? 'automatic' : 'manual_degraded',
      instagram_username: igUsername,
      instagram_business_id: igBizId,
      degraded_reason: degradedReason,
      facebook_page_id: pageId,
      has_fb_token: hasToken,
      has_ig_account: hasIgAccount,
      token_expired: isTokenExpired,
      fb_degraded_reason: fbDegradedReason,
    })
  },
  $apis.requireAuth(),
)
