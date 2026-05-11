migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('customers')

    if (!col.fields.getByName('google_campaign_id')) {
      col.fields.add(new TextField({ name: 'google_campaign_id' }))
    }
    if (!col.fields.getByName('google_adgroup_id')) {
      col.fields.add(new TextField({ name: 'google_adgroup_id' }))
    }
    if (!col.fields.getByName('external_lead_id')) {
      col.fields.add(new TextField({ name: 'external_lead_id' }))
    }
    if (!col.fields.getByName('campaign_name')) {
      col.fields.add(new TextField({ name: 'campaign_name' }))
    }

    col.addIndex('idx_customers_external_lead_id', false, 'external_lead_id', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('customers')
    col.removeField('google_campaign_id')
    col.removeField('google_adgroup_id')
    col.removeField('external_lead_id')
    col.removeField('campaign_name')
    col.removeIndex('idx_customers_external_lead_id')
    app.save(col)
  },
)
