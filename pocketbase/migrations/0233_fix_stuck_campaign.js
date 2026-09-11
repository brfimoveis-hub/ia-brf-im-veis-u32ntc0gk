migrate(
  (app) => {
    // Atualiza o registro da campanha 7wlled9m3ndf3d9 que havia sido interrompida pelo erro de countRecords
    try {
      const campaign = app.findRecordById('remarketing_campaigns', '7wlled9m3ndf3d9')
      if (campaign) {
        // Contar destinatários enviados e com falha
        const sentRecords = app.findRecordsByFilter(
          'remarketing_recipients',
          "campaign_id = '7wlled9m3ndf3d9' && status = 'sent'",
          '',
          1000,
          0,
        )
        const failedRecords = app.findRecordsByFilter(
          'remarketing_recipients',
          "campaign_id = '7wlled9m3ndf3d9' && status = 'failed'",
          '',
          1000,
          0,
        )
        const requiresTemplateRecords = app.findRecordsByFilter(
          'remarketing_recipients',
          "campaign_id = '7wlled9m3ndf3d9' && status = 'requires_template'",
          '',
          1000,
          0,
        )
        const queuedRecords = app.findRecordsByFilter(
          'remarketing_recipients',
          "campaign_id = '7wlled9m3ndf3d9' && status = 'queued'",
          '',
          1000,
          0,
        )

        campaign.set('sent_count', sentRecords ? sentRecords.length : 0)
        campaign.set('failed_count', failedRecords ? failedRecords.length : 0)
        campaign.set(
          'requires_template_count',
          requiresTemplateRecords ? requiresTemplateRecords.length : 0,
        )
        campaign.set('current_batch', 1)
        if (!queuedRecords || queuedRecords.length === 0) {
          campaign.set('status', 'completed')
          campaign.set('next_batch_at', '')
        }
        app.save(campaign)
      }
    } catch (err) {
      console.log('Migration 0233 non-fatal notice:', err)
    }
  },
  (app) => {},
)
