migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      const targetId = '1093869151209421'

      const currentPixelId = user.getString('meta_pixel_id')
      const currentDatasetId = user.getString('meta_dataset_id')
      const currentCapiStatus = user.getString('meta_capi_status')

      const needsUpdate =
        currentPixelId !== targetId ||
        currentDatasetId !== targetId ||
        currentCapiStatus === 'error'

      if (needsUpdate) {
        user.set('meta_pixel_id', targetId)
        user.set('meta_dataset_id', targetId)
        if (currentCapiStatus === 'error' || !currentCapiStatus) {
          user.set('meta_capi_status', 'connected')
          user.set('meta_capi_error', '')
        }
        app.save(user)
      }
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping pixel sync')
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_pixel_id', '950541937872426')
      user.set('meta_dataset_id', '950541937872426')
      app.save(user)
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping revert')
    }
  },
)
