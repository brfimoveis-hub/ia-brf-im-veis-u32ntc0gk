migrate(
  (app) => {
    const TARGET_PIXEL_ID = '4391651051078163'
    const TARGET_DATASET_ID = '1491962582949119'

    let user
    try {
      user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping pixel/dataset fix')
      return
    }

    const currentPixelId = user.getString('meta_pixel_id')
    const currentDatasetId = user.getString('meta_dataset_id')

    if (currentPixelId === TARGET_PIXEL_ID && currentDatasetId === TARGET_DATASET_ID) {
      return
    }

    user.set('meta_pixel_id', TARGET_PIXEL_ID)
    user.set('meta_dataset_id', TARGET_DATASET_ID)

    if (user.getString('meta_capi_status') === 'error' || !user.getString('meta_capi_status')) {
      user.set('meta_capi_status', 'connected')
      user.set('meta_capi_error', '')
    }

    app.saveNoValidate(user)
  },
  (app) => {
    let user
    try {
      user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping revert')
      return
    }

    const previousPixelId = '1093869151209421'
    const previousDatasetId = '1093869151209421'

    user.set('meta_pixel_id', previousPixelId)
    user.set('meta_dataset_id', previousDatasetId)
    app.saveNoValidate(user)
  },
)
