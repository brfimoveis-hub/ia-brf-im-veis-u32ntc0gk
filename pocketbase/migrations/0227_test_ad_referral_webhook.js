/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Clean up simulation artifacts
  const testPhone = '5548999990001'
  try {
    const existing = app.findFirstRecordByFilter('customers', 'phone = {:ph}', { ph: testPhone })
    if (existing) {
      app.delete(existing)
    }
  } catch (_) {}

  try {
    const existingLogs = app.findRecordsByFilter(
      'system_logs',
      "type = 'ad_referral'",
      '-created',
      10,
      0,
    )
    for (const l of existingLogs) {
      const p = l.get('payload')
      if (p && typeof p === 'object' && p.phone === testPhone) {
        app.delete(l)
      }
    }
  } catch (_) {}
})
