migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_tags_list', [
        { name: 'BRF Imóveis', id: '3828467217409862' },
        { name: 'Brf Imóveis 1', id: '1682576043102557' },
        { name: 'BRF Imóveis campanhas', id: '2056225121883057' },
        { name: 'https://workflow-imobiliario-brf-d89ae.goskip.app/', id: '1203928434689586' },
        { name: 'brf móveis eireli me', id: '932665675974614' },
        { name: 'tag conversões', id: '653169597818926' },
        { name: 'BRF 2', id: '25979812858306622' },
        { name: 'BRF 1', id: '1808675436461730' },
        { name: 'IA f - Test1', id: '1641677283765583' },
        { name: 'api conversões', id: '1608351080516966' },
        { name: 'brf off line', id: '1398246938709103' },
        { name: 'Brf Imóveis', id: '1185099943452848' },
        { name: 'inteligência artificial', id: '1180209180831914' },
        { name: 'BRF IMOVEIS', id: '1153338799897922' },
        { name: 'BRF IMOVEIS EIRELI ME', id: '1008028271007145' },
        { name: 'BRF IMÓVEIS EIRELI ME', id: '938885415377817' },
        { name: 'brf3', id: '692019663995776' },
        { name: 'BRF IMÓVEIS', id: '529625783230174' },
      ])
      app.save(user)
    } catch (_) {
      // User not found, skip
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'brfimoveis@gmail.com')
      user.set('meta_tags_list', null)
      app.save(user)
    } catch (_) {
      // User not found, skip
    }
  },
)
