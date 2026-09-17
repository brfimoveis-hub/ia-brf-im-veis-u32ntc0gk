// pocketbase/hooks/token_diagnostic.js
// Hook de diagnóstico do Meta User Access Token fornecido pelo usuário.
// Realiza chamadas à Meta Graph API v22.0:
// 1. GET /me?fields=id,name,email
// 2. GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100
// 3. GET /me/permissions
// Imprime logs com prefixo [TOKEN_DIAG] com token mascarado.
// Se encontrar a página 1343797128806374 com instagram_business_account, atualiza o usuário no banco.

// Endpoint HTTP GET para executar o diagnóstico e retornar o resultado completo
routerAdd('GET', '/backend/v1/diagnostic/meta_token', (e) => {
  const token =
    'EAANEkx5ozUABSiz8wLru6ZAPgO54ZAQc2k0uBUS24JRqsRr2cTtZAchRMCcfoJqQpXoZCaFW5eJTkpRinyeC92Hn4OMkCbUxhIUa5QINtt3LWoXK6jDXI1uVTLyhGvZC2dQJliyUEJtRTCpRNJmgFg8nZBb6FBTF8lnZB2mikWISAcJ8cySzhTVSdGZBY8srdAZDZD'
  const maskedToken = '...' + token.slice(-4)

  console.log('[TOKEN_DIAG] ==========================================')
  console.log('[TOKEN_DIAG] INICIANDO DIAGNÓSTICO DO TOKEN: ' + maskedToken)
  console.log('[TOKEN_DIAG] ==========================================')

  const results = {
    token_suffix: maskedToken,
    identity: null,
    accounts: [],
    permissions: [],
    target_page_found: false,
    target_page_info: null,
    target_page_has_ig: false,
    matched_ig_account: null,
    saved_to_db: false,
    saved_user_token_only: false,
    errors: [],
  }

  // 1. GET /me?fields=id,name,email
  try {
    const meRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/me?fields=id,name,email&access_token=' +
        encodeURIComponent(token),
      method: 'GET',
      timeout: 15,
    })

    if (meRes.statusCode >= 200 && meRes.statusCode < 300 && meRes.json) {
      results.identity = meRes.json
      console.log(
        '[TOKEN_DIAG] [1/3] Identidade do token /me: ID=' +
          meRes.json.id +
          ' | Nome="' +
          meRes.json.name +
          '" | Email=' +
          (meRes.json.email || 'não retornado/sem permissão'),
      )
    } else {
      console.log(
        '[TOKEN_DIAG] [1/3] Erro em /me: HTTP ' +
          meRes.statusCode +
          ' | Resp: ' +
          JSON.stringify(meRes.json || meRes.raw),
      )
      results.errors.push({ step: 'me', status: meRes.statusCode, data: meRes.json || meRes.raw })
    }
  } catch (errMe) {
    console.log('[TOKEN_DIAG] [1/3] Exceção em /me: ' + String(errMe))
    results.errors.push({ step: 'me', error: String(errMe) })
  }

  // 2. GET /me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100
  let targetPageToken = ''
  let targetIgAccount = null

  try {
    const accountsRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100&access_token=' +
        encodeURIComponent(token),
      method: 'GET',
      timeout: 20,
    })

    if (
      accountsRes.statusCode >= 200 &&
      accountsRes.statusCode < 300 &&
      accountsRes.json &&
      Array.isArray(accountsRes.json.data)
    ) {
      const pages = accountsRes.json.data
      console.log(
        '[TOKEN_DIAG] [2/3] Total de páginas encontradas em /me/accounts: ' + pages.length,
      )

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const pId = String(page.id || '').trim()
        const pName = String(page.name || '').trim()
        const pToken = page.access_token || ''
        const pTokenMasked = pToken ? '...' + pToken.slice(-4) : 'nenhum'
        let igAcc = page.instagram_business_account || null

        // Se a expansão não retornou igAcc, tenta consulta direta da página com o page token ou user token
        if (!igAcc && pId) {
          try {
            const directPgRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/' +
                encodeURIComponent(pId) +
                '?fields=instagram_business_account{id,username,name}&access_token=' +
                encodeURIComponent(pToken || token),
              method: 'GET',
              timeout: 10,
            })
            if (
              directPgRes.statusCode >= 200 &&
              directPgRes.statusCode < 300 &&
              directPgRes.json &&
              directPgRes.json.instagram_business_account
            ) {
              igAcc = directPgRes.json.instagram_business_account
            }
          } catch (_) {}
        }

        const igId = igAcc && igAcc.id ? String(igAcc.id).trim() : null
        const igUser =
          igAcc && (igAcc.username || igAcc.name)
            ? String(igAcc.username || igAcc.name).trim()
            : null

        const isTarget = pId === '1343797128806374'

        console.log(
          '[TOKEN_DIAG]   -> Página [' +
            i +
            ']: ID=' +
            pId +
            ' | Nome="' +
            pName +
            '" | PageToken=' +
            pTokenMasked +
            ' | IG_ID=' +
            (igId || 'NENHUM') +
            ' | IG_User=' +
            (igUser ? '@' + igUser : 'NENHUM') +
            (isTarget ? ' <<< [ALVO: 1343797128806374]' : ''),
        )

        results.accounts.push({
          page_id: pId,
          page_name: pName,
          has_token: !!pToken,
          token_suffix: pTokenMasked,
          ig_account_id: igId,
          ig_username: igUser,
          is_target_page: isTarget,
        })

        if (isTarget) {
          results.target_page_found = true
          results.target_page_info = {
            id: pId,
            name: pName,
            token_suffix: pTokenMasked,
          }
          targetPageToken = pToken
          if (igAcc) {
            results.target_page_has_ig = true
            results.matched_ig_account = igAcc
            targetIgAccount = igAcc
          }
        }
      }
    } else {
      console.log(
        '[TOKEN_DIAG] [2/3] Erro em /me/accounts: HTTP ' +
          accountsRes.statusCode +
          ' | Resp: ' +
          JSON.stringify(accountsRes.json || accountsRes.raw),
      )
      results.errors.push({
        step: 'accounts',
        status: accountsRes.statusCode,
        data: accountsRes.json || accountsRes.raw,
      })
    }
  } catch (errAcc) {
    console.log('[TOKEN_DIAG] [2/3] Exceção em /me/accounts: ' + String(errAcc))
    results.errors.push({ step: 'accounts', error: String(errAcc) })
  }

  // Se a página alvo 1343797128806374 não apareceu em /me/accounts, tenta consultá-la diretamente:
  if (!results.target_page_found) {
    console.log(
      '[TOKEN_DIAG] [2.5] Página 1343797128806374 não veio na lista de /me/accounts. Tentando consulta direta GET /1343797128806374...',
    )
    try {
      const directTargetRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 10,
      })
      if (
        directTargetRes.statusCode >= 200 &&
        directTargetRes.statusCode < 300 &&
        directTargetRes.json
      ) {
        const dtData = directTargetRes.json
        console.log(
          '[TOKEN_DIAG] [2.5] Consulta direta à página 1343797128806374 SUCESSO: Nome="' +
            dtData.name +
            '" | IG=' +
            JSON.stringify(dtData.instagram_business_account || null),
        )
        results.target_page_found = true
        results.target_page_info = {
          id: dtData.id,
          name: dtData.name,
          token_suffix: dtData.access_token ? '...' + dtData.access_token.slice(-4) : 'nenhum',
        }
        if (dtData.access_token) targetPageToken = dtData.access_token
        if (dtData.instagram_business_account) {
          results.target_page_has_ig = true
          results.matched_ig_account = dtData.instagram_business_account
          targetIgAccount = dtData.instagram_business_account
        }
      } else {
        console.log(
          '[TOKEN_DIAG] [2.5] Consulta direta falhou: HTTP ' +
            directTargetRes.statusCode +
            ' | ' +
            JSON.stringify(directTargetRes.json || directTargetRes.raw),
        )
      }
    } catch (eDt) {
      console.log('[TOKEN_DIAG] [2.5] Consulta direta erro: ' + String(eDt))
    }
  }

  // 3. GET /me/permissions
  try {
    const permRes = $http.send({
      url:
        'https://graph.facebook.com/v22.0/me/permissions?access_token=' + encodeURIComponent(token),
      method: 'GET',
      timeout: 15,
    })

    if (
      permRes.statusCode >= 200 &&
      permRes.statusCode < 300 &&
      permRes.json &&
      Array.isArray(permRes.json.data)
    ) {
      const perms = permRes.json.data
      const granted = []
      const declined = []
      for (let p = 0; p < perms.length; p++) {
        if (perms[p].status === 'granted') {
          granted.push(perms[p].permission)
        } else {
          declined.push(perms[p].permission + '(' + perms[p].status + ')')
        }
      }
      results.permissions = { granted: granted, declined: declined }
      console.log(
        '[TOKEN_DIAG] [3/3] Permissões Concedidas (' + granted.length + '): ' + granted.join(', '),
      )
      if (declined.length > 0) {
        console.log(
          '[TOKEN_DIAG] [3/3] Permissões Negadas/Pendentes (' +
            declined.length +
            '): ' +
            declined.join(', '),
        )
      }
    } else {
      console.log(
        '[TOKEN_DIAG] [3/3] Erro em /me/permissions: HTTP ' +
          permRes.statusCode +
          ' | Resp: ' +
          JSON.stringify(permRes.json || permRes.raw),
      )
      results.errors.push({
        step: 'permissions',
        status: permRes.statusCode,
        data: permRes.json || permRes.raw,
      })
    }
  } catch (errPerm) {
    console.log('[TOKEN_DIAG] [3/3] Exceção em /me/permissions: ' + String(errPerm))
    results.errors.push({ step: 'permissions', error: String(errPerm) })
  }

  // Atualização no banco de dados conforme regra da tarefa:
  // "Se o token for válido e enxergar a página 1343797128806374 com instagram_business_account (username @mauro.brfimoveis):
  //  Atualize o registro do usuário dono do CRM na collection users salvando:
  //  meta_instagram_user_token = esse token, meta_instagram_business_id = o id do IG,
  //  instagram_username = "mauro.brfimoveis", meta_page_access_token = o page token da página 1343797128806374.
  //  Se a página NÃO tiver IG vinculado ainda, apenas diagnostique (não salve nada além do user token) e reporte o que falta."
  try {
    const userRecords = $app.findRecordsByFilter('users', 'id != ""', '-created', 1, 0)
    if (userRecords && userRecords.length > 0) {
      const crmUser = userRecords[0]
      const crmUserId = crmUser.id

      if (results.target_page_found && results.target_page_has_ig && targetIgAccount) {
        const foundIgId = String(targetIgAccount.id || '').trim()
        const foundIgUser = String(
          targetIgAccount.username || targetIgAccount.name || 'mauro.brfimoveis',
        ).trim()

        crmUser.set('meta_instagram_user_token', token)
        crmUser.set('meta_instagram_business_id', foundIgId)
        crmUser.set('instagram_username', foundIgUser || 'mauro.brfimoveis')
        if (targetPageToken) {
          crmUser.set('meta_page_access_token', targetPageToken)
          crmUser.set('meta_instagram_page_token', targetPageToken)
        }
        $app.saveNoValidate(crmUser)
        results.saved_to_db = true
        console.log('[TOKEN_DIAG] [BANCO] Usuário ' + crmUserId + ' ATUALIZADO COM SUCESSO!')
        console.log('[TOKEN_DIAG] [BANCO] -> meta_instagram_user_token salvo (' + maskedToken + ')')
        console.log('[TOKEN_DIAG] [BANCO] -> meta_instagram_business_id=' + foundIgId)
        console.log('[TOKEN_DIAG] [BANCO] -> instagram_username=' + foundIgUser)
        console.log(
          '[TOKEN_DIAG] [BANCO] -> meta_page_access_token=' +
            (targetPageToken ? '...' + targetPageToken.slice(-4) : 'nenhum'),
        )
      } else {
        // Se a página NÃO tiver IG vinculado ainda, salva apenas o user token
        crmUser.set('meta_instagram_user_token', token)
        $app.saveNoValidate(crmUser)
        console.log(
          '[TOKEN_DIAG] [BANCO] Página alvo sem IG vinculado ainda ou não localizada com IG. Salvo apenas meta_instagram_user_token no usuário ' +
            crmUserId +
            '.',
        )
        results.saved_user_token_only = true
      }
    } else {
      console.log('[TOKEN_DIAG] [BANCO] Nenhum registro de usuário encontrado na collection users.')
    }
  } catch (errDb) {
    console.log('[TOKEN_DIAG] [BANCO] Erro ao salvar dados no banco: ' + String(errDb))
    results.errors.push({ step: 'database', error: String(errDb) })
  }

  console.log('[TOKEN_DIAG] ==========================================')
  console.log('[TOKEN_DIAG] DIAGNÓSTICO CONCLUÍDO')
  console.log('[TOKEN_DIAG] ==========================================')

  return e.json(200, results)
})

// Execução no boot (código executado na carga do script pelo PocketBase)
try {
  const token =
    'EAANEkx5ozUABSiz8wLru6ZAPgO54ZAQc2k0uBUS24JRqsRr2cTtZAchRMCcfoJqQpXoZCaFW5eJTkpRinyeC92Hn4OMkCbUxhIUa5QINtt3LWoXK6jDXI1uVTLyhGvZC2dQJliyUEJtRTCpRNJmgFg8nZBb6FBTF8lnZB2mikWISAcJ8cySzhTVSdGZBY8srdAZDZD'
  const maskedToken = '...' + token.slice(-4)

  console.log('[TOKEN_DIAG] [BOOT] Executando diagnóstico do token ' + maskedToken + ' no boot...')

  // 1. /me
  const meRes = $http.send({
    url:
      'https://graph.facebook.com/v22.0/me?fields=id,name,email&access_token=' +
      encodeURIComponent(token),
    method: 'GET',
    timeout: 15,
  })
  if (meRes.statusCode >= 200 && meRes.statusCode < 300 && meRes.json) {
    console.log(
      '[TOKEN_DIAG] [BOOT] [1/3] Identidade /me: ID=' +
        meRes.json.id +
        ' | Nome="' +
        meRes.json.name +
        '" | Email=' +
        (meRes.json.email || 'n/a'),
    )
  } else {
    console.log(
      '[TOKEN_DIAG] [BOOT] [1/3] Erro /me: HTTP ' +
        meRes.statusCode +
        ' | ' +
        JSON.stringify(meRes.json || meRes.raw),
    )
  }

  // 2. /me/accounts
  let targetPageToken = ''
  let targetIgAccount = null
  let targetPageFound = false

  const accountsRes = $http.send({
    url:
      'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100&access_token=' +
      encodeURIComponent(token),
    method: 'GET',
    timeout: 20,
  })

  if (
    accountsRes.statusCode >= 200 &&
    accountsRes.statusCode < 300 &&
    accountsRes.json &&
    Array.isArray(accountsRes.json.data)
  ) {
    const pages = accountsRes.json.data
    console.log('[TOKEN_DIAG] [BOOT] [2/3] Total páginas em /me/accounts: ' + pages.length)
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i]
      const pId = String(p.id || '').trim()
      const pName = String(p.name || '').trim()
      const pTok = p.access_token || ''
      const pTokMasked = pTok ? '...' + pTok.slice(-4) : 'nenhum'
      let igAcc = p.instagram_business_account || null

      if (!igAcc && pId) {
        try {
          const directRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              encodeURIComponent(pId) +
              '?fields=instagram_business_account{id,username,name}&access_token=' +
              encodeURIComponent(pTok || token),
            method: 'GET',
            timeout: 10,
          })
          if (
            directRes.statusCode === 200 &&
            directRes.json &&
            directRes.json.instagram_business_account
          ) {
            igAcc = directRes.json.instagram_business_account
          }
        } catch (_) {}
      }

      const igId = igAcc && igAcc.id ? String(igAcc.id).trim() : null
      const igUser =
        igAcc && (igAcc.username || igAcc.name) ? String(igAcc.username || igAcc.name).trim() : null
      const isTarget = pId === '1343797128806374'

      console.log(
        '[TOKEN_DIAG] [BOOT]   -> Página [' +
          i +
          ']: ID=' +
          pId +
          ' | Nome="' +
          pName +
          '" | PageToken=' +
          pTokMasked +
          ' | IG_ID=' +
          (igId || 'NENHUM') +
          ' | IG_User=' +
          (igUser ? '@' + igUser : 'NENHUM') +
          (isTarget ? ' <<< [ALVO: 1343797128806374]' : ''),
      )

      if (isTarget) {
        targetPageFound = true
        targetPageToken = pTok
        if (igAcc) {
          targetIgAccount = igAcc
        }
      }
    }
  } else {
    console.log(
      '[TOKEN_DIAG] [BOOT] [2/3] Erro /me/accounts: HTTP ' +
        accountsRes.statusCode +
        ' | ' +
        JSON.stringify(accountsRes.json || accountsRes.raw),
    )
  }

  // Se a página alvo não veio no accounts, tenta diretamente:
  if (!targetPageFound) {
    try {
      const directTargetRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/1343797128806374?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=' +
          encodeURIComponent(token),
        method: 'GET',
        timeout: 10,
      })
      if (
        directTargetRes.statusCode >= 200 &&
        directTargetRes.statusCode < 300 &&
        directTargetRes.json
      ) {
        const dtData = directTargetRes.json
        console.log(
          '[TOKEN_DIAG] [BOOT] [2.5] Consulta direta página 1343797128806374: Nome="' +
            dtData.name +
            '" | IG=' +
            JSON.stringify(dtData.instagram_business_account || null),
        )
        targetPageFound = true
        if (dtData.access_token) targetPageToken = dtData.access_token
        if (dtData.instagram_business_account) targetIgAccount = dtData.instagram_business_account
      } else {
        console.log(
          '[TOKEN_DIAG] [BOOT] [2.5] Consulta direta falhou: HTTP ' +
            directTargetRes.statusCode +
            ' | ' +
            JSON.stringify(directTargetRes.json || directTargetRes.raw),
        )
      }
    } catch (eDt) {
      console.log('[TOKEN_DIAG] [BOOT] [2.5] Erro consulta direta: ' + String(eDt))
    }
  }

  // 3. /me/permissions
  const permRes = $http.send({
    url:
      'https://graph.facebook.com/v22.0/me/permissions?access_token=' + encodeURIComponent(token),
    method: 'GET',
    timeout: 15,
  })
  if (
    permRes.statusCode >= 200 &&
    permRes.statusCode < 300 &&
    permRes.json &&
    Array.isArray(permRes.json.data)
  ) {
    const granted = []
    const declined = []
    for (let p = 0; p < permRes.json.data.length; p++) {
      if (permRes.json.data[p].status === 'granted') {
        granted.push(permRes.json.data[p].permission)
      } else {
        declined.push(permRes.json.data[p].permission)
      }
    }
    console.log(
      '[TOKEN_DIAG] [BOOT] [3/3] Permissões Concedidas (' +
        granted.length +
        '): ' +
        granted.join(', '),
    )
    if (declined.length > 0) {
      console.log(
        '[TOKEN_DIAG] [BOOT] [3/3] Permissões Negadas/Pendentes (' +
          declined.length +
          '): ' +
          declined.join(', '),
      )
    }
  } else {
    console.log(
      '[TOKEN_DIAG] [BOOT] [3/3] Erro /me/permissions: HTTP ' +
        permRes.statusCode +
        ' | ' +
        JSON.stringify(permRes.json || permRes.raw),
    )
  }

  // Atualização no banco
  const userRecords = $app.findRecordsByFilter('users', 'id != ""', '-created', 1, 0)
  if (userRecords && userRecords.length > 0) {
    const crmUser = userRecords[0]
    const crmUserId = crmUser.id

    if (targetPageFound && targetIgAccount) {
      const foundIgId = String(targetIgAccount.id || '').trim()
      const foundIgUser = String(
        targetIgAccount.username || targetIgAccount.name || 'mauro.brfimoveis',
      ).trim()
      crmUser.set('meta_instagram_user_token', token)
      crmUser.set('meta_instagram_business_id', foundIgId)
      crmUser.set('instagram_username', foundIgUser || 'mauro.brfimoveis')
      if (targetPageToken) {
        crmUser.set('meta_page_access_token', targetPageToken)
        crmUser.set('meta_instagram_page_token', targetPageToken)
      }
      $app.saveNoValidate(crmUser)
      console.log(
        '[TOKEN_DIAG] [BOOT] [BANCO] Usuário ' +
          crmUserId +
          ' ATUALIZADO COM SUCESSO! IG=' +
          foundIgId +
          ' (@' +
          foundIgUser +
          ')',
      )
    } else {
      crmUser.set('meta_instagram_user_token', token)
      $app.saveNoValidate(crmUser)
      console.log(
        '[TOKEN_DIAG] [BOOT] [BANCO] Salvo apenas meta_instagram_user_token no usuário ' +
          crmUserId +
          '.',
      )
    }
  }
} catch (bootErr) {
  console.log('[TOKEN_DIAG] [BOOT] Erro na execução de boot: ' + String(bootErr))
}
