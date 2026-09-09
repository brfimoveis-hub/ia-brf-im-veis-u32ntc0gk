migrate(
  (app) => {
    try {
      const user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
      const fullError =
        'Token permanente válido na Meta (Usuário BIA CRM, app BRF Imóveis 2), porém faltam permissões de anúncio (ads_management, ads_read, business_management). Permissões concedidas no token atual: whatsapp_business_management, whatsapp_business_messaging, public_profile. Dataset 1093869151209421 inacessível sem ads_management. No Meta Business Suite, reatribua os ativos ao usuário BIA CRM com Controle Total e gere novo token.'
      user.set('meta_capi_error', fullError)
      user.set('meta_capi_status', 'error')
      app.saveNoValidate(user)

      const logCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logCol)
      logRec.set('user_id', user.id)
      logRec.set('type', 'api_integration')
      logRec.set('message', 'Diagnóstico Final Novo Token CAPI: Faltam permissões de anúncio')
      logRec.set(
        'details',
        JSON.stringify({
          token_valid: true,
          expires_at: 0,
          is_never_expiring: true,
          user_system_name: 'BIA CRM',
          user_system_id: '122104253163464389',
          granted_permissions: [
            'whatsapp_business_management',
            'whatsapp_business_messaging',
            'public_profile',
          ],
          missing_permissions: ['ads_management', 'ads_read', 'business_management'],
          dataset_id: '1093869151209421',
          dataset_get_error: '(#100) Missing Permission',
          status: 'error',
        }),
      )
      logRec.set('payload', JSON.stringify({ action: 'final_capi_token_diagnosis' }))
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)
