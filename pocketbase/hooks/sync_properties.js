// pocketbase/hooks/sync_properties.js
// Periodically and on-demand synchronizes properties from brfimoveis.com.br
// Note: Inline all logic inside callback handlers to conform to PocketBase JSVM callback isolation.

// Hourly cron job for syncing properties
cronAdd('sync_properties_from_site', '0 * * * *', () => {
  console.log('[PROPERTIES_SYNC] Starting scheduled sync from brfimoveis.com.br...')
  let syncedCount = 0
  let errorCount = 0
  let skippedJunkCount = 0

  function decodeUtf8(bytes) {
    if (!bytes || bytes.length === 0) return ''
    try {
      let out = ''
      let i = 0
      const len = bytes.length
      while (i < len) {
        const c = bytes[i++]
        if (c < 0x80) {
          out += String.fromCharCode(c)
        } else if (c > 0xbf && c < 0xe0) {
          if (i >= len) break
          const c2 = bytes[i++]
          out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f))
        } else if (c > 0xdf && c < 0xf0) {
          if (i + 1 >= len) break
          const c2 = bytes[i++]
          const c3 = bytes[i++]
          out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f))
        } else if (c > 0xef && c < 0xf8) {
          if (i + 2 >= len) break
          const c2 = bytes[i++]
          const c3 = bytes[i++]
          const c4 = bytes[i++]
          let codePoint =
            ((c & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f)
          codePoint -= 0x10000
          out += String.fromCharCode(0xd800 + (codePoint >> 10), 0xdc00 + (codePoint & 0x3ff))
        }
      }
      return out
    } catch (_) {
      return String.fromCharCode.apply(null, bytes)
    }
  }

  function fixMojibake(text) {
    if (!text || typeof text !== 'string') return ''
    if (!/[ÃÂÁÀÉÈÍÌÓÒÚÙÇãâáàéèíìóòúùç]/.test(text)) {
      return text
    }
    try {
      const codeUnits = []
      for (let i = 0; i < text.length; i++) {
        codeUnits.push(text.charCodeAt(i) & 0xff)
      }
      const reDecoded = decodeUtf8(codeUnits)
      if (reDecoded && !reDecoded.includes('Ã') && !reDecoded.includes('\ufffd')) {
        return reDecoded
      }
    } catch (_) {}
    return text
  }

  function containsJunkOrScript(str) {
    if (!str || typeof str !== 'string') return false
    const lower = str.toLowerCase()
    return (
      lower.includes('function(') ||
      lower.includes('fbq(') ||
      lower.includes('<script') ||
      lower.includes('!function') ||
      lower.includes('window.') ||
      lower.includes('document.') ||
      lower.includes('var ') ||
      lower.includes('eval(') ||
      lower.includes('javascript:')
    )
  }

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

    const sitemapText = decodeUtf8(sitemapRes.body)
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
    // Sample/scrape up to 12 at a time
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

        const pageHtml = decodeUtf8(pageRes.body)

        // Parse Code (e.g. Cód. AP-320 or AP343)
        const codeMatch = pageHtml.match(/C[óo]d\.?\s*([A-Za-z0-9\-_]+)/i)
        const code = codeMatch ? codeMatch[1].trim() : `BRF-${propId}`

        // Parse Title (<h1 ...> or <h2>)
        let title = ''
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
        title = fixMojibake(title)

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
        neighborhood = fixMojibake(neighborhood)

        // Parse Property Type & Transaction Type
        let propType = 'Apartamento'
        if (/casa|sobrado/i.test(title) || /casa/i.test(url)) {
          propType = 'Casa'
        } else if (/terreno|lote/i.test(title) || /terreno|area/i.test(url)) {
          propType = 'Terreno'
        } else if (/lançamento|lancamento/i.test(title) || /lancamento/i.test(url)) {
          propType = 'Lançamento'
        }

        // Check if existing record
        let existing = null
        try {
          existing = $app.findFirstRecordByData('properties', 'code', code)
        } catch (_) {}

        // VALIDATION: Reject junk / scripts / invalid records
        const isJunk =
          containsJunkOrScript(neighborhood) ||
          containsJunkOrScript(title) ||
          containsJunkOrScript(city) ||
          !title ||
          title.length < 5 ||
          title.includes('Ã') ||
          neighborhood.includes('Ã') ||
          city.includes('Ã') ||
          price <= 0 ||
          isNaN(price) ||
          !url.startsWith('https://www.brfimoveis.com.br/')

        if (isJunk) {
          skippedJunkCount++
          console.warn(
            `[PROPERTIES_SYNC] Discarding junk/corrupt property record (code=${code}, url=${url}, neigh=${neighborhood.substring(0, 30)})`,
          )
          if (existing) {
            existing.set('is_active', false)
            $app.save(existing)
          }

          try {
            const logsCol = $app.findCollectionByNameOrId('system_logs')
            const jLog = new Record(logsCol)
            jLog.set('type', 'properties_sync_junk_rejected')
            jLog.set('message', `Imóvel rejeitado pelo filtro de validação: Cód. ${code}`)
            jLog.set(
              'details',
              JSON.stringify({
                code,
                url,
                title: title.substring(0, 60),
                neighborhood: neighborhood.substring(0, 60),
                price,
              }),
            )
            $app.saveNoValidate(jLog)
          } catch (_) {}

          continue
        }

        const rec = existing || new Record(propertiesCol)
        rec.set('code', code)
        rec.set('title', title)
        rec.set('url', url)
        rec.set('city', city)
        rec.set('neighborhood', neighborhood)
        rec.set('property_type', propType)
        rec.set('transaction_type', 'Venda')
        rec.set('price', price)
        rec.set('price_formatted', priceFormatted || `R$ ${price.toLocaleString('pt-BR')}`)
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
        `Sincronização de imóveis concluída: ${syncedCount} atualizados, ${skippedJunkCount} descartados/desativados, ${errorCount} erros`,
      )
      logRec.set(
        'payload',
        JSON.stringify({ synced: syncedCount, skipped_junk: skippedJunkCount, errors: errorCount }),
      )
      $app.saveNoValidate(logRec)
    } catch (_) {}

    console.log(
      `[PROPERTIES_SYNC] Done: ${syncedCount} synced, ${skippedJunkCount} junk skipped, ${errorCount} errors`,
    )
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
  let skippedJunkCount = 0

  function decodeUtf8(bytes) {
    if (!bytes || bytes.length === 0) return ''
    try {
      let out = ''
      let i = 0
      const len = bytes.length
      while (i < len) {
        const c = bytes[i++]
        if (c < 0x80) {
          out += String.fromCharCode(c)
        } else if (c > 0xbf && c < 0xe0) {
          if (i >= len) break
          const c2 = bytes[i++]
          out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f))
        } else if (c > 0xdf && c < 0xf0) {
          if (i + 1 >= len) break
          const c2 = bytes[i++]
          const c3 = bytes[i++]
          out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f))
        } else if (c > 0xef && c < 0xf8) {
          if (i + 2 >= len) break
          const c2 = bytes[i++]
          const c3 = bytes[i++]
          const c4 = bytes[i++]
          let codePoint =
            ((c & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f)
          codePoint -= 0x10000
          out += String.fromCharCode(0xd800 + (codePoint >> 10), 0xdc00 + (codePoint & 0x3ff))
        }
      }
      return out
    } catch (_) {
      return String.fromCharCode.apply(null, bytes)
    }
  }

  function fixMojibake(text) {
    if (!text || typeof text !== 'string') return ''
    if (!/[ÃÂÁÀÉÈÍÌÓÒÚÙÇãâáàéèíìóòúùç]/.test(text)) {
      return text
    }
    try {
      const codeUnits = []
      for (let i = 0; i < text.length; i++) {
        codeUnits.push(text.charCodeAt(i) & 0xff)
      }
      const reDecoded = decodeUtf8(codeUnits)
      if (reDecoded && !reDecoded.includes('Ã') && !reDecoded.includes('\ufffd')) {
        return reDecoded
      }
    } catch (_) {}
    return text
  }

  function containsJunkOrScript(str) {
    if (!str || typeof str !== 'string') return false
    const lower = str.toLowerCase()
    return (
      lower.includes('function(') ||
      lower.includes('fbq(') ||
      lower.includes('<script') ||
      lower.includes('!function') ||
      lower.includes('window.') ||
      lower.includes('document.') ||
      lower.includes('var ') ||
      lower.includes('eval(') ||
      lower.includes('javascript:')
    )
  }

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

    const sitemapText = decodeUtf8(sitemapRes.body)
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

        const pageHtml = decodeUtf8(pageRes.body)
        const codeMatch = pageHtml.match(/C[óo]d\.?\s*([A-Za-z0-9\-_]+)/i)
        const code = codeMatch ? codeMatch[1].trim() : `BRF-${propId}`

        let title = ''
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
        title = fixMojibake(title)

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
        neighborhood = fixMojibake(neighborhood)

        let propType = 'Apartamento'
        if (/casa|sobrado/i.test(title) || /casa/i.test(url)) {
          propType = 'Casa'
        } else if (/terreno|lote/i.test(title) || /terreno|area/i.test(url)) {
          propType = 'Terreno'
        } else if (/lançamento|lancamento/i.test(title) || /lancamento/i.test(url)) {
          propType = 'Lançamento'
        }

        let existing = null
        try {
          existing = $app.findFirstRecordByData('properties', 'code', code)
        } catch (_) {}

        // VALIDATION: Reject junk / scripts / invalid records
        const isJunk =
          containsJunkOrScript(neighborhood) ||
          containsJunkOrScript(title) ||
          containsJunkOrScript(city) ||
          !title ||
          title.length < 5 ||
          title.includes('Ã') ||
          neighborhood.includes('Ã') ||
          city.includes('Ã') ||
          price <= 0 ||
          isNaN(price) ||
          !url.startsWith('https://www.brfimoveis.com.br/')

        if (isJunk) {
          skippedJunkCount++
          if (existing) {
            existing.set('is_active', false)
            $app.save(existing)
          }

          try {
            const logsCol = $app.findCollectionByNameOrId('system_logs')
            const jLog = new Record(logsCol)
            jLog.set('type', 'properties_sync_junk_rejected')
            jLog.set('message', `Imóvel rejeitado pelo filtro de validação: Cód. ${code}`)
            jLog.set(
              'details',
              JSON.stringify({
                code,
                url,
                title: title.substring(0, 60),
                neighborhood: neighborhood.substring(0, 60),
                price,
              }),
            )
            $app.saveNoValidate(jLog)
          } catch (_) {}

          continue
        }

        const rec = existing || new Record(propertiesCol)
        rec.set('code', code)
        rec.set('title', title)
        rec.set('url', url)
        rec.set('city', city)
        rec.set('neighborhood', neighborhood)
        rec.set('property_type', propType)
        rec.set('transaction_type', 'Venda')
        rec.set('price', price)
        rec.set('price_formatted', priceFormatted || `R$ ${price.toLocaleString('pt-BR')}`)
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
        `Sincronização manual de imóveis: ${syncedCount} atualizados, ${skippedJunkCount} descartados/desativados, ${errorCount} erros`,
      )
      logRec.set(
        'payload',
        JSON.stringify({ synced: syncedCount, skipped_junk: skippedJunkCount, errors: errorCount }),
      )
      $app.saveNoValidate(logRec)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      synced: syncedCount,
      skipped_junk: skippedJunkCount,
      errors: errorCount,
    })
  } catch (err) {
    return e.json(500, { ok: false, error: String(err) })
  }
})
