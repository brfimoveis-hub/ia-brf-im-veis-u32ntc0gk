/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para Agendamento e Publicação Automática de Posts no Instagram + Integração com a Bia.
 *
 * Inclui:
 * 1. Cron de 5 minutos ('cron_publish_scheduled_posts') para publicar posts pendentes
 * 2. POST /backend/v1/posts/:id/publish_now - Publicação imediata sob demanda
 * 3. POST /backend/v1/posts/suggest_caption - Geração de legenda com a Bia ($ai.chat / Bia Mãe)
 * 4. GET /backend/v1/posts/instagram_status - Status da integração do Instagram para exibição do banner
 */

// 1. CRON AGENDADOR: A cada 5 minutos, processa posts agendados
cronAdd('cron_publish_scheduled_posts', '*/5 * * * *', () => {
  function buildFullCaption(caption, linkCta) {
    var full = (caption || '').trim()
    var cta = (linkCta || '').trim()
    if (cta) {
      if (full) {
        full = full + '\n\n' + '🔗 Saiba mais: ' + cta
      } else {
        full = '🔗 Saiba mais: ' + cta
      }
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

  function doPublish(postRecord, userRecord) {
    var igBizId = (userRecord.getString('meta_instagram_business_id') || '').trim()
    var oauthUserToken = (userRecord.getString('meta_instagram_user_token') || '').trim()
    var pageToken = (
      userRecord.getString('meta_instagram_page_token') ||
      userRecord.getString('meta_page_access_token') ||
      ''
    ).trim()
    var tokenToUse = pageToken || oauthUserToken

    if (!igBizId) {
      return {
        success: false,
        error:
          'ID da Conta Comercial do Instagram não configurado ou não vinculado a uma Página do Facebook.',
      }
    }

    if (!tokenToUse) {
      return {
        success: false,
        error:
          'Token de acesso da Página / Instagram ausente no CRM. Conecte sua conta em Conexões > Instagram.',
      }
    }

    var imageUrl = resolvePostImageUrl(postRecord)
    if (!imageUrl) {
      return {
        success: false,
        error: 'Nenhuma imagem encontrada no post para publicação.',
      }
    }

    var caption = buildFullCaption(
      postRecord.getString('caption'),
      postRecord.getString('link_cta'),
    )

    try {
      var createMediaUrl =
        'https://graph.facebook.com/v22.0/' +
        encodeURIComponent(igBizId) +
        '/media?image_url=' +
        encodeURIComponent(imageUrl) +
        '&caption=' +
        encodeURIComponent(caption) +
        '&access_token=' +
        encodeURIComponent(tokenToUse)

      var createRes = $http.send({
        url: createMediaUrl,
        method: 'POST',
        timeout: 30,
      })

      if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
        var errMsg = 'Erro na Meta ao criar container de mídia (HTTP ' + createRes.statusCode + ')'
        try {
          var errJson = createRes.json
          if (errJson && errJson.error) {
            var fbErr = errJson.error
            errMsg = fbErr.message || errMsg
            if (fbErr.code === 10 || fbErr.code === 200) {
              errMsg =
                'Permissão instagram_content_publish ausente no app da Meta ou conta não elegível. Modo manual disponível.'
            } else if (fbErr.code === 190) {
              errMsg = 'Token de acesso do Instagram expirado ou inválido. Reconecte via OAuth.'
            } else if (fbErr.error_user_msg) {
              errMsg = fbErr.error_user_msg
            }
          }
        } catch (_) {}
        return { success: false, error: errMsg }
      }

      var creationId = createRes.json && createRes.json.id
      if (!creationId) {
        return { success: false, error: 'Meta não retornou ID de container de mídia.' }
      }

      var t0 = Date.now()
      while (Date.now() - t0 < 1500) {}

      var publishUrl =
        'https://graph.facebook.com/v22.0/' +
        encodeURIComponent(igBizId) +
        '/media_publish?creation_id=' +
        encodeURIComponent(creationId) +
        '&access_token=' +
        encodeURIComponent(tokenToUse)

      var pubRes = $http.send({
        url: publishUrl,
        method: 'POST',
        timeout: 30,
      })

      if (pubRes.statusCode < 200 || pubRes.statusCode >= 300) {
        var pubErrMsg = 'Erro na Meta ao publicar o post (HTTP ' + pubRes.statusCode + ')'
        try {
          var pErrJson = pubRes.json
          if (pErrJson && pErrJson.error) {
            var pFbErr = pErrJson.error
            pubErrMsg = pFbErr.message || pubErrMsg
            if (pFbErr.error_user_msg) pubErrMsg = pFbErr.error_user_msg
          }
        } catch (_) {}
        return { success: false, error: pubErrMsg }
      }

      var publishedMediaId = (pubRes.json && pubRes.json.id) || creationId
      var permalink = ''
      try {
        var permRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(publishedMediaId) +
            '?fields=permalink&access_token=' +
            encodeURIComponent(tokenToUse),
          method: 'GET',
          timeout: 10,
        })
        if (permRes.statusCode === 200 && permRes.json && permRes.json.permalink) {
          permalink = permRes.json.permalink
        }
      } catch (_) {}

      return {
        success: true,
        mediaId: publishedMediaId,
        permalink: permalink,
      }
    } catch (netErr) {
      return {
        success: false,
        error:
          'Falha de comunicação com a Graph API: ' +
          String(netErr && netErr.message ? netErr.message : netErr),
      }
    }
  }

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
    var post = pendingPosts[i]
    try {
      var userId = post.getString('user_id')
      var user = null
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

      if (!user) {
        post.set('status', 'falhou')
        post.set('error_message', 'Usuário administrador BRF Imóveis não localizado.')
        $app.save(post)
        continue
      }

      var result = doPublish(post, user)
      var nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19)

      if (result.success) {
        post.set('status', 'publicado')
        post.set('published_at', nowStr)
        post.set('error_message', '')
        if (result.mediaId) post.set('meta_media_id', result.mediaId)
        if (result.permalink) post.set('meta_permalink', result.permalink)
        $app.save(post)
        $app.logger().info('Post ' + post.id + ' publicado com sucesso no Instagram!')
      } else {
        post.set('status', 'falhou')
        post.set('error_message', result.error || 'Erro desconhecido ao publicar no Instagram')
        $app.save(post)
        $app.logger().warn('Post ' + post.id + ' falhou ao publicar no Instagram: ' + result.error)
      }
    } catch (postErr) {
      $app.logger().error('Erro ao processar post ' + post.id, 'error', String(postErr))
      try {
        post.set('status', 'falhou')
        post.set('error_message', 'Exceção interna: ' + String(postErr))
        $app.save(post)
      } catch (_) {}
    }
  }
})

// 2. ENDPOINT: Publicar Agora sob demanda
routerAdd(
  'POST',
  '/backend/v1/posts/:id/publish_now',
  (e) => {
    function buildFullCaption(caption, linkCta) {
      var full = (caption || '').trim()
      var cta = (linkCta || '').trim()
      if (cta) {
        if (full) {
          full = full + '\n\n' + '🔗 Saiba mais: ' + cta
        } else {
          full = '🔗 Saiba mais: ' + cta
        }
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

    function doPublish(postRecord, userRecord) {
      var igBizId = (userRecord.getString('meta_instagram_business_id') || '').trim()
      var oauthUserToken = (userRecord.getString('meta_instagram_user_token') || '').trim()
      var pageToken = (
        userRecord.getString('meta_instagram_page_token') ||
        userRecord.getString('meta_page_access_token') ||
        ''
      ).trim()
      var tokenToUse = pageToken || oauthUserToken

      if (!igBizId) {
        return {
          success: false,
          error:
            'ID da Conta Comercial do Instagram não configurado ou não vinculado a uma Página do Facebook.',
        }
      }

      if (!tokenToUse) {
        return {
          success: false,
          error:
            'Token de acesso da Página / Instagram ausente no CRM. Conecte sua conta em Conexões > Instagram.',
        }
      }

      var imageUrl = resolvePostImageUrl(postRecord)
      if (!imageUrl) {
        return {
          success: false,
          error: 'Nenhuma imagem encontrada no post para publicação.',
        }
      }

      var caption = buildFullCaption(
        postRecord.getString('caption'),
        postRecord.getString('link_cta'),
      )

      try {
        var createMediaUrl =
          'https://graph.facebook.com/v22.0/' +
          encodeURIComponent(igBizId) +
          '/media?image_url=' +
          encodeURIComponent(imageUrl) +
          '&caption=' +
          encodeURIComponent(caption) +
          '&access_token=' +
          encodeURIComponent(tokenToUse)

        var createRes = $http.send({
          url: createMediaUrl,
          method: 'POST',
          timeout: 30,
        })

        if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
          var errMsg =
            'Erro na Meta ao criar container de mídia (HTTP ' + createRes.statusCode + ')'
          try {
            var errJson = createRes.json
            if (errJson && errJson.error) {
              var fbErr = errJson.error
              errMsg = fbErr.message || errMsg
              if (fbErr.code === 10 || fbErr.code === 200) {
                errMsg =
                  'Permissão instagram_content_publish ausente no app da Meta ou conta não elegível. Modo manual disponível.'
              } else if (fbErr.code === 190) {
                errMsg = 'Token de acesso do Instagram expirado ou inválido. Reconecte via OAuth.'
              } else if (fbErr.error_user_msg) {
                errMsg = fbErr.error_user_msg
              }
            }
          } catch (_) {}
          return { success: false, error: errMsg }
        }

        var creationId = createRes.json && createRes.json.id
        if (!creationId) {
          return { success: false, error: 'Meta não retornou ID de container de mídia.' }
        }

        var t0 = Date.now()
        while (Date.now() - t0 < 1500) {}

        var publishUrl =
          'https://graph.facebook.com/v22.0/' +
          encodeURIComponent(igBizId) +
          '/media_publish?creation_id=' +
          encodeURIComponent(creationId) +
          '&access_token=' +
          encodeURIComponent(tokenToUse)

        var pubRes = $http.send({
          url: publishUrl,
          method: 'POST',
          timeout: 30,
        })

        if (pubRes.statusCode < 200 || pubRes.statusCode >= 300) {
          var pubErrMsg = 'Erro na Meta ao publicar o post (HTTP ' + pubRes.statusCode + ')'
          try {
            var pErrJson = pubRes.json
            if (pErrJson && pErrJson.error) {
              var pFbErr = pErrJson.error
              pubErrMsg = pFbErr.message || pubErrMsg
              if (pFbErr.error_user_msg) pubErrMsg = pFbErr.error_user_msg
            }
          } catch (_) {}
          return { success: false, error: pubErrMsg }
        }

        var publishedMediaId = (pubRes.json && pubRes.json.id) || creationId
        var permalink = ''
        try {
          var permRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              encodeURIComponent(publishedMediaId) +
              '?fields=permalink&access_token=' +
              encodeURIComponent(tokenToUse),
            method: 'GET',
            timeout: 10,
          })
          if (permRes.statusCode === 200 && permRes.json && permRes.json.permalink) {
            permalink = permRes.json.permalink
          }
        } catch (_) {}

        return {
          success: true,
          mediaId: publishedMediaId,
          permalink: permalink,
        }
      } catch (netErr) {
        return {
          success: false,
          error:
            'Falha de comunicação com a Graph API: ' +
            String(netErr && netErr.message ? netErr.message : netErr),
        }
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

    var user = null
    try {
      user = $app.findRecordById('users', authRecord.id)
    } catch (_) {
      user = authRecord
    }

    var result = doPublish(post, user)
    var nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19)

    if (result.success) {
      post.set('status', 'publicado')
      post.set('published_at', nowStr)
      post.set('error_message', '')
      if (result.mediaId) post.set('meta_media_id', result.mediaId)
      if (result.permalink) post.set('meta_permalink', result.permalink)
      $app.save(post)

      return e.json(200, {
        success: true,
        message: 'Post publicado com sucesso no Instagram!',
        post: {
          id: post.id,
          status: 'publicado',
          published_at: nowStr,
          meta_permalink: result.permalink,
        },
      })
    } else {
      post.set('status', 'falhou')
      post.set('error_message', result.error || 'Erro desconhecido ao publicar no Instagram')
      $app.save(post)

      return e.json(200, {
        success: false,
        status: 'falhou',
        message: result.error,
        degraded_mode: true,
      })
    }
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
      'Sua tarefa é criar legendas altamente persuasivas e profissionais para o Instagram da BRF Imóveis (@mauro.brfimoveis).',
      '',
      'Diretrizes de redação:',
      '1. Gancho forte nas primeiras duas linhas (antes do "ver mais" do Instagram).',
      '2. Valorize localização, acabamento, vista, lazer e potencial de valorização/rentabilidade.',
      '3. Divida o texto com quebras de linha confortáveis para leitura móvel.',
      '4. Uso sutil e elegante de emojis imobiliários (sem exagero).',
      '5. Inclua CTA claro convidando para clicar no link da bio, mandar mensagem no direct ou chamar no WhatsApp.',
      '6. Inclua de 4 a 6 hashtags relevantes da região (#BRFImoveis #ImoveisFloripa #SaoJoseSC #LancamentoImobiliario, etc.).',
      '7. Retorne APENAS o texto pronto da legenda (sem preâmbulos nem aspas).',
    ].join('\n')

    var userPrompt = 'Crie uma legenda para um post de Instagram da BRF Imóveis.\n'
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

// 4. ENDPOINT: Status do Instagram para banners explicativos
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
    var igUsername = (user.getString('instagram_username') || 'mauro.brfimoveis').trim()

    var hasAccount = !!igBizId
    var hasToken = !!(pageToken || oauthUserToken)

    var canAutoPublish = hasAccount && hasToken
    var degradedReason = ''

    if (!hasAccount && !hasToken) {
      canAutoPublish = false
      degradedReason =
        'Conta do Instagram e Página do Facebook ainda não vinculadas nas Conexões do CRM.'
    } else if (!hasAccount) {
      canAutoPublish = false
      degradedReason =
        'Conta profissional do Instagram não vinculada à Página da BRF Imóveis no Meta Business Suite (em processo de liberação).'
    } else if (!hasToken) {
      canAutoPublish = false
      degradedReason =
        'Token de acesso do Instagram não disponível. Conecte sua conta em Conexões > Instagram.'
    }

    return e.json(200, {
      can_auto_publish: canAutoPublish,
      mode: canAutoPublish ? 'automatic' : 'manual_degraded',
      instagram_username: igUsername,
      instagram_business_id: igBizId,
      degraded_reason: degradedReason,
    })
  },
  $apis.requireAuth(),
)
