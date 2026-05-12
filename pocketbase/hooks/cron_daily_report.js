cronAdd('daily_performance_report', '0 21 * * *', () => {
  const slackWebhook = $secrets.get('SLACK_WEBHOOK_URL')
  if (!slackWebhook) return

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const totalLeads = $app.countRecords('customers', `created >= '${todayStr} 00:00:00'`)
  const qualifiedLeads = $app.countRecords(
    'customers',
    `created >= '${todayStr} 00:00:00' && status = 'Qualificado'`,
  )

  try {
    $http.send({
      url: slackWebhook,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📊 *Relatório Diário de Performance*\n*Data:* ${todayStr}\n*Novos Leads:* ${totalLeads}\n*Leads Qualificados:* ${qualifiedLeads}`,
        channel: '#leads-sc',
      }),
      timeout: 10,
    })
  } catch (err) {
    $app.logger().error('Failed to send daily report', 'error', String(err))
  }
})
