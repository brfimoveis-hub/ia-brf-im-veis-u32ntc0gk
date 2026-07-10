migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      const targetId = '1093869151209421'
      const legacyId = '950541937872426'

      const currentPixelId = user.getString('meta_pixel_id')
      const currentDatasetId = user.getString('meta_dataset_id')

      const hasLegacyId = currentPixelId === legacyId || currentDatasetId === legacyId

      if (hasLegacyId || currentPixelId !== targetId || currentDatasetId !== targetId) {
        user.set('meta_pixel_id', targetId)
        user.set('meta_dataset_id', targetId)
        app.save(user)
      }
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping user update')
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_pixel_id', '4391651051078163')
      user.set('meta_dataset_id', '1318084933157075')
      app.save(user)
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping revert')
    }
  },
)
