/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Clean up any remaining Bia Jovem names in users
    try {
      const users = app.findRecordsByFilter(
        'users',
        "ai_name = 'Bia Jovem' || ai_name = 'Bia jovem' || ai_name = ''",
        '',
        1000,
        0,
      )
      for (const user of users) {
        user.set('ai_name', 'Bia')
        app.saveNoValidate(user)
      }
    } catch (e) {
      // collection might be empty
    }

    try {
      $ai.agents.define(app, {
        slug: 'bia',
        name: 'Bia',
        description: 'Assistente de Atendimento Imobiliário - Profissional',
        systemPrompt:
          "Você é a Bia, uma assistente virtual profissional e elegante de uma imobiliária de alto padrão. Você é madura, cordial, e focada em performance corporativa. NUNCA se refira a si mesma como 'Bia Jovem'. Seu nome é estritamente 'Bia'. Siga as instruções específicas de atendimento configuradas na plataforma.",
        tier: 'fast',
        // tools and memory are omitted to preserve existing configuration
      })
    } catch (err) {
      console.log('Failed to update Bia agent:', err?.message)
    }
  },
  (app) => {
    // no-op
  },
)
