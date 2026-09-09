// pocketbase/hooks/sync_properties.js
// Periodically and on-demand synchronizes properties from brfimoveis.com.br
// Note: Inline all logic inside callback handlers to conform to PocketBase JSVM callback isolation.

// Hourly cron job for syncing properties
cronAdd('sync_properties_instant_trigger', '* * * * *', () => {
  console.log('[PROPERTIES_SYNC_INSTANT] Starting instant sync...')
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
    const sitemapUrl = 'https://www.brfimoveis.com.br/sitemap.xml'
    const res = $http.send({
      url: sitemapUrl,
      method: 'GET',
      headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
      timeout: 15,
    })

    if (!res || res.statusCode !== 200 || !res.body) {
      console.warn('[PROPERTIES_SYNC_INSTANT] Failed to fetch sitemap')
      return
    }

    const sitemapText = decodeUtf8(res.body)
    const propertyUrlRegex = /https:\/\/www\.brfimoveis\.com\.br\/(\d+)\/imoveis\/([^\s<"']+)/g
    const foundUrls = new Map()

    let match
    while ((match = propertyUrlRegex.exec(sitemapText)) !== null) {
      const propId = match[1]
      let slug = match[2]
      if (slug.endsWith('/')) slug = slug.slice(0, -1)
      const fullUrl = `https://www.brfimoveis.com.br/${propId}/imoveis/${slug}`
      if (!foundUrls.has(propId)) {
        foundUrls.set(propId, fullUrl)
      }
    }

    const listingPages = [
      'https://www.brfimoveis.com.br/imoveis.php',
      'https://www.brfimoveis.com.br/',
      'https://www.brfimoveis.com.br/imobiliaria/imoveis/0/1',
      'https://www.brfimoveis.com.br/imobiliaria/imoveis/0/2',
    ]

    for (const lUrl of listingPages) {
      try {
        const lRes = $http.send({
          url: lUrl,
          method: 'GET',
          headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
          timeout: 10,
        })
        if (lRes && lRes.statusCode === 200 && lRes.body) {
          const lHtml = decodeUtf8(lRes.body)
          const pRegex =
            /(?:https:\/\/www\.brfimoveis\.com\.br)?\/(\d+)\/imoveis\/([a-zA-Z0-9\-_]+)/g
          let pMatch
          while ((pMatch = pRegex.exec(lHtml)) !== null) {
            const pId = pMatch[1]
            const pSlug = pMatch[2]
            if (!foundUrls.has(pId)) {
              foundUrls.set(pId, `https://www.brfimoveis.com.br/${pId}/imoveis/${pSlug}`)
            }
          }
        }
      } catch (lErr) {
        console.warn(`[PROPERTIES_SYNC_INSTANT] Listing fetch error: ${String(lErr)}`)
      }
    }

    const propertiesCol = $app.findCollectionByNameOrId('properties')
    let processed = 0
    let added = 0
    let updated = 0

    for (const [propId, url] of foundUrls.entries()) {
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
        const codeMatch = pageHtml.match(/C[óo]d\.?\s*([A-Za-z0-9\-_\s]+?)(?:<|\n|\r|$)/i)
        let code = codeMatch ? codeMatch[1].trim() : `BRF-${propId}`
        code = code.replace(/\s+/g, ' ').trim()

        // Known priority launches manual normalization by ID or URL
        if (propId === '329' || url.includes('/329/')) {
          code = 'LM 329'
        } else if (propId === '301' || url.includes('/301/')) {
          code = 'LM 301'
        } else if (propId === '295' || url.includes('/295/')) {
          code = 'LM 295'
        } else if (propId === '310' || url.includes('/310/')) {
          code = 'LM 310'
        } else if (propId === '330' || url.includes('/330/')) {
          code = 'LM 330'
        } else if (propId === '289' || url.includes('/289/')) {
          code = 'LM 289'
        } else if (propId === '311' || url.includes('/311/')) {
          code = 'LM 311'
        } else if (propId === '342' || url.includes('/342/')) {
          code = 'LM 342'
        }

        let title = ''
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
        if (!title) {
          const h2Match = pageHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
          if (h2Match) {
            title = h2Match[1].replace(/<[^>]+>/g, '').trim()
          }
        }
        title = fixMojibake(title)

        if (!title || containsJunkOrScript(title)) {
          continue
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
        neighborhood = fixMojibake(neighborhood)
        if (containsJunkOrScript(neighborhood)) neighborhood = ''

        const cityMatch = pageHtml.match(/Cidade[\s\S]*?<[^>]+>([\s\S]*?)<\/[^>]+>/i)
        if (cityMatch) {
          const rawCity = cityMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/-\s*SC/i, '')
            .trim()
          if (rawCity && !containsJunkOrScript(rawCity)) {
            city = fixMojibake(rawCity)
          }
        }

        let propType = 'Apartamento'
        if (/casa|sobrado/i.test(title) || /casa/i.test(url)) {
          propType = 'Casa'
        } else if (/terreno|lote/i.test(title) || /terreno|area/i.test(url)) {
          propType = 'Terreno'
        } else if (/lançamento|lancamento/i.test(title) || /lancamento/i.test(url)) {
          propType = 'Lançamento'
        }

        let description = ''
        const descMatch =
          pageHtml.match(
            /<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
          ) || pageHtml.match(/<div[^>]*id=["']description["'][^>]*>([\s\S]*?)<\/div>/i)
        if (descMatch) {
          description = fixMojibake(
            descMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim(),
          )
          if (description.length > 500) description = description.substring(0, 500) + '...'
        }

        let existing = null
        try {
          existing = $app.findFirstRecordByData('properties', 'url', url)
        } catch (_) {}

        if (!existing) {
          try {
            existing = $app.findFirstRecordByData('properties', 'code', code)
          } catch (_) {}
        }

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
          if (existing) {
            existing.set('is_active', false)
            $app.save(existing)
          }
          continue
        }

        const rec = existing || new Record(propertiesCol)
        const isNew = !existing

        rec.set('code', code)
        rec.set('title', title)
        rec.set('url', url)
        rec.set('city', city || 'Florianópolis')
        rec.set('neighborhood', neighborhood || '')
        rec.set('property_type', propType)
        rec.set('transaction_type', 'Venda')
        rec.set('price', price)
        rec.set('price_formatted', priceFormatted || `R$ ${price.toLocaleString('pt-BR')}`)
        if (bedrooms > 0) rec.set('bedrooms', bedrooms)
        if (suites > 0) rec.set('suites', suites)
        if (bathrooms > 0) rec.set('bathrooms', bathrooms)
        if (parking > 0) rec.set('parking_spaces', parking)
        if (areaPriv > 0) rec.set('area_privativa', areaPriv)
        if (description && !rec.getString('description')) {
          rec.set('description', description)
        }
        rec.set('is_active', true)

        $app.save(rec)
        if (isNew) added++
        else updated++
      } catch (err) {
        console.warn(`[PROPERTIES_SYNC_INSTANT] Error on ${url}: ${String(err)}`)
      }
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('system_logs')
      const syncLog = new Record(logsCol)
      syncLog.set('type', 'properties_sync')
      syncLog.set(
        'message',
        `Sincronização instantânea de imóveis: ${processed} processados, ${added} novos, ${updated} atualizados.`,
      )
      syncLog.set(
        'details',
        JSON.stringify({ totalUrls: foundUrls.size, processed, added, updated }),
      )
      $app.saveNoValidate(syncLog)
    } catch (_) {}
    console.log(
      `[PROPERTIES_SYNC_INSTANT] Complete: ${added} added, ${updated} updated, total processed ${processed}`,
    )
  } catch (syncErr) {
    console.error(`[PROPERTIES_SYNC_INSTANT] Fatal error: ${String(syncErr)}`)
  }
})

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
    const propertyUrlRegex = /https:\/\/www\.brfimoveis\.com\.br\/(\d+)\/imoveis\/([^\s<"']+)/g
    const foundUrls = new Map()

    let match
    while ((match = propertyUrlRegex.exec(sitemapText)) !== null) {
      const propId = match[1]
      let slug = match[2]
      if (slug.endsWith('/')) slug = slug.slice(0, -1)
      const fullUrl = `https://www.brfimoveis.com.br/${propId}/imoveis/${slug}`
      if (!foundUrls.has(propId)) {
        foundUrls.set(propId, fullUrl)
      }
    }

    // Also scan listings pages to discover any URLs not in sitemap
    const listingPages = [
      'https://www.brfimoveis.com.br/imoveis.php',
      'https://www.brfimoveis.com.br/',
      'https://www.brfimoveis.com.br/imobiliaria/imoveis/0/1',
      'https://www.brfimoveis.com.br/imobiliaria/imoveis/0/2',
    ]

    for (const lUrl of listingPages) {
      try {
        const lRes = $http.send({
          url: lUrl,
          method: 'GET',
          headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
          timeout: 10,
        })
        if (lRes && lRes.statusCode === 200 && lRes.body) {
          const lHtml = decodeUtf8(lRes.body)
          const pRegex =
            /(?:https:\/\/www\.brfimoveis\.com\.br)?\/(\d+)\/imoveis\/([a-zA-Z0-9\-_]+)/g
          let pMatch
          while ((pMatch = pRegex.exec(lHtml)) !== null) {
            const pId = pMatch[1]
            const pSlug = pMatch[2]
            if (!foundUrls.has(pId)) {
              foundUrls.set(pId, `https://www.brfimoveis.com.br/${pId}/imoveis/${pSlug}`)
            }
          }
        }
      } catch (lErr) {
        console.warn(`[PROPERTIES_SYNC] Non-fatal listing fetch error (${lUrl}): ${String(lErr)}`)
      }
    }

    console.log(`[PROPERTIES_SYNC] Found ${foundUrls.size} property URLs to sync`)

    const propertiesCol = $app.findCollectionByNameOrId('properties')
    let processed = 0
    // Process ALL active properties from the site
    for (const [propId, url] of foundUrls.entries()) {
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

        // Parse Code (e.g. Cód. AP-320 or AP343 or LM 329 or LM311)
        const codeMatch = pageHtml.match(/C[óo]d\.?\s*([A-Za-z0-9\-_\s]+?)(?:<|\n|\r|$)/i)
        let code = codeMatch ? codeMatch[1].trim() : `BRF-${propId}`
        // Clean any code formatting like trailing dots or excessive spaces
        code = code.replace(/\s+/g, ' ').trim()

        // Known priority launches manual normalization by ID or URL
        if (propId === '329' || url.includes('/329/')) {
          code = 'LM 329'
        } else if (propId === '301' || url.includes('/301/')) {
          code = 'LM 301'
        } else if (propId === '295' || url.includes('/295/')) {
          code = 'LM 295'
        } else if (propId === '310' || url.includes('/310/')) {
          code = 'LM 310'
        } else if (propId === '330' || url.includes('/330/')) {
          code = 'LM 330'
        } else if (propId === '289' || url.includes('/289/')) {
          code = 'LM 289'
        } else if (propId === '311' || url.includes('/311/')) {
          code = 'LM 311'
        } else if (propId === '342' || url.includes('/342/')) {
          code = 'LM 342'
        }

        // Parse Title (<h1 ...> or <h2>)
        let title = ''
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
        if (!title) {
          const h2Match = pageHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
          if (h2Match) {
            title = h2Match[1].replace(/<[^>]+>/g, '').trim()
          }
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

        // Extract city from page if available (Cidade: ...)
        const cityMatch = pageHtml.match(/Cidade[\s\S]*?<[^>]+>([\s\S]*?)<\/[^>]+>/i)
        if (cityMatch) {
          const rawCity = cityMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/-\s*SC/i, '')
            .trim()
          if (rawCity && !containsJunkOrScript(rawCity)) {
            city = fixMojibake(rawCity)
          }
        }

        // Parse Property Type & Transaction Type
        let propType = 'Apartamento'
        if (/casa|sobrado/i.test(title) || /casa/i.test(url)) {
          propType = 'Casa'
        } else if (/terreno|lote/i.test(title) || /terreno|area/i.test(url)) {
          propType = 'Terreno'
        } else if (/lançamento|lancamento/i.test(title) || /lancamento/i.test(url)) {
          propType = 'Lançamento'
        }

        // Parse description/highlights if available
        let description = ''
        const descMatch =
          pageHtml.match(
            /<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
          ) || pageHtml.match(/<div[^>]*id=["']description["'][^>]*>([\s\S]*?)<\/div>/i)
        if (descMatch) {
          description = fixMojibake(
            descMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim(),
          )
          if (description.length > 500) description = description.substring(0, 500) + '...'
        }

        // Check if existing record by url OR by code
        let existing = null
        try {
          existing = $app.findFirstRecordByData('properties', 'url', url)
        } catch (_) {}

        if (!existing) {
          try {
            existing = $app.findFirstRecordByData('properties', 'code', code)
          } catch (_) {}
        }

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
        rec.set('city', city || 'Florianópolis')
        rec.set('neighborhood', neighborhood || '')
        rec.set('property_type', propType)
        rec.set('transaction_type', 'Venda')
        rec.set('price', price)
        rec.set('price_formatted', priceFormatted || `R$ ${price.toLocaleString('pt-BR')}`)
        if (bedrooms > 0) rec.set('bedrooms', bedrooms)
        if (suites > 0) rec.set('suites', suites)
        if (bathrooms > 0) rec.set('bathrooms', bathrooms)
        if (parking > 0) rec.set('parking_spaces', parking)
        if (areaPriv > 0) rec.set('area_privativa', areaPriv)
        if (description && !rec.getString('description')) {
          rec.set('description', description)
        }
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
routerAdd('GET', '/backend/v1/sync-properties-run', (e) => {
  console.log('[PROPERTIES_SYNC] Manual sync requested via GET /backend/v1/sync-properties-run...')
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
    const propertyUrlRegex = /https:\/\/www\.brfimoveis\.com\.br\/(\d+)\/imoveis\/([^\s<"']+)/g
    const foundUrls = new Map()

    let match
    while ((match = propertyUrlRegex.exec(sitemapText)) !== null) {
      const propId = match[1]
      let slug = match[2]
      if (slug.endsWith('/')) slug = slug.slice(0, -1)
      const fullUrl = `https://www.brfimoveis.com.br/${propId}/imoveis/${slug}`
      if (!foundUrls.has(propId)) {
        foundUrls.set(propId, fullUrl)
      }
    }

    const listingPages = [
      'https://www.brfimoveis.com.br/imoveis.php',
      'https://www.brfimoveis.com.br/',
      'https://www.brfimoveis.com.br/imobiliaria/imoveis/0/1',
      'https://www.brfimoveis.com.br/imobiliaria/imoveis/0/2',
    ]

    for (const lUrl of listingPages) {
      try {
        const lRes = $http.send({
          url: lUrl,
          method: 'GET',
          headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
          timeout: 10,
        })
        if (lRes && lRes.statusCode === 200 && lRes.body) {
          const lHtml = decodeUtf8(lRes.body)
          const pRegex =
            /(?:https:\/\/www\.brfimoveis\.com\.br)?\/(\d+)\/imoveis\/([a-zA-Z0-9\-_]+)/g
          let pMatch
          while ((pMatch = pRegex.exec(lHtml)) !== null) {
            const pId = pMatch[1]
            const pSlug = pMatch[2]
            if (!foundUrls.has(pId)) {
              foundUrls.set(pId, `https://www.brfimoveis.com.br/${pId}/imoveis/${pSlug}`)
            }
          }
        }
      } catch (lErr) {
        console.warn(`[PROPERTIES_SYNC] Non-fatal listing fetch error (${lUrl}): ${String(lErr)}`)
      }
    }

    const propertiesCol = $app.findCollectionByNameOrId('properties')
    const syncedItems = []
    for (const [propId, url] of foundUrls.entries()) {
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
        const codeMatch = pageHtml.match(/C[óo]d\.?\s*([A-Za-z0-9\-_\s]+?)(?:<|\n|\r|$)/i)
        let code = codeMatch ? codeMatch[1].trim() : `BRF-${propId}`
        code = code.replace(/\s+/g, ' ').trim()

        // Known priority launches manual normalization by ID or URL
        if (propId === '329' || url.includes('/329/')) {
          code = 'LM 329'
        } else if (propId === '301' || url.includes('/301/')) {
          code = 'LM 301'
        } else if (propId === '295' || url.includes('/295/')) {
          code = 'LM 295'
        } else if (propId === '310' || url.includes('/310/')) {
          code = 'LM 310'
        } else if (propId === '330' || url.includes('/330/')) {
          code = 'LM 330'
        } else if (propId === '289' || url.includes('/289/')) {
          code = 'LM 289'
        } else if (propId === '311' || url.includes('/311/')) {
          code = 'LM 311'
        } else if (propId === '342' || url.includes('/342/')) {
          code = 'LM 342'
        }

        let title = ''
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
        if (!title) {
          const h2Match = pageHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
          if (h2Match) {
            title = h2Match[1].replace(/<[^>]+>/g, '').trim()
          }
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

        const cityMatch = pageHtml.match(/Cidade[\s\S]*?<[^>]+>([\s\S]*?)<\/[^>]+>/i)
        if (cityMatch) {
          const rawCity = cityMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/-\s*SC/i, '')
            .trim()
          if (rawCity && !containsJunkOrScript(rawCity)) {
            city = fixMojibake(rawCity)
          }
        }

        let propType = 'Apartamento'
        if (/casa|sobrado/i.test(title) || /casa/i.test(url)) {
          propType = 'Casa'
        } else if (/terreno|lote/i.test(title) || /terreno|area/i.test(url)) {
          propType = 'Terreno'
        } else if (/lançamento|lancamento/i.test(title) || /lancamento/i.test(url)) {
          propType = 'Lançamento'
        }

        let description = ''
        const descMatch =
          pageHtml.match(
            /<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
          ) || pageHtml.match(/<div[^>]*id=["']description["'][^>]*>([\s\S]*?)<\/div>/i)
        if (descMatch) {
          description = fixMojibake(
            descMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim(),
          )
          if (description.length > 500) description = description.substring(0, 500) + '...'
        }

        let existing = null
        try {
          existing = $app.findFirstRecordByData('properties', 'url', url)
        } catch (_) {}

        if (!existing) {
          try {
            existing = $app.findFirstRecordByData('properties', 'code', code)
          } catch (_) {}
        }

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
          continue
        }

        const rec = existing || new Record(propertiesCol)
        rec.set('code', code)
        rec.set('title', title)
        rec.set('url', url)
        rec.set('city', city || 'Florianópolis')
        rec.set('neighborhood', neighborhood || '')
        rec.set('property_type', propType)
        rec.set('transaction_type', 'Venda')
        rec.set('price', price)
        rec.set('price_formatted', priceFormatted || `R$ ${price.toLocaleString('pt-BR')}`)
        if (bedrooms > 0) rec.set('bedrooms', bedrooms)
        if (suites > 0) rec.set('suites', suites)
        if (bathrooms > 0) rec.set('bathrooms', bathrooms)
        if (parking > 0) rec.set('parking_spaces', parking)
        if (areaPriv > 0) rec.set('area_privativa', areaPriv)
        if (description && !rec.getString('description')) {
          rec.set('description', description)
        }
        rec.set('is_active', true)

        $app.save(rec)
        syncedCount++
        syncedItems.push({ code, title, neighborhood, city, price })
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
        `Sincronização manual completa executada: ${syncedCount} sincronizados com sucesso, ${skippedJunkCount} descartados, ${errorCount} erros`,
      )
      logRec.set(
        'payload',
        JSON.stringify({ synced: syncedCount, skipped_junk: skippedJunkCount, errors: errorCount }),
      )
      $app.saveNoValidate(logRec)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      total_urls: foundUrls.size,
      synced: syncedCount,
      skipped_junk: skippedJunkCount,
      errors: errorCount,
      sample: syncedItems.slice(0, 10),
    })
  } catch (err) {
    return e.json(500, { ok: false, error: String(err) })
  }
})

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
    const propertyUrlRegex = /https:\/\/www\.brfimoveis\.com\.br\/(\d+)\/imoveis\/([^\s<"']+)/g
    const foundUrls = new Map()

    let match
    while ((match = propertyUrlRegex.exec(sitemapText)) !== null) {
      const propId = match[1]
      let slug = match[2]
      if (slug.endsWith('/')) slug = slug.slice(0, -1)
      const fullUrl = `https://www.brfimoveis.com.br/${propId}/imoveis/${slug}`
      if (!foundUrls.has(propId)) {
        foundUrls.set(propId, fullUrl)
      }
    }

    // Also scan listings pages to discover any URLs not in sitemap
    const listingPages = [
      'https://www.brfimoveis.com.br/imoveis.php',
      'https://www.brfimoveis.com.br/',
      'https://www.brfimoveis.com.br/imobiliaria/imoveis/0/1',
      'https://www.brfimoveis.com.br/imobiliaria/imoveis/0/2',
    ]

    for (const lUrl of listingPages) {
      try {
        const lRes = $http.send({
          url: lUrl,
          method: 'GET',
          headers: { 'User-Agent': 'BRF-Imoveis-Sync/1.0' },
          timeout: 10,
        })
        if (lRes && lRes.statusCode === 200 && lRes.body) {
          const lHtml = decodeUtf8(lRes.body)
          const pRegex =
            /(?:https:\/\/www\.brfimoveis\.com\.br)?\/(\d+)\/imoveis\/([a-zA-Z0-9\-_]+)/g
          let pMatch
          while ((pMatch = pRegex.exec(lHtml)) !== null) {
            const pId = pMatch[1]
            const pSlug = pMatch[2]
            if (!foundUrls.has(pId)) {
              foundUrls.set(pId, `https://www.brfimoveis.com.br/${pId}/imoveis/${pSlug}`)
            }
          }
        }
      } catch (lErr) {
        console.warn(`[PROPERTIES_SYNC] Non-fatal listing fetch error (${lUrl}): ${String(lErr)}`)
      }
    }

    const propertiesCol = $app.findCollectionByNameOrId('properties')
    let processed = 0
    for (const [propId, url] of foundUrls.entries()) {
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
        const codeMatch = pageHtml.match(/C[óo]d\.?\s*([A-Za-z0-9\-_\s]+?)(?:<|\n|\r|$)/i)
        let code = codeMatch ? codeMatch[1].trim() : `BRF-${propId}`
        code = code.replace(/\s+/g, ' ').trim()

        let title = ''
        const h1Match = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].replace(/<[^>]+>/g, '').trim()
        }
        if (!title) {
          const h2Match = pageHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
          if (h2Match) {
            title = h2Match[1].replace(/<[^>]+>/g, '').trim()
          }
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

        const cityMatch = pageHtml.match(/Cidade[\s\S]*?<[^>]+>([\s\S]*?)<\/[^>]+>/i)
        if (cityMatch) {
          const rawCity = cityMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/-\s*SC/i, '')
            .trim()
          if (rawCity && !containsJunkOrScript(rawCity)) {
            city = fixMojibake(rawCity)
          }
        }

        let propType = 'Apartamento'
        if (/casa|sobrado/i.test(title) || /casa/i.test(url)) {
          propType = 'Casa'
        } else if (/terreno|lote/i.test(title) || /terreno|area/i.test(url)) {
          propType = 'Terreno'
        } else if (/lançamento|lancamento/i.test(title) || /lancamento/i.test(url)) {
          propType = 'Lançamento'
        }

        let description = ''
        const descMatch =
          pageHtml.match(
            /<div[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
          ) || pageHtml.match(/<div[^>]*id=["']description["'][^>]*>([\s\S]*?)<\/div>/i)
        if (descMatch) {
          description = fixMojibake(
            descMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim(),
          )
          if (description.length > 500) description = description.substring(0, 500) + '...'
        }

        let existing = null
        try {
          existing = $app.findFirstRecordByData('properties', 'code', code)
        } catch (_) {}

        if (!existing) {
          try {
            existing = $app.findFirstRecordByData('properties', 'url', url)
          } catch (_) {}
        }

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
        rec.set('city', city || 'Florianópolis')
        rec.set('neighborhood', neighborhood || '')
        rec.set('property_type', propType)
        rec.set('transaction_type', 'Venda')
        rec.set('price', price)
        rec.set('price_formatted', priceFormatted || `R$ ${price.toLocaleString('pt-BR')}`)
        if (bedrooms > 0) rec.set('bedrooms', bedrooms)
        if (suites > 0) rec.set('suites', suites)
        if (bathrooms > 0) rec.set('bathrooms', bathrooms)
        if (parking > 0) rec.set('parking_spaces', parking)
        if (areaPriv > 0) rec.set('area_privativa', areaPriv)
        if (description && !rec.getString('description')) {
          rec.set('description', description)
        }
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
