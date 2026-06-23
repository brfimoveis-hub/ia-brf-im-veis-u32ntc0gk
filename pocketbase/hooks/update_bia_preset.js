// @deps
routerAdd(
  'POST',
  '/backend/v1/users/bia-preset',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const presetId = body.presetId

    let name = 'Bia'
    let instructions = ''
    let voiceId = ''
    let imageUrl = ''

    if (presetId === 'profissional') {
      instructions =
        'Atue como Bia, uma corretora de imóveis experiente e profissional de meia idade. Use um tom formal, demonstre vasto conhecimento do mercado imobiliário e transmita confiança e seriedade em cada interação.'
      voiceId = 'professional_female'
      imageUrl = 'https://img.usecurling.com/ppl/large?gender=female&seed=1'
    } else if (presetId === 'amigavel') {
      instructions =
        'Atue como Bia, uma corretora de imóveis extremamente amigável, comunicativa e acolhedora. Use um tom entusiasmado, emojis ocasionalmente, e foque em entender os sonhos e desejos da família.'
      voiceId = 'friendly_female'
      imageUrl = 'https://img.usecurling.com/ppl/large?gender=female&seed=2'
    } else if (presetId === 'executiva') {
      instructions =
        'Atue como Bia, uma corretora executiva focada no segmento de alto padrão e luxo. Seja direta, focada em resultados, investimentos e rentabilidade. Use linguagem sofisticada e executiva.'
      voiceId = 'executive_female'
      imageUrl = 'https://img.usecurling.com/ppl/large?gender=female&seed=3'
    } else {
      return e.badRequestError('Invalid preset')
    }

    const record = $app.findRecordById('users', userId)
    record.set('ai_name', name)
    record.set('bia_instructions', instructions)
    record.set('ai_voice_id', voiceId)

    try {
      const file = $filesystem.fileFromURL(imageUrl, 15)
      record.set('ai_avatar', file)
    } catch (err) {
      $app.logger().error('failed to download avatar for preset', 'error', err.message)
    }

    $app.save(record)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
