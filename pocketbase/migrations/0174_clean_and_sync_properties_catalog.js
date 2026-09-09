// pocketbase/migrations/0174_clean_and_sync_properties_catalog.js
// Migration que limpa mojibake, remove prefixos inválidos 'igo ', conserta cidades/bairros
// e insere/atualiza todos os lançamentos oficiais da BRF Imóveis (Terrá Jurerê, Viva Trindade,
// Villa Areias / Residencial Areias, Villa dos Açores/Acordes, Biguaçu Rio Caveiras, Studios Canasvieiras, Viva Balneário, etc.)

migrate(
  (app) => {
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

    let cleanedCount = 0

    // 1. Sanitizar todos os registros de properties existentes no banco
    try {
      const existing = app.findRecordsByFilter('properties', 'is_active = true', '-created', 500)
      for (let rec of existing) {
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

        // Limpar bedrooms / suites em terrenos
        if (/terreno/i.test(propType) && (rec.getInt('bedrooms') > 0 || rec.getInt('suites') > 0)) {
          rec.set('bedrooms', 0)
          rec.set('suites', 0)
          dirty = true
        }

        if (dirty) {
          app.save(rec)
          cleanedCount++
        }
      }
    } catch (err) {
      console.log('[0174_migration] Erro ao sanitizar registros existentes: ' + err.message)
    }

    // 2. Inserir ou atualizar catálogo completo de lançamentos e destaques oficiais
    const catalog = [
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
        title:
          'RESIDENCIAL AREIAS (Villa Areias) - Viva no Melhor de 2 dorm. em Areias São José-SC',
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
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260526T1815080300-85027948.jpg',
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

    const coll = app.findCollectionByNameOrId('properties')

    for (let item of catalog) {
      let rec = null
      try {
        rec = app.findFirstRecordByFilter(
          'properties',
          "code = '" + item.code.replace(/'/g, "\\'") + "'",
        )
      } catch (_) {}

      if (!rec && item.url) {
        try {
          rec = app.findFirstRecordByFilter(
            'properties',
            "url = '" + item.url.replace(/'/g, "\\'") + "'",
          )
        } catch (_) {}
      }

      if (!rec) {
        rec = new Record(coll)
      }

      rec.set('code', item.code)
      rec.set('title', item.title)
      rec.set('url', item.url)
      rec.set('city', item.city)
      rec.set('neighborhood', item.neighborhood)
      rec.set('property_type', item.property_type)
      rec.set('transaction_type', item.transaction_type)
      rec.set('price', item.price)
      rec.set('price_formatted', item.price_formatted)
      rec.set('bedrooms', item.bedrooms)
      rec.set('suites', item.suites)
      rec.set('bathrooms', item.bathrooms)
      rec.set('parking_spaces', item.parking_spaces)
      rec.set('area_privativa', item.area_privativa)
      rec.set('area_total', item.area_total)
      rec.set('description', item.description)
      rec.set('features', item.features)
      rec.set('image_url', item.image_url)
      rec.set('is_active', true)

      try {
        app.save(rec)
      } catch (saveErr) {
        console.log('[0174_migration] Erro ao salvar ' + item.code + ': ' + saveErr.message)
      }
    }

    console.log(
      '[0174_migration] Migração concluída: ' +
        cleanedCount +
        ' registros higienizados e lançamentos essenciais atualizados.',
    )
  },
  (app) => {
    // rollback
  },
)
