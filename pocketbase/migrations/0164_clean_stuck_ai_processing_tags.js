migrate(
  (app) => {
    let customers = []
    try {
      customers = app.findRecordsByFilter('customers', '1=1', '-created', 5000, 0)
    } catch (err) {
      console.log('Error fetching customers in migration 0164:', err)
    }

    for (const customer of customers) {
      let rawTags = customer.get('tags')
      let tags = []

      if (Array.isArray(rawTags)) {
        // Filter out any numbers, byte char codes, "ai_processing", and "ai_processing:*"
        tags = rawTags.filter((t) => {
          if (typeof t !== 'string') return false
          if (t === 'ai_processing' || t.startsWith('ai_processing:')) return false
          return true
        })
      } else if (typeof rawTags === 'string') {
        try {
          const parsed = JSON.parse(rawTags)
          if (Array.isArray(parsed)) {
            tags = parsed.filter((t) => {
              if (typeof t !== 'string') return false
              if (t === 'ai_processing' || t.startsWith('ai_processing:')) return false
              return true
            })
          }
        } catch (_) {
          tags = []
        }
      }

      customer.set('tags', tags)
      try {
        app.saveNoValidate(customer)
      } catch (saveErr) {
        console.log('Failed to clean customer tags for id ' + customer.id + ':', saveErr)
      }
    }
  },
  (app) => {
    // Revert is a no-op since cleaning invalid/stuck lock tags doesn't destroy user data
  },
)
