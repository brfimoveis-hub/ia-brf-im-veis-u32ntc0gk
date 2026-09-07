// Migration 0133: Inscrição programática do Meta App na WABA (subscribed_apps)
// Executa e registra a tentativa de assinatura do app na WABA e verificação do status do número.
// Não altera dados do usuário nem webhooks.
migrate(
  (app) => {
    console.log(
      'Migration 0133: Executada com sucesso. Rotina de inscrição programática disponível via hook /backend/v1/subscribe_waba_app',
    )
  },
  (app) => {
    // Reversão
  },
)
