migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      let changed = false

      if (!user.getString('ai_name')) {
        user.set('ai_name', 'Bia')
        changed = true
      }

      if (!user.getString('ai_instructions')) {
        user.set(
          'ai_instructions',
          'Você é a Bia, consultora inteligente de negócios. Seja prestativa, educada e direta ao ponto. Seu principal objetivo é qualificar o lead, entender suas necessidades e conduzi-lo para um agendamento ou fechamento com excelência.',
        )
        changed = true
      }

      if (!user.getString('ai_avatar')) {
        try {
          // Fetch a professional business consultant avatar
          const file = $filesystem.fileFromURL(
            'https://img.usecurling.com/ppl/large?gender=female&seed=15',
            15,
          )
          user.set('ai_avatar', file)
          changed = true
        } catch (e) {
          console.log('Failed to fetch avatar in migration', e)
        }
      }

      if (changed) {
        app.save(user)
      }
    } catch (_) {
      // User might not exist, skip gracefully
    }
  },
  (app) => {
    // Irreversible data patch
  },
)
