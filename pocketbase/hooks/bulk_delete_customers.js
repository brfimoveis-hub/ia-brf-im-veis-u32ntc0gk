routerAdd(
  'POST',
  '/backend/v1/customers/bulk-delete',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Authentication required')
    }

    try {
      $app
        .db()
        .newQuery('DELETE FROM customers WHERE user_id = {:userId}')
        .bind({ userId: userId })
        .execute()

      return e.noContent(204)
    } catch (err) {
      console.log('Bulk delete error:', err)
      return e.internalServerError('Failed to delete customers')
    }
  },
  $apis.requireAuth(),
)
