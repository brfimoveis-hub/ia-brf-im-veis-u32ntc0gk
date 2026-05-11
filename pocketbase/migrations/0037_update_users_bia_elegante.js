migrate(
  (app) => {
    const users = app.findRecordsByFilter('_pb_users_auth_', '1=1', '', 1000, 0)
    for (const user of users) {
      let changed = false

      const currentVoice = user.getString('ai_voice_id')
      if (!currentVoice || currentVoice.includes('_v1') || currentVoice.includes('ia_mae_expert')) {
        user.set('ai_voice_id', 'voice_harmonious_female_1')
        changed = true
      }

      const currentName = user.getString('ai_name')
      if (!currentName || currentName === 'IA Mãe Expert') {
        user.set('ai_name', 'BIA Elegante')
        user.set(
          'ai_instructions',
          'Você é a BIA Elegante, uma assistente virtual sofisticada e amigável. Seu tom é acolhedor, profissional e moderno. Especializada em atendimento premium.',
        )
        changed = true
      }

      if (changed) {
        app.saveNoValidate(user)
      }
    }
  },
  (app) => {
    // no rollback needed
  },
)
