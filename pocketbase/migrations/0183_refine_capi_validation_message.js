migrate(
  (app) => {
    try {
      const user = app.findFirstRecordByData('users', 'email', 'brfimoveis@gmail.com')
      user.set(
        'meta_capi_error',
        'Token permanente válido na Meta, porém faltam permissões de anúncio (ads_management, ads_read, business_management). Permissões atuais do token: whatsapp_business_management, whatsapp_business_messaging, public_profile. Objeto/Pixel 1093869151209421 não acessível com este escopo.',
      )
      user.set('meta_capi_status', 'error')
      app.saveNoValidate(user)

      const logCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logCol)
      log.set('user_id', user.id)
      log.set('type', 'api_integration')
      log.set(
        'message',
        'CAPI Token Validação: Token permanente válido (expires_at=0), mas com escopo exclusivo de WhatsApp Cloud API. Falta adicionar ads_management e business_management no Gerenciador de Negócios da Meta.',
      )
      log.set(
        'details',
        JSON.stringify({
          token_valid: true,
          expires_at: 0,
          token_type: 'permanent_system_user',
          granted_permissions: [
            'whatsapp_business_management',
            'whatsapp_business_messaging',
            'public_profile',
          ],
          missing_permissions: ['ads_management', 'ads_read', 'business_management'],
          pixel_id: '1093869151209421',
          meta_api_response:
            "Unsupported post request. Object with ID '1093869151209421' does not exist, cannot be loaded due to missing permissions, or does not support this operation.",
        }),
      )
      log.set('payload', JSON.stringify({ action: 'validate_capi_token' }))
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {},
)
