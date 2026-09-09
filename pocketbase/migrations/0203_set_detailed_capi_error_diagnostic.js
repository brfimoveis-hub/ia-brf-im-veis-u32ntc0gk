migrate(
  (app) => {
    try {
      const user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
      if (!user) return

      const detailedMsg =
        'DIAGNÓSTICO AO VIVO META GRAPH API v21.0:\n' +
        '• Token Permanente: Válido (is_valid: true, expiração: ilimitada/nunca expira).\n' +
        '• Usuário do Sistema: "BIA CRM" (ID: 122104253163464389).\n' +
        '• Permissões Concedidas no Token Atual (5): whatsapp_business_management, whatsapp_business_messaging, manage_app_solution, whatsapp_business_manage_events, public_profile.\n' +
        '• Permissões de Anúncio AUSENTES (3): ads_management, ads_read, business_management.\n' +
        '• Teste do Dataset 1093869151209421 (GET): HTTP 400 - "(#100) Missing Permission".\n' +
        '• Teste de Envio CAPI /events (POST): HTTP 400 - "Unsupported post request. Object with ID \'1093869151209421\' does not exist, cannot be loaded due to missing permissions".\n\n' +
        'COMO CORRIGIR NO META BUSINESS SUITE:\n' +
        '1. Acesse o Meta Business Manager ("BRF Imóveis 1" - ID 1676016233499097) > Configurações do Negócio > Usuários > Usuários do Sistema.\n' +
        '2. Selecione o usuário "BIA CRM" e clique no botão "Gerar novo token".\n' +
        '3. Selecione o App "BRF Imóveis 2" (ID 2442476629610638).\n' +
        '4. Na caixa de busca de permissões do modal, selecione e MARQUE obrigatoriamente:\n' +
        '   - [x] ads_management\n' +
        '   - [x] ads_read\n' +
        '   - [x] business_management\n' +
        '   (mantenha também marcadas as permissões de WhatsApp).\n' +
        '5. Gere o novo token permanente e cole aqui no CRM para ativação imediata.'

      user.set('meta_capi_status', 'error')
      user.set('meta_capi_error', detailedMsg)
      app.saveNoValidate(user)

      const logCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logCol)
      log.set('user_id', user.id)
      log.set('type', 'api_integration')
      log.set('message', 'Diagnóstico Detalhado CAPI: Permissões Ausentes vs Concedidas')
      log.set(
        'details',
        JSON.stringify({
          granted: [
            'whatsapp_business_management',
            'whatsapp_business_messaging',
            'manage_app_solution',
            'whatsapp_business_manage_events',
            'public_profile',
          ],
          missing: ['ads_management', 'ads_read', 'business_management'],
          dataset_get_code: 400,
          dataset_get_error: '(#100) Missing Permission',
          events_post_code: 400,
          events_post_error: 'Unsupported post request / missing permissions',
          system_user_id: '122104253163464389',
          system_user_name: 'BIA CRM',
        }),
      )
      log.set('payload', JSON.stringify({ action: 'detailed_capi_diagnosis' }))
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {},
)
