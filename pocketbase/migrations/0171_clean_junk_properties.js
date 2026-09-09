migrate(
  (app) => {
    // Clean up junk properties in the database:
    // Mark invalid/junk properties as is_active = false:
    // - Specific junk record e49 (id iwams7xkmmi3jx5)
    // - Any property containing JavaScript code in neighborhood, title, city, or description
    // - Any property with broken encoding (mojibake)
    // - Any property with empty/missing title, invalid price <= 0, or missing essential fields

    const sql = `
      UPDATE properties 
      SET is_active = 0 
      WHERE 
        code = 'e49'
        OR id = 'iwams7xkmmi3jx5'
        OR neighborhood LIKE '%function%'
        OR neighborhood LIKE '%fbq%'
        OR neighborhood LIKE '%<script%'
        OR neighborhood LIKE '%window.%'
        OR neighborhood LIKE '%document.%'
        OR neighborhood LIKE '%!function%'
        OR neighborhood LIKE '%var %'
        OR title LIKE '%function%'
        OR title LIKE '%<script%'
        OR title LIKE '%Ã%'
        OR neighborhood LIKE '%Ã%'
        OR city LIKE '%Ã%'
        OR description LIKE '%Ã%'
        OR description LIKE '%function%'
        OR price <= 0
        OR price IS NULL
        OR title = ''
        OR title IS NULL
        OR url NOT LIKE 'https://www.brfimoveis.com.br/%';
    `
    app.db().newQuery(sql).execute()

    // Also log this cleanup action in system_logs
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('type', 'properties_cleanup')
      logRec.set(
        'message',
        'Desativação de registros de imóveis corrompidos ou com código JS (e49, scripts, encoding quebrado).',
      )
      logRec.set(
        'details',
        'Executado via migration 0171: is_active set to false para registros inválidos.',
      )
      app.save(logRec)
    } catch (_) {}
  },
  (app) => {
    // Reversible action: no-op or leave deactivated
  },
)
