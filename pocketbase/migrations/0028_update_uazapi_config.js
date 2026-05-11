migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')

      user.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      user.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      user.set('meta_campaign_phone', '554892098050')
      user.set('uazapi_instance_number', '554892098050')

      user.set('ai_name', 'IA Mãe')
      const instructions = `Ecosistema IA Mãe.
Foco: Mercado Imobiliário de SC.
Projeto Estratégico: Villa dos Açores
Unidade: LM311
Área: 70.78m²
Preço: R$ 4.930,77/m²
Nicho: Financiamento para trabalhadores autônomos.

Diretrizes: Identifique-se como IA Mãe. Aja com total autonomia no mercado de Santa Catarina.`
      user.set('ai_instructions', instructions)

      app.save(user)
    } catch (_) {
      // Safe check for development environments where the default seed might be different
    }
  },
  (app) => {},
)
