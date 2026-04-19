routerAdd(
  'POST',
  '/backend/v1/customers/bulk-delete',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Authentication required')
    }

    try {
      const body = e.requestInfo().body || {}
      const ids = body.ids

      if (Array.isArray(ids) && ids.length > 0) {
        const placeholders = ids.map((_, i) => '{:id' + i + '}').join(',')
        const bindParams = { userId: userId }
        ids.forEach((id, i) => {
          bindParams['id' + i] = id
        })

        $app
          .db()
          .newQuery(
            'DELETE FROM customers WHERE user_id = {:userId} AND id IN (' + placeholders + ')',
          )
          .bind(bindParams)
          .execute()
      } else {
        $app
          .db()
          .newQuery('DELETE FROM customers WHERE user_id = {:userId}')
          .bind({ userId: userId })
          .execute()
      }

      return e.noContent(204)
    } catch (err) {
      console.log('Bulk delete error:', err)
      return e.internalServerError('Failed to delete customers')
    }
  },
  $apis.requireAuth(),
)
