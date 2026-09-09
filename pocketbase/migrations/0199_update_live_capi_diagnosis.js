migrate(
  (app) => {
    try {
      const user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
      if (!user) return

      const diagnosticMessage =
        'DIAGNÓSTICO AO VIVO META CAPI: O token pertence ao Usuário de Sistema "BIA CRM" (ID 122104253163464389) do App "BRF Imóveis 2" (ID 2442476629610638). ' +
        'O token é permanente e válido, porém possui escopo exclusivo de WhatsApp (whatsapp_business_management, whatsapp_business_messaging, public_profile). ' +
        'ANÁLISE DE BUSINESS MANAGERS: Existem 2 BMs na Meta: o BM "BRF Imóveis 1" (ID 1676016233499097) e a WABA "BRFImóveis" (ID 3542548689255402). ' +
        'CAUSA DO BLOQUEIO: O Dataset 1093869151209421 e as Contas de Anúncio exigem permissões de anúncios (ads_management, ads_read, business_management). ' +
        'Embora os ativos tenham sido atribuídos na interface, ao clicar em "Gerar novo token" na Meta, as permissões ads_management e business_management NÃO foram marcadas na lista de escopos do modal de geração do token. ' +
        'AÇÃO CONCRETA NECESSÁRIA: No Meta Business Manager ("BRF Imóveis 1" - 1676016233499097) > Configurações do Negócio > Usuários do Sistema > selecione "BIA CRM" > clique em "Gerar novo token" > selecione o app "BRF Imóveis 2" > MARQUE OBRIGATORIAMENTE os checkboxes: [x] ads_management, [x] ads_read, [x] business_management (além de whatsapp_business_management) > gere e salve o token no CRM.'

      user.set('meta_capi_status', 'error')
      user.set('meta_capi_error', diagnosticMessage)
      app.saveNoValidate(user)

      const logCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logCol)
      logRec.set('user_id', user.id)
      logRec.set('type', 'api_integration')
      logRec.set('message', 'Auditoria Diagnóstico CAPI: Análise Completa de Permissões e BMs Meta')
      logRec.set(
        'details',
        JSON.stringify({
          system_user: {
            id: '122104253163464389',
            name: 'BIA CRM',
            app_id: '2442476629610638',
            app_name: 'BRF Imóveis 2',
          },
          token_info: {
            is_valid: true,
            expires_at: 0,
            type: 'SYSTEM_USER',
            scopes: [
              'whatsapp_business_management',
              'whatsapp_business_messaging',
              'public_profile',
            ],
            granular_scopes: [
              { scope: 'whatsapp_business_management' },
              { scope: 'whatsapp_business_messaging' },
            ],
          },
          business_managers_discovered: [
            {
              id: '1676016233499097',
              name: 'BRF Imóveis 1',
              status_code_basic: 200,
              requires_business_management: true,
            },
            {
              id: '3542548689255402',
              name: 'BRFImóveis',
              type: 'WABA',
              owner_business: { id: '1676016233499097', name: 'BRF Imóveis 1' },
              currency: 'BRL',
            },
          ],
          dataset_analysis: {
            id: '1093869151209421',
            status_code: 400,
            error: '(#100) Missing Permission',
            post_events_status_code: 400,
            post_events_error: '(#100) Object does not exist or missing permissions',
          },
          diagnosis_summary: {
            root_cause:
              'Token gerado sem os escopos ads_management, ads_read e business_management marcados no modal de geração de token do Meta Business Suite.',
            recommended_action:
              'No Gerenciador de Negócios BM 1676016233499097, em Usuários do Sistema > BIA CRM, gerar novo token selecionando app BRF Imóveis 2 e marcando ads_management, ads_read e business_management.',
          },
        }),
      )
      logRec.set(
        'payload',
        JSON.stringify({
          action: 'live_meta_capi_comprehensive_audit',
          bm_id: '1676016233499097',
          waba_id: '3542548689255402',
          dataset_id: '1093869151209421',
        }),
      )
      app.saveNoValidate(logRec)
    } catch (_) {}
  },
  (app) => {},
)
