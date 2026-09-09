migrate(
  (app) => {
    try {
      const user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
      if (!user) return

      const clearDiagnosticMsg =
        'DIAGNÓSTICO AO VIVO META GRAPH API v21.0:\n' +
        '• Token Permanente: VÁLIDO e PERMANENTE (expires_at: 0 / nunca expira).\n' +
        '• Identidade: "BIA CRM" (ID: 122104253163464389) | App: "BRF Imóveis 2" (ID: 2442476629610638) | Tipo: SYSTEM_USER.\n' +
        '• Permissões Concedidas no Token Gerado (5): whatsapp_business_management, whatsapp_business_messaging, manage_app_solution, whatsapp_business_manage_events, public_profile.\n' +
        '• Permissões de Anúncio Ausentes no Token (3): ads_management, ads_read, business_management.\n' +
        '• Atribuição de Ativos: A conta de anúncios 55194159 e o dataset/pixel 1093869151209421 foram atribuídos ao app BRF Imóveis 2 com sucesso.\n' +
        '• Teste ao Vivo Meta CAPI: O acesso ao dataset (GET /1093869151209421) e o envio de evento de teste (POST /events) retornaram HTTP 400 da Meta ("Object does not exist, cannot be loaded due to missing permissions") porque o token gerado ainda não contém os escopos ads_management / ads_read.\n\n' +
        'COMO CONCLUIR NO META BUSINESS SUITE (Última Etapa):\n' +
        '1. Acesse o Meta Business Suite (BRF Imóveis 1) > Configurações do Negócio > Usuários do Sistema.\n' +
        '2. Selecione "BIA CRM" e clique no botão "Gerar novo token".\n' +
        '3. Selecione o App "BRF Imóveis 2" (ID 2442476629610638).\n' +
        '4. Na lista de permissões, marque OBRIGATORIAMENTE:\n' +
        '   - [x] ads_management\n' +
        '   - [x] ads_read\n' +
        '   - [x] business_management\n' +
        '   (mantenha também marcadas as permissões de WhatsApp existentes).\n' +
        '5. Clique em Gerar Token, copie e cole aqui no CRM no campo "Token de Acesso" para ativação automática!'

      user.set('meta_capi_status', 'error')
      user.set('meta_capi_error', clearDiagnosticMsg)
      app.saveNoValidate(user)

      const logCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logCol)
      log.set('user_id', user.id)
      log.set('type', 'api_integration')
      log.set(
        'message',
        'Diagnóstico CAPI Atualizado: Atribuição de ativos confirmada, pendente seleção de escopos ads_management/ads_read na geração do token',
      )
      log.set(
        'details',
        JSON.stringify({
          token_valid: true,
          expires_at: 0,
          app_id: '2442476629610638',
          user_id: '122104253163464389',
          user_name: 'BIA CRM',
          granted_permissions: [
            'whatsapp_business_management',
            'whatsapp_business_messaging',
            'manage_app_solution',
            'whatsapp_business_manage_events',
            'public_profile',
          ],
          missing_permissions: ['ads_management', 'ads_read', 'business_management'],
          assigned_assets: {
            ad_account: '55194159',
            dataset_id: '1093869151209421',
            app_id: '2442476629610638',
          },
          events_received: 0,
          meta_api_response:
            "Unsupported post request. Object with ID '1093869151209421' does not exist, cannot be loaded due to missing permissions",
        }),
      )
      log.set(
        'payload',
        JSON.stringify({
          action: 'meta_capi_live_diagnostic_completed',
          pixel_id: '1093869151209421',
        }),
      )
      app.saveNoValidate(log)
    } catch (_) {}
  },
  (app) => {},
)
