/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // 1. Atualizar canal do YouTube nas configurações do usuário Mauro / BRF Imóveis
  try {
    const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
    if (user) {
      const channelUrl = 'https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g'
      user.set('youtube_url', channelUrl)

      // Atualizar bia_instructions e ai_instructions com as diretrizes do canal oficial do YouTube
      const youtubeDirective = `\n\nCANAL OFICIAL DO YOUTUBE DA BRF IMÓVEIS:
- Nome do canal: BRFIMOVEIS EIRELI ME (Mauro Fengler - BRF Imóveis)
- Link oficial do canal: https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g
- Quando o cliente solicitar vídeos de imóveis, tours virtuais, gravações das unidades ou materiais audiovisuais, forneça cordialmente o link do canal oficial da BRF Imóveis (https://www.youtube.com/channel/UCA2JsoiTVTf8vKgWG65YH_g) para que ele explore os vídeos e tours gravados pelo Mauro.
- NUNCA invente links de vídeos específicos que não existam ou não tenham sido fornecidos no contexto. Indique o canal oficial.`

      let bia = user.getString('bia_instructions') || ''
      if (!bia.includes('UCA2JsoiTVTf8vKgWG65YH_g')) {
        bia += youtubeDirective
        user.set('bia_instructions', bia)
      }

      let aiInst = user.getString('ai_instructions') || ''
      if (!aiInst.includes('UCA2JsoiTVTf8vKgWG65YH_g')) {
        aiInst += youtubeDirective
        user.set('ai_instructions', aiInst)
      }

      app.save(user)
      console.log('[MIGRATION_0173] YouTube channel and instructions updated for brfimoveis')
    }
  } catch (err) {
    console.warn('[MIGRATION_0173] Error updating user YouTube settings: ' + String(err))
  }

  // 2. Limpar qualquer registro corrompido / lixo / mojibake na coleção properties
  try {
    app
      .db()
      .newQuery(`
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
        OR price <= 0
        OR price IS NULL
        OR title = ''
        OR title IS NULL
        OR url NOT LIKE 'https://www.brfimoveis.com.br/%';
    `)
      .execute()
  } catch (cleanErr) {
    console.warn('[MIGRATION_0173] Clean junk query error: ' + String(cleanErr))
  }

  // 3. Garantir os lançamentos prioritários com dados oficiais e códigos normalizados (LM329, LM301, LM295, LM310, LM330, etc.)
  const propertiesCol = app.findCollectionByNameOrId('properties')
  const catalogList = [
    {
      code: 'LM 329',
      alt_code: 'AP329',
      title: 'Terrá Jurerê – Lançamento 3 Quartos com Espaço, Conforto e Valorização',
      url: 'https://www.brfimoveis.com.br/329/imoveis/venda-lancamento-3-quartos-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Jurerê',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 3246735.84,
      price_formatted: 'R$ 3.246.735,84',
      bedrooms: 3,
      suites: 2,
      bathrooms: 4,
      parking_spaces: 2,
      area_privativa: 180,
      area_total: 327.85,
      description:
        'Terrá Jurerê: para quem busca espaço, conforto e valorização em Jurerê, Florianópolis. Lançamento exclusivo com 3 quartos (2 suítes), 4 banheiros, 2 vagas de garagem e 327,85 m² de área total. Projeto sofisticado com acabamentos de altíssimo padrão, áreas sociais integradas e localização nobre.',
      features: [
        'Lançamento',
        'Jurerê',
        '3 quartos',
        '2 suítes',
        '2 vagas de garagem',
        'Alto padrão',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260410T1711030300-945589921.jpg',
    },
    {
      code: 'LM 301',
      alt_code: 'AP301',
      title: 'Lançamento Viva Trindade – 1 Quarto com Alta Rentabilidade',
      url: 'https://www.brfimoveis.com.br/301/imoveis/venda-lancamento-lancamento-1-quarto-trindade-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Trindade',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 701000.0,
      price_formatted: 'R$ 701.000,00',
      bedrooms: 1,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 35.88,
      area_total: 68.81,
      description:
        'Pronto para morar e financiar a apenas 200 metros da UFSC e Hospital Universitário no coração da Trindade. O Viva Trindade combina sustentabilidade, lazer completo, rooftop com terraço panorâmico, coworking, academia Viva Fitness e lavanderia. Alta rentabilidade.',
      features: [
        'Próximo à UFSC',
        'Rooftop panorâmico',
        'Viva Coworking',
        'Viva Fitness',
        'Lavanderia Viva Clean',
        'Angeloni integrado',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250226T1934210300-913215710.jpg',
    },
    {
      code: 'LM 295',
      alt_code: 'AP295',
      title: 'Residencial Areias (Villa Areias) – 2 Quartos com Suíte em Areias São José',
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
      area_privativa: 64.88,
      area_total: 64.88,
      description:
        'Residencial Areias (Villa Areias): sofisticação e conforto no bairro Areias em São José/SC. Plantas de 2 dormitórios com 1 suíte, garagem coberta, sacada com churrasqueira a carvão, piscina com espaço gourmet, playground e salão de festas decorado. Fácil acesso à BR-101 e Av. das Torres.',
      features: [
        'Lançamento',
        '2 dormitórios',
        '1 suíte',
        'Sacada com churrasqueira',
        'Areias São José',
        'Piscina',
        'Fácil acesso BR-101',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20241018T1814320300-942698124.jpg',
    },
    {
      code: 'LM 310',
      alt_code: 'LM311',
      title: 'Residencial Villa dos Açores – 2 Quartos no Rio Caveiras em Biguaçu',
      url: 'https://www.brfimoveis.com.br/310/imoveis/venda-lancamento-lancamento-2-quartos-rio-caveiras-biguacu-sc',
      city: 'Biguaçu',
      neighborhood: 'Rio Caveiras',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 349000.0,
      price_formatted: 'R$ 349.000,00',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 58.78,
      area_total: 70.78,
      description:
        'Residencial Villa dos Açores no Rio Caveiras, Biguaçu/SC. 2 quartos (1 suíte), 2 banheiros, sacada com churrasqueira privativa, vaga de garagem, piscina com deck, salão de festas, espaço fitness, pet place e quiosques. Ao lado da BR-101 duplicada e financiamento facilitado.',
      features: [
        'Lançamento',
        'Rio Caveiras Biguaçu',
        '2 quartos',
        '1 suíte',
        'Sacada com churrasqueira',
        'Piscina com deck',
        'Pet place',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250620T1122330300-819273412.jpg',
    },
    {
      code: 'LM 330',
      alt_code: 'AP330',
      title: 'Studios e 1 Dormitório a Poucos Metros da Praia em Canasvieiras',
      url: 'https://www.brfimoveis.com.br/330/imoveis/venda-lancamento-lancamento-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Canasvieiras',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 343698.79,
      price_formatted: 'R$ 343.698,79',
      bedrooms: 1,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 0,
      area_privativa: 24.58,
      area_total: 30.11,
      description:
        'Lançamento em Canasvieiras, studio e 1 dormitório com vista mar a poucos passos da praia. Sacadas com churrasqueira a carvão, piscina, coworking, academia, lounge relax, fire place e lavanderia compartilhada. Ideal para locação por temporada (Airbnb) com rentabilidade elevada.',
      features: [
        'Vista mar',
        'Perto da praia',
        'Canasvieiras',
        'Ideal Airbnb / Locação de Temporada',
        'Churrasqueira na sacada',
        'Piscina',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260415T1030390300-684781177.jpg',
    },
    {
      code: 'LM 289',
      alt_code: 'AP289',
      title: 'Neo Continente Residence – 3 Minutos da Ilha no Estreito',
      url: 'https://www.brfimoveis.com.br/289/imoveis/venda-lancamento-lancamento-2-quartos-estreito-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Estreito',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 904858.32,
      price_formatted: 'R$ 904.858,32',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 2,
      area_privativa: 74.54,
      area_total: 111.03,
      description:
        'Neo Continente Residence: condomínio moderno a 3 minutos da Ponte Hercílio Luz no Estreito. Plantas de 2 dormitórios com suíte, sacada gourmet com churrasqueira a carvão, 2 vagas de garagem, hobby box individual e lazer completo com piscina, deck molhado, academia e brinquedoteca.',
      features: [
        '3 min da Ilha',
        'Estreito',
        '2 quartos',
        '1 suíte',
        '2 vagas',
        'Hobby box',
        'Sacada com churrasqueira',
        'Piscina',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20240729T2128580300-373737934.jpg',
    },
    {
      code: 'LM 311',
      alt_code: 'LM316',
      title: 'Agronômica Opus Duo Construtora – Sistema SPE Custo da Obra a 200m da Beira-Mar',
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
      area_privativa: 86.15,
      area_total: 86.15,
      description:
        'Opus Agronômica da Duo Construtora: sistema SPE a preço de custo a apenas 200m da Beira-Mar Norte e Angeloni. 2 suítes com pé-direito de 4,30m, piscina térmica, spa com hidromassagem, sauna, academia e coworking. Excelente oportunidade para investidores.',
      features: [
        'A preço de custo (SPE)',
        '2 suítes',
        '200m da Beira-Mar',
        'Piscina térmica',
        'Spa',
        'Agronômica',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250625T1755170300-799866119.jpg',
    },
    {
      code: 'LM 342',
      alt_code: 'AP 342',
      title: 'Viva Balneário – Encostado à Beira-Mar Continental com Vista Mar e Ponte',
      url: 'https://www.brfimoveis.com.br/342/imoveis/venda-lancamento-2-quartos-balneario-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Balneário do Estreito',
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
        'Viva Balneário: alto padrão encostado à Beira-Mar Continental no Balneário do Estreito. Vista frontal para o mar e pontes Hercílio Luz. 2 dormitórios (1 suíte), 1 vaga, piscina de raia, fitness center, 2 espaços gourmet integrados e acabamento primoroso.',
      features: [
        'Beira-Mar Continental',
        'Vista para o mar e ponte',
        'Piscina com raia',
        'Fitness center',
        'Espaço gourmet',
        'Lançamento alto padrão',
      ],
      image_url: 'https://www.brfimoveis.com.br/admin/imovel/mini/20260526T1815080300-85027948.jpg',
    },
  ]

  for (let k = 0; k < catalogList.length; k++) {
    const item = catalogList[k]
    let record = null
    try {
      record = app.findFirstRecordByData('properties', 'url', item.url)
    } catch (_) {}

    if (!record && item.alt_code) {
      try {
        record = app.findFirstRecordByData('properties', 'code', item.alt_code)
      } catch (_) {}
    }

    if (!record) {
      try {
        record = app.findFirstRecordByData('properties', 'code', item.code)
      } catch (_) {}
    }

    if (!record) {
      record = new Record(propertiesCol)
    }

    record.set('code', item.code)
    record.set('title', item.title)
    record.set('url', item.url)
    record.set('city', item.city)
    record.set('neighborhood', item.neighborhood)
    record.set('property_type', item.property_type)
    record.set('transaction_type', item.transaction_type)
    record.set('price', item.price)
    record.set('price_formatted', item.price_formatted)
    record.set('bedrooms', item.bedrooms)
    record.set('suites', item.suites)
    record.set('bathrooms', item.bathrooms)
    record.set('parking_spaces', item.parking_spaces)
    record.set('area_privativa', item.area_privativa)
    record.set('area_total', item.area_total)
    record.set('description', item.description)
    record.set('features', item.features)
    record.set('image_url', item.image_url)
    record.set('is_active', true)

    app.save(record)
  }

  // Registra no system_logs
  try {
    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol)
    logRec.set('type', 'properties_sync_and_youtube')
    logRec.set(
      'message',
      'Canal YouTube da BRF Imóveis integrado às instruções da Bia e catálogo sincronizado com lançamentos LM ativos.',
    )
    logRec.set('details', 'Executado via migration 0173.')
    app.save(logRec)
  } catch (_) {}
})
