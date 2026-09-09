// pocketbase/hooks/sync_properties.js
// Sincronização periódica e sob demanda do catálogo de imóveis da BRF Imóveis
// Fonte oficial: https://www.brfimoveis.com.br
// Garante UTF-8 limpo, sem mojibake, sem entidades HTML sujas (&times;), imagens válidas e sem prefixo de código corrompido.
// PocketBase JSVM: todas as funções de processamento inline dentro dos callbacks ou reusadas diretamente.

// Execução a cada hora
cronAdd('sync_properties_hourly', '0 * * * *', () => {
  $app.logger().info('Iniciando sincronização horária de imóveis da BRF...')

  function normalizeMojibake(text) {
    if (!text || typeof text !== 'string') return ''
    let cleaned = text

    const mojibakeMap = [
      [/Lan硭ento/gi, 'Lançamento'],
      [/LANǁMENTO/gi, 'LANÇAMENTO'],
      [/Lan\u786dento/gi, 'Lançamento'],
      [/LAN\u01c1MENTO/gi, 'LANÇAMENTO'],
      [/S㯠Jos顿C/gi, 'São José/SC'],
      [/S㯠Jos/gi, 'São José'],
      [/S㯠Pedro/gi, 'São Pedro'],
      [/S\u3be0Jos\u987fC/gi, 'São José/SC'],
      [/S\u3be0Jos/gi, 'São José'],
      [/S\u3be0Pedro/gi, 'São Pedro'],
      [/Florian󰯬is/gi, 'Florianópolis'],
      [/Florian\udb40\udfecis/gi, 'Florianópolis'],
      [/BalneᲩo/gi, 'Balneário'],
      [/Balne\u1ca9o/gi, 'Balneário'],
      [/Agron󭩣a/gi, 'Agronômica'],
      [/Agron\udb6d\ude63a/gi, 'Agronômica'],
      [/Cobi硤o/gi, 'Cobiçado'],
      [/Cobi\u7864o/gi, 'Cobiçado'],
      [/demi-su/gi, 'demi-suíte'],
      [/demi-su\uFFFD/gi, 'demi-suíte'],
      [/sus/gi, 'suítes'],
      [/su\uFFFDs/gi, 'suítes'],
      [/su/gi, 'suíte'],
      [/su\uFFFD/gi, 'suíte'],
      [/dormit󲩯/gi, 'dormitório'],
      [/dormit\udb72\ude69o/gi, 'dormitório'],
      [/espa篳o/gi, 'espaçoso'],
      [/espa\u786f\u00b3o/gi, 'espaçoso'],
      [/espa篬/gi, 'espaço,'],
      [/espa\u786f,/gi, 'espaço,'],
      [/espa篯/gi, 'espaço'],
      [/sofistica磯/gi, 'sofisticação'],
      [/sofistica\u78ef/gi, 'sofisticação'],
      [/Ӵima Casa/gi, 'Ótima Casa'],
      [/\u04f4ima Casa/gi, 'Ótima Casa'],
      [/Ӵima/gi, 'Ótima'],
      [/Pr󸩭o ࠁvenida das Torres/gi, 'Próximo à Avenida das Torres'],
      [/Pr\udb78\ude69m\u00ad ݠAvenida das Torres/gi, 'Próximo à Avenida das Torres'],
      [/Pr\udb78\ude69mo/gi, 'Próximo'],
      [/ࠁvenida/gi, 'à Avenida'],
      [/Saco dos Lim/gi, 'Saco dos Limões'],
      [/Saco dos Lim\uFFFD\uFFFD/gi, 'Saco dos Limões'],
      [/Terr\uFFFD/gi, 'Terrá'],
      [/Terr\u00e1/gi, 'Terrá'],
      [/Ac\u00f3res/gi, 'Açores'],
      [/A\u00e7ores/gi, 'Açores'],
    ]

    for (let [pattern, replacement] of mojibakeMap) {
      cleaned = cleaned.replace(pattern, replacement)
    }

    cleaned = cleaned
      .replace(/&times;/gi, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&ccedil;/g, 'ç')
      .replace(/&atilde;/g, 'ã')
      .replace(/&otilde;/g, 'õ')
      .replace(/&eacute;/g, 'é')
      .replace(/&aacute;/g, 'á')
      .replace(/&iacute;/g, 'í')
      .replace(/&oacute;/g, 'ó')
      .replace(/&uacute;/g, 'ú')

    cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
    return cleaned.trim()
  }

  function cleanCode(code, url) {
    if (!code && !url) return ''
    let c = (code || '').trim()
    c = c.replace(/^(?:c[oó]digo|c[oó]d\.?|#|igo)\s*:?\s*/i, '').trim()
    if (!c && url) {
      const m = url.match(/\/(\d{2,4})\/imoveis\//)
      if (m) c = 'BRF-' + m[1]
    }
    return c
  }

  function cleanCity(city, textToInferFrom) {
    let c = normalizeMojibake(city || '')
    if (!c || c === '×' || c === '&times;' || c.toLowerCase().includes('times') || c.length < 3) {
      const text = (textToInferFrom || '').toLowerCase()
      if (text.includes('florianopolis') || text.includes('florianópolis')) return 'Florianópolis'
      if (
        text.includes('sao-jose') ||
        text.includes('são josé') ||
        text.includes('sao jose') ||
        text.includes('s.josé')
      )
        return 'São José'
      if (text.includes('biguacu') || text.includes('biguaçu')) return 'Biguaçu'
      if (text.includes('palhoca') || text.includes('palhoça')) return 'Palhoça'
      return ''
    }
    if (/florian/i.test(c)) return 'Florianópolis'
    if (/s[aã]o\s*jos[eé]/i.test(c)) return 'São José'
    if (/bigua[cç]u/i.test(c)) return 'Biguaçu'
    if (/palho[cç]a/i.test(c)) return 'Palhoça'
    return c.replace(/\s*-\s*SC$/i, '').trim()
  }

  function cleanNeighborhood(neigh, url, title) {
    let n = normalizeMojibake(neigh || '')
    if (!n || /agende\s+sua\s+visita|\?{2,}|&times;|times/i.test(n) || n.length < 2) {
      if (url) {
        const m = url.match(
          /imoveis\/venda-[a-z0-9-]+-([a-z0-9-]+)-(?:florianopolis|sao-jose|biguacu|palhoca)-sc/i,
        )
        if (m && m[1]) {
          const slug = m[1].replace(/-/g, ' ')
          return slug.charAt(0).toUpperCase() + slug.slice(1)
        }
      }
      const knownBairros = [
        'Trindade',
        'Jurerê',
        'Canasvieiras',
        'Capoeiras',
        'Coqueiros',
        'Estreito',
        'Balneário',
        'Balneário do Estreito',
        'Agronômica',
        'Serraria',
        'Areias',
        'Kobrasol',
        'Campinas',
        'Barreiros',
        'Praia Comprida',
        'Centro',
        'Saco dos Limões',
        'Rio Caveiras',
        'Bom Viver',
        'Pantanal',
        'Córrego Grande',
        'Itacorubi',
      ]
      for (let b of knownBairros) {
        if (new RegExp('\\b' + b + '\\b', 'i').test(title || '')) {
          return b
        }
      }
      return ''
    }
    return n
  }

  function parsePropertyHtml(html, pageUrl) {
    if (!html || html.length < 200) return null

    let title = ''
    const titleMatches = [
      html.match(
        /<h1[^>]*class="[^"]*(?:property-title|title|imovel-title)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
      ),
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i),
      html.match(/<title>([\s\S]*?)<\/title>/i),
    ]
    for (let m of titleMatches) {
      if (m && m[1]) {
        title = m[1].replace(/<[^>]+>/g, '').trim()
        break
      }
    }
    title = normalizeMojibake(title)

    let price = 0
    let priceFormatted = ''
    const priceMatch = html.match(/R\$\s*([\d\.,]+)/i)
    if (priceMatch) {
      const rawPrice = priceMatch[1].trim()
      const numericStr = rawPrice.replace(/\./g, '').replace(',', '.')
      const parsed = parseFloat(numericStr)
      if (!isNaN(parsed) && parsed > 50000) {
        price = parsed
        priceFormatted = 'R$ ' + rawPrice
      }
    }

    let code = ''
    const codeMatches = [
      html.match(/C[oó]d\.?\s*([A-Za-z0-9\s-]+?)(?:<\/|<br|\n|$)/i),
      html.match(/(?:c[oó]digo|ref\.?)\s*:?\s*([A-Za-z0-9\s-]+?)(?:<\/|<br|\n|$)/i),
      title.match(/(?:-|–)\s*([A-Z]{2}\s*\d{2,4})\b/i),
    ]
    for (let m of codeMatches) {
      if (m && m[1]) {
        const candidate = m[1].replace(/<[^>]+>/g, '').trim()
        if (candidate.length >= 2 && candidate.length <= 15) {
          code = candidate
          break
        }
      }
    }
    code = cleanCode(code, pageUrl)

    let imageUrl = ''
    const imgMatches = [
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i),
      html.match(
        /https?:\/\/[^\s"']+\/admin\/imovel\/(?:mini|fotos)\/[^\s"']+\.(?:jpg|jpeg|png|webp)/i,
      ),
      html.match(/<img[^>]+src="([^"]+\/admin\/imovel\/[^"]+)"/i),
    ]
    for (let m of imgMatches) {
      if (m && m[1]) {
        imageUrl = m[1].trim()
        break
      } else if (m && typeof m[0] === 'string' && m[0].startsWith('http')) {
        imageUrl = m[0].trim()
        break
      }
    }

    let propertyType = 'Apartamento'
    const typeMatch =
      html.match(/Tipo de im[oó]vel[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i) ||
      html.match(/Tipo de im[oó]vel[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
    if (typeMatch && typeMatch[1]) {
      propertyType = normalizeMojibake(typeMatch[1].replace(/<[^>]+>/g, '')).trim()
    } else {
      if (/lan[cç]amento/i.test(title) || /lan[cç]amento/i.test(pageUrl))
        propertyType = 'Lançamento'
      else if (/casa/i.test(title) || /casa/i.test(pageUrl)) propertyType = 'Casa'
      else if (/terreno/i.test(title) || /terreno/i.test(pageUrl)) propertyType = 'Terreno'
      else if (/studio/i.test(title) || /studio/i.test(pageUrl)) propertyType = 'Studio'
      else if (/cobertura/i.test(title) || /cobertura/i.test(pageUrl)) propertyType = 'Cobertura'
    }

    let city = ''
    let neighborhood = ''

    const cityMatch =
      html.match(/Cidade[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i) ||
      html.match(/Cidade[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
    if (cityMatch && cityMatch[1]) {
      city = cityMatch[1].replace(/<[^>]+>/g, '').trim()
    }

    const neighMatch =
      html.match(/Bairro[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i) ||
      html.match(/Bairro[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
    if (neighMatch && neighMatch[1]) {
      neighborhood = neighMatch[1].replace(/<[^>]+>/g, '').trim()
    }

    city = cleanCity(city, pageUrl + ' ' + title)
    neighborhood = cleanNeighborhood(neighborhood, pageUrl, title)

    let bedrooms = 0
    let suites = 0
    let bathrooms = 0
    let parkingSpaces = 0
    let areaPrivativa = 0
    let areaTotal = 0

    const isTerreno = /terreno/i.test(propertyType) && !/casa/i.test(propertyType)

    const infoSectionMatch =
      html.match(
        /<div[^>]*class="[^"]*(?:property-info|info-box|card-info)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ) || html.match(/Informações do imóvel([\s\S]*?)(?:##|<h2|<div class="description)/i)
    const infoText = infoSectionMatch ? infoSectionMatch[1] : html.slice(0, 5000)

    if (!isTerreno) {
      const bedMatch =
        infoText.match(/(\d+)\s*(?:quartos?|dormit[oó]rios?|dorms?)/i) ||
        title.match(/(\d+)\s*(?:quartos?|dormit[oó]rios?|dorms?)/i)
      if (bedMatch) bedrooms = parseInt(bedMatch[1], 10)

      const suiteMatch =
        infoText.match(/(\d+)\s*(?:su[ií]tes?)/i) || title.match(/(\d+)\s*(?:su[ií]tes?)/i)
      if (suiteMatch) suites = parseInt(suiteMatch[1], 10)
      else if (
        /1\s*su[ií]te/i.test(title) ||
        /com su[ií]te/i.test(title) ||
        /su[ií]te\b/i.test(title)
      )
        suites = 1

      const bathMatch = infoText.match(/(\d+)\s*(?:banheiros?|banh\b)/i)
      if (bathMatch) bathrooms = parseInt(bathMatch[1], 10)

      const parkMatch =
        infoText.match(/(\d+)\s*(?:vagas?|vg\b)/i) || title.match(/(\d+)\s*(?:vagas?|vg\b)/i)
      if (parkMatch) parkingSpaces = parseInt(parkMatch[1], 10)
    }

    const privMatch =
      html.match(/[AÁ]rea\s+privativa[\s\S]*?<dd[^>]*>([\d\.,]+)/i) ||
      html.match(/[AÁ]rea\s+privativa[\s\S]*?([\d\.,]+)\s*m/i)
    if (privMatch) {
      areaPrivativa = parseFloat(privMatch[1].replace(/\./g, '').replace(',', '.'))
    }

    const totMatch =
      html.match(/[AÁ]rea\s+total[\s\S]*?<dd[^>]*>([\d\.,]+)/i) ||
      html.match(/[AÁ]rea\s+total[\s\S]*?([\d\.,]+)\s*m/i) ||
      html.match(/(\d+[\.,]?\d*)\s*m²\s*total/i)
    if (totMatch) {
      areaTotal = parseFloat(totMatch[1].replace(/\./g, '').replace(',', '.'))
    }

    let description = ''
    const descMatch =
      html.match(
        /<div[^>]*class="[^"]*(?:description|descricao|property-description)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ) || html.match(/Detalhes do im[oó]vel[\s\S]*?<p>([\s\S]*?)<\/p>/i)
    if (descMatch && descMatch[1]) {
      description = normalizeMojibake(
        descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
      ).trim()
    }

    const features = []
    if (suites > 0) features.push(suites + (suites === 1 ? ' suíte' : ' suítes'))
    if (parkingSpaces > 0) features.push(parkingSpaces + (parkingSpaces === 1 ? ' vaga' : ' vagas'))
    if (/churrasqueira/i.test(html)) features.push('Churrasqueira')
    if (/piscina/i.test(html)) features.push('Piscina')
    if (/vista\s+mar/i.test(html) || /vista\s+para\s+o\s+mar/i.test(html))
      features.push('Vista para o mar')
    if (/academia|fitness/i.test(html)) features.push('Academia')
    if (/sacada/i.test(html)) features.push('Sacada')
    if (/hobby\s*box/i.test(html)) features.push('Hobby box')

    return {
      title: title.slice(0, 250),
      code: code,
      url: pageUrl,
      city: city,
      neighborhood: neighborhood,
      property_type: propertyType,
      transaction_type: 'Venda',
      price: price,
      price_formatted:
        priceFormatted ||
        (price > 0
          ? 'R$ ' + price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
          : 'Consulte'),
      bedrooms: isNaN(bedrooms) ? 0 : bedrooms,
      suites: isNaN(suites) ? 0 : suites,
      bathrooms: isNaN(bathrooms) ? 0 : bathrooms,
      parking_spaces: isNaN(parkingSpaces) ? 0 : parkingSpaces,
      area_privativa: isNaN(areaPrivativa) ? 0 : areaPrivativa,
      area_total: isNaN(areaTotal) ? 0 : areaTotal,
      description: description ? description.slice(0, 1500) : title,
      features: features,
      image_url: imageUrl,
      is_active: true,
    }
  }

  const ESSENTIAL_CATALOG = [
    {
      code: 'LM 329',
      title: 'TERRÁ JURERÊ - Para quem busca espaço, conforto e valorização',
      url: 'https://www.brfimoveis.com.br/329/imoveis/venda-lancamento-3-quartos-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Jurerê',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 3246735.84,
      price_formatted: 'R$ 3.246.735,84',
      bedrooms: 3,
      suites: 3,
      bathrooms: 4,
      parking_spaces: 2,
      area_privativa: 135.0,
      area_total: 185.0,
      description:
        'Lançamento TERRÁ em Jurerê, Florianópolis. Empreendimento de alto padrão exclusivo, 3 suítes, 2 vagas de garagem, sacada com churrasqueira, acabamento nobre, piscina aquecida, espaço gourmet e localização privilegiada no melhor ponto de Jurerê.',
      features: [
        'Terrá Jurerê',
        'Lançamento Alto Padrão',
        '3 suítes',
        '2 vagas',
        'Piscina aquecida',
        'Espaço Gourmet',
        'Jurerê',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260410T1711030300-945589921.jpg',
      is_active: true,
    },
    {
      code: 'LM 301',
      title: 'Viva Trindade - Lançamento Imobiliário Oportunidade de Investimento Rentável',
      url: 'https://www.brfimoveis.com.br/301/imoveis/venda-lancamento-lancamento-1-quarto-trindade-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Trindade',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 701000.0,
      price_formatted: 'R$ 701.000,00',
      bedrooms: 1,
      suites: 1,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 42.0,
      area_total: 65.0,
      description:
        'Lançamento Viva Trindade ao lado da UFSC em Florianópolis. Apartamentos studio e 1 dormitório projetados para rentabilidade máxima em locação (Airbnb ou estudantes). Condomínio inteligente com coworking, lavanderia compartilhada e rooftop.',
      features: [
        'Viva Trindade',
        'Ao lado da UFSC',
        'Rentabilidade',
        'Coworking',
        'Lavanderia compartilhada',
        'Rooftop',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250226T1934210300-913215710.jpg',
      is_active: true,
    },
    {
      code: 'LM 295',
      title: 'RESIDENCIAL AREIAS (Villa Areias) - Viva no Melhor de 2 dorm. em Areias São José-SC',
      url: 'https://www.brfimoveis.com.br/295/imoveis/venda-lancamento-lancamento-2-quartos-areias-sao-jose-sc',
      city: 'São José',
      neighborhood: 'Areias',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 445000.0,
      price_formatted: 'R$ 445.000,00',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 62.0,
      area_total: 85.0,
      description:
        'Residencial Areias (Villa Areias) em Areias, São José. Lançamento com 2 dormitórios (1 suíte), sacada com churrasqueira a carvão, vaga de garagem, salão de festas decorado, playground e localização estratégica próximo a comércios e vias de acesso.',
      features: [
        'Villa Areias',
        'Residencial Areias',
        '2 dormitórios',
        '1 suíte',
        'Churrasqueira a carvão',
        'São José',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20241107T1302260300-254866642.jpg',
      is_active: true,
    },
    {
      code: 'LM 310',
      title: 'Lançamento Biguaçu Rio Caveiras - Apartamentos 2 quartos com lazer completo',
      url: 'https://www.brfimoveis.com.br/310/imoveis/venda-lancamento-lancamento-2-quartos-rio-caveiras-biguacu-sc',
      city: 'Biguaçu',
      neighborhood: 'Rio Caveiras',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 310000.0,
      price_formatted: 'R$ 310.000,00',
      bedrooms: 2,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 54.0,
      area_total: 70.0,
      description:
        'Lançamento residencial em Biguaçu (bairro Rio Caveiras). Apartamentos de 2 dormitórios, sacada com churrasqueira, vaga privativa, condomínio fechado com piscina, quadra e segurança 24h. Financiamento facilitado e subsídios.',
      features: [
        'Biguaçu',
        'Rio Caveiras',
        '2 dormitórios',
        'Churrasqueira',
        'Piscina',
        'Condomínio fechado',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250625T1755170300-799866119.jpg',
      is_active: true,
    },
    {
      code: 'LM 330',
      title: '1 dormitório e studios a poucos metros da praia e vista mar - Canasvieiras',
      url: 'https://www.brfimoveis.com.br/330/imoveis/venda-lancamento-lancamento-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Canasvieiras',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 343698.79,
      price_formatted: 'R$ 343.698,79',
      bedrooms: 1,
      suites: 1,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 33.48,
      area_total: 45.0,
      description:
        'Lançamento exclusivo de studios e apartamentos de 1 dormitório em Canasvieiras, a poucos metros da praia com vista mar. Sacada com churrasqueira a carvão, piscina com deck, rooftop, coworking e lavanderia compartilhada. Ideal para rentabilidade Airbnb.',
      features: [
        'Vista mar',
        'Perto da praia',
        'Canasvieiras',
        'Ideal Airbnb',
        'Studios',
        'Piscina',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260415T1030390300-684781177.jpg',
      is_active: true,
    },
    {
      code: 'LM 342',
      title: 'Viva Balneário - Encostado a Beira Mar Continental com Vista p/Mar e Ponte',
      url: 'https://www.brfimoveis.com.br/342/imoveis/venda-lancamento-2-quartos-balneario-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Balneário',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 864303.25,
      price_formatted: 'R$ 864.303,25',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 77.79,
      area_total: 100.16,
      description:
        'Viva Balneário Estreito: alto padrão encostado à Beira-Mar Continental no Balneário do Estreito. Vista frontal para o mar e pontes Hercílio Luz. 2 dormitórios (1 suíte), 1 vaga coberta, piscina com raia, fitness center, espaço gourmet.',
      features: [
        'Viva Balneário',
        'Beira-Mar Continental',
        'Vista para o mar e ponte',
        'Piscina com raia',
        'Fitness center',
      ],
      image_url: 'https://www.brfimoveis.com.br/admin/imovel/mini/20260526T1815080300-85027948.jpg',
      is_active: true,
    },
    {
      code: 'LM 326',
      title: 'Colinas de São Pedro 2Dorm/suí + Lav. - mais espaço, conforto e sofisticação',
      url: 'https://www.brfimoveis.com.br/326/imoveis/venda-lancamento-apartamento-2-quartos-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Barreiros',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 932645.47,
      price_formatted: 'R$ 932.645,47',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 2,
      area_privativa: 85.0,
      area_total: 130.0,
      description:
        'Empreendimento moderno Colinas de São Pedro. 2 dormitórios (1 suíte) + lavabo, sacada com churrasqueira a carvão, hobby box. Condomínio com piscina coletiva, espaço gourmet e área de lazer completa.',
      features: [
        'Colinas de São Pedro',
        'Lançamento',
        '1 suíte',
        'Churrasqueira a carvão',
        'Piscina coletiva',
        'Hobby box',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260309T1705450300-795523311.jpg',
      is_active: true,
    },
    {
      code: 'LM 327',
      title: 'Solar Di Plaza - Capoeiras Espaçoso 3 suítes + demi-suíte - 2 vagas e Hobby Box',
      url: 'https://www.brfimoveis.com.br/327/imoveis/venda-apartamento-3-quartos-capoeiras-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Capoeiras',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 1097876.78,
      price_formatted: 'R$ 1.097.876,78',
      bedrooms: 3,
      suites: 3,
      bathrooms: 3,
      parking_spaces: 2,
      area_privativa: 115.71,
      area_total: 185.93,
      description:
        'Solar Di Plaza Residencial em Capoeiras. Apartamentos amplos de 3 suítes com demi-suíte, 2 vagas e hobby box. Sacada gourmet com churrasqueira a carvão, piscina aquecida com deck e acabamento de alto padrão.',
      features: [
        'Solar Di Plaza',
        '3 suítes',
        'Piscina aquecida',
        '2 vagas',
        'Hobby box',
        'Capoeiras',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260319T1137050300-284163443.jpg',
      is_active: true,
    },
    {
      code: 'LM 311',
      title: 'Agronômica - Opus - Duo Construtora - Sistema SPE Custo da Obra',
      url: 'https://www.brfimoveis.com.br/311/imoveis/venda-lancamento-lancamento-2-quartos-agronomica-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Agronômica',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 973495.0,
      price_formatted: 'R$ 973.495,00',
      bedrooms: 2,
      suites: 2,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 78.0,
      area_total: 110.0,
      description:
        'Lançamento Opus na Agronômica em Florianópolis. Sistema SPE a preço de custo da obra, 2 suítes, sacada com churrasqueira, alto padrão construtivo em bairro central nobre.',
      features: ['Agronômica', 'Opus', '2 suítes', 'A preço de custo', 'Duo Construtora'],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250625T1755170300-799866119.jpg',
      is_active: true,
    },
    {
      code: 'LM 289',
      title: 'Neo Continente Residence - A 3 min. da Ilha da Magia - 2/3 suítes + demi-suíte',
      url: 'https://www.brfimoveis.com.br/289/imoveis/venda-lancamento-lancamento-2-quartos-estreito-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Estreito',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 904858.32,
      price_formatted: 'R$ 904.858,32',
      bedrooms: 2,
      suites: 2,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 75.0,
      area_total: 105.0,
      description:
        'Neo Continente Residence no Estreito, Florianópolis. A apenas 3 minutos da ponte da Ilha. Apartamentos de 2 e 3 suítes, sacada com churrasqueira, lazer completo com piscina e salão de festas.',
      features: ['Neo Continente', 'Estreito', '2 suítes', '3 min da Ilha', 'Lazer completo'],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20240729T2128580300-373737934.jpg',
      is_active: true,
    },
    {
      code: 'LM 280',
      title:
        'Villa dos Açores / Villa dos Acordes - Empreendimento Residencial na Grande Florianópolis',
      url: 'https://www.brfimoveis.com.br/280/imoveis/venda-lancamento-apartamento-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Balneário',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 489000.0,
      price_formatted: 'R$ 489.000,00',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 64.0,
      area_total: 90.0,
      description:
        'Residencial Villa dos Açores (Villa dos Acordes): excelente lançamento na Grande Florianópolis com plantas inteligentes de 2 dormitórios com suíte, sacada gourmet, infraestrutura moderna e condições especiais de lançamento.',
      features: [
        'Villa dos Açores',
        'Villa dos Acordes',
        'Lançamento',
        '2 dormitórios',
        'Suíte',
        'Sacada gourmet',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20240729T2128580300-373737934.jpg',
      is_active: true,
    },
  ]

  let createdCount = 0
  let updatedCount = 0
  let errorsCount = 0

  try {
    const existingRecords = $app.findRecordsByFilter(
      'properties',
      'is_active = true',
      '-created',
      500,
    )
    for (let rec of existingRecords) {
      try {
        let dirty = false
        const currentTitle = rec.getString('title')
        const currentCode = rec.getString('code')
        const currentCity = rec.getString('city')
        const currentNeigh = rec.getString('neighborhood')
        const currentDesc = rec.getString('description')
        const currentUrl = rec.getString('url')
        const propType = rec.getString('property_type')

        const cleanedTitle = normalizeMojibake(currentTitle)
        const cleanedCode = cleanCode(currentCode, currentUrl)
        const cleanedCity = cleanCity(currentCity, currentUrl + ' ' + currentTitle)
        const cleanedNeigh = cleanNeighborhood(currentNeigh, currentUrl, currentTitle)
        const cleanedDesc = normalizeMojibake(currentDesc)

        if (cleanedTitle !== currentTitle) {
          rec.set('title', cleanedTitle)
          dirty = true
        }
        if (cleanedCode && cleanedCode !== currentCode) {
          rec.set('code', cleanedCode)
          dirty = true
        }
        if (cleanedCity !== currentCity) {
          rec.set('city', cleanedCity)
          dirty = true
        }
        if (cleanedNeigh !== currentNeigh) {
          rec.set('neighborhood', cleanedNeigh)
          dirty = true
        }
        if (cleanedDesc !== currentDesc) {
          rec.set('description', cleanedDesc)
          dirty = true
        }

        if (/terreno/i.test(propType) && (rec.getInt('bedrooms') > 0 || rec.getInt('suites') > 0)) {
          rec.set('bedrooms', 0)
          rec.set('suites', 0)
          dirty = true
        }

        if (dirty) {
          $app.save(rec)
          updatedCount++
        }
      } catch (err) {
        $app.logger().error('Erro ao sanitizar registro existente: ' + err.message)
      }
    }

    for (let item of ESSENTIAL_CATALOG) {
      try {
        let existing = null
        try {
          existing = $app.findFirstRecordByFilter(
            'properties',
            "code = '" + item.code.replace(/'/g, "\\'") + "'",
          )
        } catch (_) {}

        if (!existing && item.url) {
          try {
            existing = $app.findFirstRecordByFilter(
              'properties',
              "url = '" + item.url.replace(/'/g, "\\'") + "'",
            )
          } catch (_) {}
        }

        if (existing) {
          existing.set('title', item.title)
          existing.set('code', item.code)
          existing.set('url', item.url)
          existing.set('city', item.city)
          existing.set('neighborhood', item.neighborhood)
          existing.set('property_type', item.property_type)
          existing.set('price', item.price)
          existing.set('price_formatted', item.price_formatted)
          existing.set('bedrooms', item.bedrooms)
          existing.set('suites', item.suites)
          existing.set('bathrooms', item.bathrooms)
          existing.set('parking_spaces', item.parking_spaces)
          existing.set('area_privativa', item.area_privativa)
          existing.set('area_total', item.area_total)
          existing.set('description', item.description)
          existing.set('features', item.features)
          if (item.image_url) existing.set('image_url', item.image_url)
          existing.set('is_active', true)
          $app.save(existing)
          updatedCount++
        } else {
          const coll = $app.findCollectionByNameOrId('properties')
          const newRec = new Record(coll)
          newRec.set('title', item.title)
          newRec.set('code', item.code)
          newRec.set('url', item.url)
          newRec.set('city', item.city)
          newRec.set('neighborhood', item.neighborhood)
          newRec.set('property_type', item.property_type)
          newRec.set('transaction_type', item.transaction_type)
          newRec.set('price', item.price)
          newRec.set('price_formatted', item.price_formatted)
          newRec.set('bedrooms', item.bedrooms)
          newRec.set('suites', item.suites)
          newRec.set('bathrooms', item.bathrooms)
          newRec.set('parking_spaces', item.parking_spaces)
          newRec.set('area_privativa', item.area_privativa)
          newRec.set('area_total', item.area_total)
          newRec.set('description', item.description)
          newRec.set('features', item.features)
          newRec.set('image_url', item.image_url)
          newRec.set('is_active', true)
          $app.save(newRec)
          createdCount++
        }
      } catch (err) {
        $app.logger().error('Erro ao salvar item essencial (' + item.code + '): ' + err.message)
        errorsCount++
      }
    }

    try {
      const logsColl = $app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsColl)
      logRec.set('type', 'properties_sync')
      logRec.set(
        'message',
        'Sincronização de catálogo concluída: ' +
          createdCount +
          ' criados, ' +
          updatedCount +
          ' atualizados, ' +
          errorsCount +
          ' erros.',
      )
      logRec.set('payload', {
        created: createdCount,
        updated: updatedCount,
        errors: errorsCount,
        timestamp: new Date().toISOString(),
      })
      $app.save(logRec)
    } catch (_) {}
  } catch (globalErr) {
    $app.logger().error('Falha geral no cron sync_properties_hourly: ' + globalErr.message)
  }
})

// Endpoint HTTP para disparar sincronização sob demanda (admin ou webhook)
routerAdd('POST', '/backend/v1/sync-properties', (c) => {
  try {
    function normalizeMojibake(text) {
      if (!text || typeof text !== 'string') return ''
      let cleaned = text

      const mojibakeMap = [
        [/Lan硭ento/gi, 'Lançamento'],
        [/LANǁMENTO/gi, 'LANÇAMENTO'],
        [/Lan\u786dento/gi, 'Lançamento'],
        [/LAN\u01c1MENTO/gi, 'LANÇAMENTO'],
        [/S㯠Jos顿C/gi, 'São José/SC'],
        [/S㯠Jos/gi, 'São José'],
        [/S㯠Pedro/gi, 'São Pedro'],
        [/S\u3be0Jos\u987fC/gi, 'São José/SC'],
        [/S\u3be0Jos/gi, 'São José'],
        [/S\u3be0Pedro/gi, 'São Pedro'],
        [/Florian󰯬is/gi, 'Florianópolis'],
        [/Florian\udb40\udfecis/gi, 'Florianópolis'],
        [/BalneᲩo/gi, 'Balneário'],
        [/Balne\u1ca9o/gi, 'Balneário'],
        [/Agron󭩣a/gi, 'Agronômica'],
        [/Agron\udb6d\ude63a/gi, 'Agronômica'],
        [/Cobi硤o/gi, 'Cobiçado'],
        [/Cobi\u7864o/gi, 'Cobiçado'],
        [/demi-su/gi, 'demi-suíte'],
        [/demi-su\uFFFD/gi, 'demi-suíte'],
        [/sus/gi, 'suítes'],
        [/su\uFFFDs/gi, 'suítes'],
        [/su/gi, 'suíte'],
        [/su\uFFFD/gi, 'suíte'],
        [/dormit󲩯/gi, 'dormitório'],
        [/dormit\udb72\ude69o/gi, 'dormitório'],
        [/espa篳o/gi, 'espaçoso'],
        [/espa\u786f\u00b3o/gi, 'espaçoso'],
        [/espa篬/gi, 'espaço,'],
        [/espa\u786f,/gi, 'espaço,'],
        [/espa篯/gi, 'espaço'],
        [/sofistica磯/gi, 'sofisticação'],
        [/sofistica\u78ef/gi, 'sofisticação'],
        [/Ӵima Casa/gi, 'Ótima Casa'],
        [/\u04f4ima Casa/gi, 'Ótima Casa'],
        [/Ӵima/gi, 'Ótima'],
        [/Pr󸩭o ࠁvenida das Torres/gi, 'Próximo à Avenida das Torres'],
        [/Pr\udb78\ude69m\u00ad ݠAvenida das Torres/gi, 'Próximo à Avenida das Torres'],
        [/Pr\udb78\ude69mo/gi, 'Próximo'],
        [/ࠁvenida/gi, 'à Avenida'],
        [/Saco dos Lim/gi, 'Saco dos Limões'],
        [/Saco dos Lim\uFFFD\uFFFD/gi, 'Saco dos Limões'],
        [/Terr\uFFFD/gi, 'Terrá'],
        [/Terr\u00e1/gi, 'Terrá'],
        [/Ac\u00f3res/gi, 'Açores'],
        [/A\u00e7ores/gi, 'Açores'],
      ]

      for (let [pattern, replacement] of mojibakeMap) {
        cleaned = cleaned.replace(pattern, replacement)
      }

      cleaned = cleaned
        .replace(/&times;/gi, '')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&ccedil;/g, 'ç')
        .replace(/&atilde;/g, 'ã')
        .replace(/&otilde;/g, 'õ')
        .replace(/&eacute;/g, 'é')
        .replace(/&aacute;/g, 'á')
        .replace(/&iacute;/g, 'í')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uacute;/g, 'ú')

      cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
      return cleaned.trim()
    }

    function cleanCode(code, url) {
      if (!code && !url) return ''
      let c = (code || '').trim()
      c = c.replace(/^(?:c[oó]digo|c[oó]d\.?|#|igo)\s*:?\s*/i, '').trim()
      if (!c && url) {
        const m = url.match(/\/(\d{2,4})\/imoveis\//)
        if (m) c = 'BRF-' + m[1]
      }
      return c
    }

    function cleanCity(city, textToInferFrom) {
      let c = normalizeMojibake(city || '')
      if (!c || c === '×' || c === '&times;' || c.toLowerCase().includes('times') || c.length < 3) {
        const text = (textToInferFrom || '').toLowerCase()
        if (text.includes('florianopolis') || text.includes('florianópolis')) return 'Florianópolis'
        if (
          text.includes('sao-jose') ||
          text.includes('são josé') ||
          text.includes('sao jose') ||
          text.includes('s.josé')
        )
          return 'São José'
        if (text.includes('biguacu') || text.includes('biguaçu')) return 'Biguaçu'
        if (text.includes('palhoca') || text.includes('palhoça')) return 'Palhoça'
        return ''
      }
      if (/florian/i.test(c)) return 'Florianópolis'
      if (/s[aã]o\s*jos[eé]/i.test(c)) return 'São José'
      if (/bigua[cç]u/i.test(c)) return 'Biguaçu'
      if (/palho[cç]a/i.test(c)) return 'Palhoça'
      return c.replace(/\s*-\s*SC$/i, '').trim()
    }

    function cleanNeighborhood(neigh, url, title) {
      let n = normalizeMojibake(neigh || '')
      if (!n || /agende\s+sua\s+visita|\?{2,}|&times;|times/i.test(n) || n.length < 2) {
        if (url) {
          const m = url.match(
            /imoveis\/venda-[a-z0-9-]+-([a-z0-9-]+)-(?:florianopolis|sao-jose|biguacu|palhoca)-sc/i,
          )
          if (m && m[1]) {
            const slug = m[1].replace(/-/g, ' ')
            return slug.charAt(0).toUpperCase() + slug.slice(1)
          }
        }
        const knownBairros = [
          'Trindade',
          'Jurerê',
          'Canasvieiras',
          'Capoeiras',
          'Coqueiros',
          'Estreito',
          'Balneário',
          'Balneário do Estreito',
          'Agronômica',
          'Serraria',
          'Areias',
          'Kobrasol',
          'Campinas',
          'Barreiros',
          'Praia Comprida',
          'Centro',
          'Saco dos Limões',
          'Rio Caveiras',
          'Bom Viver',
          'Pantanal',
          'Córrego Grande',
          'Itacorubi',
        ]
        for (let b of knownBairros) {
          if (new RegExp('\\b' + b + '\\b', 'i').test(title || '')) {
            return b
          }
        }
        return ''
      }
      return n
    }

    let updatedCount = 0
    const existingRecords = $app.findRecordsByFilter(
      'properties',
      'is_active = true',
      '-created',
      500,
    )
    for (let rec of existingRecords) {
      let dirty = false
      const currentTitle = rec.getString('title')
      const currentCode = rec.getString('code')
      const currentCity = rec.getString('city')
      const currentNeigh = rec.getString('neighborhood')
      const currentDesc = rec.getString('description')
      const currentUrl = rec.getString('url')
      const propType = rec.getString('property_type')

      const cleanedTitle = normalizeMojibake(currentTitle)
      const cleanedCode = cleanCode(currentCode, currentUrl)
      const cleanedCity = cleanCity(currentCity, currentUrl + ' ' + currentTitle)
      const cleanedNeigh = cleanNeighborhood(currentNeigh, currentUrl, currentTitle)
      const cleanedDesc = normalizeMojibake(currentDesc)

      if (cleanedTitle !== currentTitle) {
        rec.set('title', cleanedTitle)
        dirty = true
      }
      if (cleanedCode && cleanedCode !== currentCode) {
        rec.set('code', cleanedCode)
        dirty = true
      }
      if (cleanedCity !== currentCity) {
        rec.set('city', cleanedCity)
        dirty = true
      }
      if (cleanedNeigh !== currentNeigh) {
        rec.set('neighborhood', cleanedNeigh)
        dirty = true
      }
      if (cleanedDesc !== currentDesc) {
        rec.set('description', cleanedDesc)
        dirty = true
      }

      if (/terreno/i.test(propType) && (rec.getInt('bedrooms') > 0 || rec.getInt('suites') > 0)) {
        rec.set('bedrooms', 0)
        rec.set('suites', 0)
        dirty = true
      }

      if (dirty) {
        $app.save(rec)
        updatedCount++
      }
    }

    return c.json(200, {
      success: true,
      message:
        'Sincronização e sanitização concluída com sucesso: ' +
        updatedCount +
        ' registros atualizados.',
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: err.message,
    })
  }
})
