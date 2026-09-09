// pocketbase/hooks/sync_properties.js
// Periodically and on-demand synchronizes properties from brfimoveis.com.br
// Note: Inline all logic inside callback handlers to conform to PocketBase JSVM callback isolation.

// Hourly cron job for syncing properties
cronAdd('sync_properties_from_site', '0 * * * *', () => {
  console.log('[PROPERTIES_SYNC] Starting scheduled sync from brfimoveis.com.br...')
  let syncedCount = 0
  let errorCount = 0

  try {
    const sitemapRes = $http.send({
      url: 'https://www.brfimoveis.com.br/sitemap.xml',
      method: 'GET',
      headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
      timeout: 15,
    })

    if (!sitemapRes || sitemapRes.statusCode !== 200 || !sitemapRes.body) {
      throw new Error(
        `Failed to fetch sitemap: status=${sitemapRes ? sitemapRes.statusCode : 'none'}`,
      )
    }

    const sitemapText = String.fromCharCode.apply(null, sitemapRes.body)
    const propertyUrlRegex = /https:\/\/www\.brfimoveis\.com\.br\/(\d+)\/imoveis\/([^\s<"]+)/g
    const foundUrls = new Map()

    let match
    while ((match = propertyUrlRegex.exec(sitemapText)) !== null) {
      const propId = match[1]
      const fullUrl = `https://www.brfimoveis.com.br/${propId}/imoveis/${match[2]}`
      if (!foundUrls.has(propId)) {
        foundUrls.set(propId, fullUrl)
      }
    }

    console.log(`[PROPERTIES_SYNC] Found ${foundUrls.size} property URLs in sitemap`)

    const propertiesCol = $app.findCollectionByNameOrId('properties')
    let processed = 0
    // Sample/scrape up to 10 at a time to prevent rate-limit
    for (const [propId, url] of foundUrls.entries()) {
      if (processed >= 12) break
      processed++

      try {
        const pageRes = $http.send({
          url: url,
          method: 'GET',
          headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
          timeout: 10,
        })

        if (!pageRes || pageRes.statusCode !== 200 || !pageRes.body) {
          continue
        }

        const pageHtml = String.fromCharCode.apply(null, pageRes.body)

        // Parse Code (e.g. Cód. AP-320 or AP343)
        const codeMatch = pageHtml.match(/C[óo]d\.?\s*([A-Za-z0-9\-_]+)/i)
        const code = codeMatch ? codeMatch[1].trim() : `BRF-${propId}`

        // Parse Title (<h1 ...> or <h2>)
        let title = ''
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
        if (!title) {
          title = `Imóvel Cód. ${code}`
        }

        // Parse Price
        let price = 0
        let priceFormatted = ''
        const priceMatch = pageHtml.match(/R\$\s*([\d\.,]+)/i)
        if (priceMatch) {
          priceFormatted = `R$ ${priceMatch[1]}`
          const cleanNum = priceMatch[1].replace(/\./g, '').replace(',', '.')
          price = parseFloat(cleanNum) || 0
        }

        // Parse Bedrooms
        let bedrooms = 0
        const bedMatch = pageHtml.match(/(\d+)\s*quarto/i) || pageHtml.match(/(\d+)\s*dormit/i)
        if (bedMatch) bedrooms = parseInt(bedMatch[1], 10) || 0

        // Parse Suites
        let suites = 0
        const suiteMatch = pageHtml.match(/(\d+)\s*su[íi]te/i)
        if (suiteMatch) suites = parseInt(suiteMatch[1], 10) || 0

        // Parse Bathrooms
        let bathrooms = 0
        const bathMatch = pageHtml.match(/(\d+)\s*banh/i)
        if (bathMatch) bathrooms = parseInt(bathMatch[1], 10) || 0

        // Parse Parking spaces
        let parking = 0
        const parkMatch = pageHtml.match(/(\d+)\s*vaga/i) || pageHtml.match(/(\d+)\s*garag/i)
        if (parkMatch) parking = parseInt(parkMatch[1], 10) || 0

        // Parse Area
        let areaPriv = 0
        const areaMatch =
          pageHtml.match(/([\d\.,]+)\s*m²\s*privativa/i) || pageHtml.match(/(\d+[\.,]?\d*)\s*m²/i)
        if (areaMatch) {
          const num = areaMatch[1].replace(/\./g, '').replace(',', '.')
          areaPriv = parseFloat(num) || 0
        }

        // Parse City & Neighborhood
        let city = 'Florianópolis'
        let neighborhood = ''
        if (url.includes('balneario-camboriu')) {
          city = 'Balneário Camboriú'
        } else if (url.includes('palhoca')) {
          city = 'Palhoça'
        } else if (url.includes('sao-jose')) {
          city = 'São José'
        } else if (url.includes('biguacu')) {
          city = 'Biguaçu'
        } else if (url.includes('sao-joaquim')) {
          city = 'São Joaquim'
        } else if (url.includes('governador-celso-ramos')) {
          city = 'Governador Celso Ramos'
        }

        const neighMatch = pageHtml.match(/Bairro[\s\S]*?<[^>]+>([\s\S]*?)<\/[^>]+>/i)
        if (neighMatch) {
          neighborhood = neighMatch[1].replace(/<[^>]+>/g, '').trim()
        }

        let existing = null
        try {
          existing = $app.findFirstRecordByData('properties', 'code', code)
        } catch (_) {}

        const rec = existing || new Record(propertiesCol)
        rec.set('code', code)
        rec.set('title', title)
        rec.set('url', url)
        rec.set('city', city)
        if (neighborhood) rec.set('neighborhood', neighborhood)
        if (price > 0) {
          rec.set('price', price)
          rec.set('price_formatted', priceFormatted)
        }
        if (bedrooms > 0) rec.set('bedrooms', bedrooms)
        if (suites > 0) rec.set('suites', suites)
        if (bathrooms > 0) rec.set('bathrooms', bathrooms)
        if (parking > 0) rec.set('parking_spaces', parking)
        if (areaPriv > 0) rec.set('area_privativa', areaPriv)
        rec.set('is_active', true)

        $app.save(rec)
        syncedCount++
      } catch (itemErr) {
        errorCount++
        console.warn(`[PROPERTIES_SYNC] Error processing ${url}: ${String(itemErr)}`)
      }
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('type', 'properties_sync')
      logRec.set(
        'message',
        `Sincronização de imóveis concluída: ${syncedCount} atualizados, ${errorCount} erros`,
      )
      logRec.set('payload', JSON.stringify({ synced: syncedCount, errors: errorCount }))
      $app.saveNoValidate(logRec)
    } catch (_) {}

    console.log(`[PROPERTIES_SYNC] Done: ${syncedCount} synced, ${errorCount} errors`)
  } catch (err) {
    console.error(`[PROPERTIES_SYNC] General sync failure: ${String(err)}`)
    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('type', 'properties_sync_error')
      logRec.set(
        'message',
        `Falha na sincronização de imóveis do site: ${err.message || String(err)}`,
      )
      logRec.set('details', String(err.stack || err))
      $app.saveNoValidate(logRec)
    } catch (_) {}
  }
})

// HTTP Endpoint to trigger sync manually if needed
routerAdd('POST', '/backend/v1/sync-properties', (e) => {
  console.log('[PROPERTIES_SYNC] Manual sync requested...')
  let syncedCount = 0
  let errorCount = 0

  try {
    const sitemapRes = $http.send({
      url: 'https://www.brfimoveis.com.br/sitemap.xml',
      method: 'GET',
      headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
      timeout: 15,
    })

    if (!sitemapRes || sitemapRes.statusCode !== 200 || !sitemapRes.body) {
      throw new Error(
        `Failed to fetch sitemap: status=${sitemapRes ? sitemapRes.statusCode : 'none'}`,
      )
    }

    const sitemapText = String.fromCharCode.apply(null, sitemapRes.body)
    const propertyUrlRegex = /https:\/\/www\.brfimoveis\.com\.br\/(\d+)\/imoveis\/([^\s<"]+)/g
    const foundUrls = new Map()

    let match
    while ((match = propertyUrlRegex.exec(sitemapText)) !== null) {
      const propId = match[1]
      const fullUrl = `https://www.brfimoveis.com.br/${propId}/imoveis/${match[2]}`
      if (!foundUrls.has(propId)) {
        foundUrls.set(propId, fullUrl)
      }
    }

    const propertiesCol = $app.findCollectionByNameOrId('properties')
    let processed = 0
    for (const [propId, url] of foundUrls.entries()) {
      if (processed >= 12) break
      processed++

      try {
        const pageRes = $http.send({
          url: url,
          method: 'GET',
          headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
          timeout: 10,
        })

        if (!pageRes || pageRes.statusCode !== 200 || !pageRes.body) {
          continue
        }

        const pageHtml = String.fromCharCode.apply(null, pageRes.body)
        const codeMatch = pageHtml.match(/C[óo]d\.?\s*([A-Za-z0-9\-_]+)/i)
        const code = codeMatch ? codeMatch[1].trim() : `BRF-${propId}`

        let title = ''
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
        if (!title) {
          title = `Imóvel Cód. ${code}`
        }

        let price = 0
        let priceFormatted = ''
        const priceMatch = pageHtml.match(/R\$\s*([\d\.,]+)/i)
        if (priceMatch) {
          priceFormatted = `R$ ${priceMatch[1]}`
          const cleanNum = priceMatch[1].replace(/\./g, '').replace(',', '.')
          price = parseFloat(cleanNum) || 0
        }

        let bedrooms = 0
        const bedMatch = pageHtml.match(/(\d+)\s*quarto/i) || pageHtml.match(/(\d+)\s*dormit/i)
        if (bedMatch) bedrooms = parseInt(bedMatch[1], 10) || 0

        let suites = 0
        const suiteMatch = pageHtml.match(/(\d+)\s*su[íi]te/i)
        if (suiteMatch) suites = parseInt(suiteMatch[1], 10) || 0

        let bathrooms = 0
        const bathMatch = pageHtml.match(/(\d+)\s*banh/i)
        if (bathMatch) bathrooms = parseInt(bathMatch[1], 10) || 0

        let parking = 0
        const parkMatch = pageHtml.match(/(\d+)\s*vaga/i) || pageHtml.match(/(\d+)\s*garag/i)
        if (parkMatch) parking = parseInt(parkMatch[1], 10) || 0

        let areaPriv = 0
        const areaMatch =
          pageHtml.match(/([\d\.,]+)\s*m²\s*privativa/i) || pageHtml.match(/(\d+[\.,]?\d*)\s*m²/i)
        if (areaMatch) {
          const num = areaMatch[1].replace(/\./g, '').replace(',', '.')
          areaPriv = parseFloat(num) || 0
        }

        let city = 'Florianópolis'
        let neighborhood = ''
        if (url.includes('balneario-camboriu')) {
          city = 'Balneário Camboriú'
        } else if (url.includes('palhoca')) {
          city = 'Palhoça'
        } else if (url.includes('sao-jose')) {
          city = 'São José'
        } else if (url.includes('biguacu')) {
          city = 'Biguaçu'
        } else if (url.includes('sao-joaquim')) {
          city = 'São Joaquim'
        } else if (url.includes('governador-celso-ramos')) {
          city = 'Governador Celso Ramos'
        }

        const neighMatch = pageHtml.match(/Bairro[\s\S]*?<[^>]+>([\s\S]*?)<\/[^>]+>/i)
        if (neighMatch) {
          neighborhood = neighMatch[1].replace(/<[^>]+>/g, '').trim()
        }

        let existing = null
        try {
          existing = $app.findFirstRecordByData('properties', 'code', code)
        } catch (_) {}

        const rec = existing || new Record(propertiesCol)
        rec.set('code', code)
        rec.set('title', title)
        rec.set('url', url)
        rec.set('city', city)
        if (neighborhood) rec.set('neighborhood', neighborhood)
        if (price > 0) {
          rec.set('price', price)
          rec.set('price_formatted', priceFormatted)
        }
        if (bedrooms > 0) rec.set('bedrooms', bedrooms)
        if (suites > 0) rec.set('suites', suites)
        if (bathrooms > 0) rec.set('bathrooms', bathrooms)
        if (parking > 0) rec.set('parking_spaces', parking)
        if (areaPriv > 0) rec.set('area_privativa', areaPriv)
        rec.set('is_active', true)

        $app.save(rec)
        syncedCount++
      } catch (itemErr) {
        errorCount++
      }
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('type', 'properties_sync')
      logRec.set(
        'message',
        `Sincronização manual de imóveis: ${syncedCount} atualizados, ${errorCount} erros`,
      )
      logRec.set('payload', JSON.stringify({ synced: syncedCount, errors: errorCount }))
      $app.saveNoValidate(logRec)
    } catch (_) {}

    return e.json(200, { ok: true, synced: syncedCount, errors: errorCount })
  } catch (err) {
    return e.json(500, { ok: false, error: String(err) })
  }
})
