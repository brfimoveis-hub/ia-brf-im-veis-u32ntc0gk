routerAdd(
  'POST',
  '/backend/v1/bia/preset',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const user = $app.findRecordById('users', userId)

    const rawName = (body.ai_name || '').trim()
    const currentName = user.getString('ai_name') || ''

    if (rawName) {
      if (rawName.toLowerCase() === 'bia jovem') {
        user.set('ai_name', 'Bia')
      } else {
        user.set('ai_name', rawName)
      }
    } else if (currentName.toLowerCase() === 'bia jovem' || !currentName) {
      user.set('ai_name', 'Bia')
    }

    if (body.bia_instructions) {
      user.set('bia_instructions', body.bia_instructions)
    }

    if (body.avatar_url) {
      try {
        const file = $filesystem.fileFromURL(body.avatar_url, 15)
        user.set('ai_avatar', file)
      } catch (err) {
        $app.logger().error('Failed to download avatar', 'error', err.message)
      }
    }

    $app.save(user)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
