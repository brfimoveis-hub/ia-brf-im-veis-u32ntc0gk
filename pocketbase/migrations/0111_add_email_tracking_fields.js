migrate(
  (app) => {
    const deliveriesCol = app.findCollectionByNameOrId('email_deliveries')

    if (!deliveriesCol.fields.getByName('opened_at')) {
      deliveriesCol.fields.add(new DateField({ name: 'opened_at' }))
    }
    if (!deliveriesCol.fields.getByName('clicked_at')) {
      deliveriesCol.fields.add(new DateField({ name: 'clicked_at' }))
    }
    if (!deliveriesCol.fields.getByName('open_count')) {
      deliveriesCol.fields.add(new NumberField({ name: 'open_count' }))
    }
    if (!deliveriesCol.fields.getByName('click_count')) {
      deliveriesCol.fields.add(new NumberField({ name: 'click_count' }))
    }
    if (!deliveriesCol.fields.getByName('last_user_agent')) {
      deliveriesCol.fields.add(new TextField({ name: 'last_user_agent' }))
    }
    if (!deliveriesCol.fields.getByName('last_open_ip')) {
      deliveriesCol.fields.add(new TextField({ name: 'last_open_ip' }))
    }
    if (!deliveriesCol.fields.getByName('last_click_ip')) {
      deliveriesCol.fields.add(new TextField({ name: 'last_click_ip' }))
    }
    app.save(deliveriesCol)

    const campaignsCol = app.findCollectionByNameOrId('email_campaigns')
    if (!campaignsCol.fields.getByName('unique_opens')) {
      campaignsCol.fields.add(new NumberField({ name: 'unique_opens' }))
    }
    if (!campaignsCol.fields.getByName('unique_clicks')) {
      campaignsCol.fields.add(new NumberField({ name: 'unique_clicks' }))
    }
    if (!campaignsCol.fields.getByName('total_opens')) {
      campaignsCol.fields.add(new NumberField({ name: 'total_opens' }))
    }
    if (!campaignsCol.fields.getByName('total_clicks')) {
      campaignsCol.fields.add(new NumberField({ name: 'total_clicks' }))
    }
    app.save(campaignsCol)
  },
  (app) => {
    var dCol = app.findCollectionByNameOrId('email_deliveries')
    ;[
      'opened_at',
      'clicked_at',
      'open_count',
      'click_count',
      'last_user_agent',
      'last_open_ip',
      'last_click_ip',
    ].forEach(function (n) {
      try {
        var f = dCol.fields.getByName(n)
        if (f) dCol.fields.remove(f)
      } catch (_) {}
    })
    app.save(dCol)
    var cCol = app.findCollectionByNameOrId('email_campaigns')
    ;['unique_opens', 'unique_clicks', 'total_opens', 'total_clicks'].forEach(function (n) {
      try {
        var f = cCol.fields.getByName(n)
        if (f) cCol.fields.remove(f)
      } catch (_) {}
    })
    app.save(cCol)
  },
)
