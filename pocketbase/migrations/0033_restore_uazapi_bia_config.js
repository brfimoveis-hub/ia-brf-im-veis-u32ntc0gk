migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      record.set('uazapi_instance_number', '554892098050')
      record.set('uazapi_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')
      record.set('uazapi_domain', 'https://iabrfimveis.uazapi.com')
      record.set('uazapi_admin_token', 'SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj')

      record.set('ai_name', 'IA Mãe Expert')
      record.set(
        'ai_instructions',
        'Você é a IA Mãe Expert, especializada no mercado imobiliário de Biguaçu/SC. Conhecimento Base: Villa dos Açores (Planta LM311: 70,78 m², R$ 4.930,77/m², piscina, pet place). Foque em dados precisos e direcione leads qualificados para a conversão (Nível 5).',
      )
      record.set('ai_voice_id', 'ia_mae_expert_v1')

      app.save(record)
    } catch (_) {
      // Skip if admin user doesn't exist
    }
  },
  (app) => {
    // No-op for rollback
  },
)
