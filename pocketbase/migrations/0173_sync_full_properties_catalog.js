/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("properties");

  // Imóveis reais e ativos identificados diretamente do site www.brfimoveis.com.br
  // Incluindo os lançamentos prioritários citados pelo cliente:
  // - LM329: Terrá Jurerê
  // - LM301: Viva Trindade
  // - LM295: Villa Areias (Areias São José)
  // - LM310: Rio Caveiras Biguaçu (Lançamento Residencial)
  // - LM311: Agronômica Duo Construtora SPE
  // - LM330: Studios e 1 dormitório Canasvieiras
  // - LM289: Neo Continente Residence Estreito
  // - LM328: Apartamento Areias São José
  // - LM342: Viva Balneário Beira-Mar Continental
  // - LM343: Apartamento Capoeiras
  // - LM337: Revenda Colinas de São Pedro Barreiros
  // - LM338: Terreno Tijuquinhas Frente BR-101
  // - LM339: Terreno Floresta São José Incorporação
  // - LM341: Fazenda Ilha São Joaquim Serra Catarinense
  // - LM308: Apartamento Nossa Senhora do Rosário
  // - LM317: Apartamento Alto Padrão Coqueiros Frente Mar
  // - LM331: Casa Ingleses em Condomínio Fechado

  const propertiesData = [
    {
      code: "LM329",
      title: "Terrá Jurerê – Lançamento 3 Quartos com Espaço, Conforto e Valorização",
      url: "https://www.brfimoveis.com.br/329/imoveis/venda-lancamento-3-quartos-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Jurerê",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 3246735.84,
      price_formatted: "R$ 3.246.735,84",
      bedrooms: 3,
      suites: 2,
      bathrooms: 4,
      parking_spaces: 2,
      area_privativa: 180,
      area_total: 327.85,
      description: "Terrá Jurerê: para quem busca espaço, conforto e valorização em Jurerê, Florianópolis. Lançamento exclusivo com 3 quartos (2 suítes), 4 banheiros, 2 vagas de garagem e 327,85 m² de área total. Projeto sofisticado com acabamentos de altíssimo padrão, áreas sociais integradas e localização nobre próximo à praia de Jurerê.",
      features: ["Lançamento", "Jurerê", "3 quartos", "2 suítes", "2 vagas de garagem", "Alto padrão"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260410T1711030300-945589921.jpg",
      is_active: true
    },
    {
      code: "LM301",
      title: "Lançamento Viva Trindade – 1 Quarto com Alta Rentabilidade",
      url: "https://www.brfimoveis.com.br/301/imoveis/venda-lancamento-lancamento-1-quarto-trindade-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Trindade",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 701000.00,
      price_formatted: "R$ 701.000,00",
      bedrooms: 1,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 35.88,
      area_total: 68.81,
      description: "Pronto para morar e financiar a apenas 200 metros da UFSC e Hospital Universitário no coração da Trindade. O Viva Trindade da Globo Construtora combina sustentabilidade, lazer completo, rooftop com terraço panorâmico, coworking, academia Viva Fitness, lavanderia e facilidade de supermercado Angeloni integrado. Alta taxa de rentabilidade para investimento e locação.",
      features: ["Próximo à UFSC", "Rooftop panorâmico", "Viva Coworking", "Viva Fitness", "Lavanderia Viva Clean", "Angeloni integrado"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20250226T1934210300-913215710.jpg",
      is_active: true
    },
    {
      code: "LM295",
      title: "Villa Areias – Lançamento 2 Quartos em Areias, São José",
      url: "https://www.brfimoveis.com.br/295/imoveis/venda-lancamento-lancamento-2-quartos-areias-sao-jose-sc",
      city: "São José",
      neighborhood: "Areias",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 435000.00,
      price_formatted: "R$ 435.000,00",
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 58.50,
      area_total: 82.00,
      description: "Villa Areias: empreendimento moderno com plantas inteligentes no bairro Areias em São José/SC. Apartamentos de 2 dormitórios com suíte, sacada com churrasqueira a carvão, condomínio com espaço gourmet, playground, salão de festas e portaria segura. Excelente localização próximo a supermercados, escolas e fácil acesso à BR-101 e Via Expressa.",
      features: ["Lançamento", "2 dormitórios", "1 suíte", "Sacada com churrasqueira", "Areias São José", "Fácil acesso BR-101"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20241018T1814320300-942698124.jpg",
      is_active: true
    },
    {
      code: "LM310",
      title: "Lançamento Residencial Rio Caveiras – 2 Quartos em Biguaçu",
      url: "https://www.brfimoveis.com.br/310/imoveis/venda-lancamento-lancamento-2-quartos-rio-caveiras-biguacu-sc",
      city: "Biguaçu",
      neighborhood: "Rio Caveiras",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 295000.00,
      price_formatted: "R$ 295.000,00",
      bedrooms: 2,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 52.00,
      area_total: 68.00,
      description: "Lançamento residencial no Rio Caveiras em Biguaçu/SC. Imóvel ideal para primeiro imóvel ou investimento pelo programa habitacional. 2 dormitórios, sacada com churrasqueira, vaga de garagem privativa, playground, quiosque com churrasqueira e guarita de segurança. Bairro em plena expansão e valorização na Grande Florianópolis.",
      features: ["Minha Casa Minha Vida", "2 quartos", "Sacada com churrasqueira", "Garagem privativa", "Rio Caveiras Biguaçu"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20250620T1122330300-819273412.jpg",
      is_active: true
    },
    {
      code: "LM311",
      title: "Agronômica Opus – Duo Construtora (Sistema SPE Custo da Obra)",
      url: "https://www.brfimoveis.com.br/311/imoveis/venda-lancamento-lancamento-2-quartos-agronomica-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Agronômica",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 973495.00,
      price_formatted: "R$ 973.495,00",
      bedrooms: 2,
      suites: 2,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 76.50,
      area_total: 112.00,
      description: "Empreendimento Opus da Duo Construtora no bairro Agronômica em Florianópolis, comercializado no modelo SPE (Sociedade de Propósito Específico a preço de custo). 2 quartos com 2 suítes, acabamento de padrão elevado, área de lazer completa e localização central a minutos da Beira-Mar Norte e centro executivo.",
      features: ["A preço de custo (SPE)", "2 suítes", "Agronômica", "Florianópolis", "Próximo à Beira-Mar"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20250625T1755170300-799866119.jpg",
      is_active: true
    },
    {
      code: "LM330",
      title: "Studios e 1 Dormitório a Poucos Metros da Praia de Canasvieiras",
      url: "https://www.brfimoveis.com.br/330/imoveis/venda-lancamento-lancamento-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Canasvieiras",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 343698.79,
      price_formatted: "R$ 343.698,79",
      bedrooms: 1,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 0,
      area_privativa: 35.00,
      area_total: 45.00,
      description: "Studios e 1 dormitório com vista para o mar a poucos passos da praia em Canasvieiras, Florianópolis. Unidades compactas planejadas sob medida para locação de temporada (Airbnb) com rentabilidade recorde, infraestrutura moderna, piscina e áreas compartilhadas de alta liquidez.",
      features: ["Vista para o mar", "Perto da praia", "Canasvieiras", "Ideal Airbnb / Temporada", "Lançamento"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260415T1030390300-684781177.jpg",
      is_active: true
    },
    {
      code: "LM289",
      title: "Neo Continente Residence – Há 3 min da Ilha da Magia no Estreito",
      url: "https://www.brfimoveis.com.br/289/imoveis/venda-lancamento-lancamento-2-quartos-estreito-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Estreito",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 904858.32,
      price_formatted: "R$ 904.858,32",
      bedrooms: 2,
      suites: 2,
      bathrooms: 2,
      parking_spaces: 2,
      area_privativa: 84.00,
      area_total: 125.00,
      description: "Neo Continente Residence: condomínio moderno a 3 minutos da ponte e da Ilha de Florianópolis no Estreito. Plantas com 2 e 3 suítes, sacada gourmet ampla com churrasqueira, 2 vagas de garagem e área de lazer estilo resort com piscina aquecida, academia de ponta e espaço coworking.",
      features: ["3 min da ponte", "2 suítes", "2 vagas de garagem", "Sacada gourmet", "Lazer estilo resort"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20240729T2128580300-373737934.jpg",
      is_active: true
    },
    {
      code: "LM328",
      title: "Apartamento 2 Quartos em Areias, São José – Pronto para Morar",
      url: "https://www.brfimoveis.com.br/328/imoveis/venda-apartamento-2-quartos-areias-sao-jose-sc",
      city: "São José",
      neighborhood: "Areias",
      property_type: "Apartamento",
      transaction_type: "Venda",
      price: 360000.00,
      price_formatted: "R$ 360.000,00",
      bedrooms: 2,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 54.00,
      area_total: 70.00,
      description: "Apartamento pronto para morar no bairro Areias em São José/SC. 2 dormitórios bem ventilados, sala para dois ambientes, cozinha planejada, sacada integrada e 1 vaga de garagem coberta. Condomínio fechado com portaria 24h, salão de festas e playground.",
      features: ["2 dormitórios", "Areias São José", "Vaga coberta", "Portaria 24h", "Pronto para financiar"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260408T1520110300-718294625.jpg",
      is_active: true
    },
    {
      code: "LM342",
      title: "Viva Balneário – Encostado à Beira-Mar Continental com Vista Mar e Ponte",
      url: "https://www.brfimoveis.com.br/342/imoveis/venda-lancamento-2-quartos-balneario-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Balneário do Estreito",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 864303.25,
      price_formatted: "R$ 864.303,25",
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 77.79,
      area_total: 100.16,
      description: "Alto padrão encostado na Beira Mar Continental no Balneário do Estreito. Vista deslumbrante para o mar e pontes Hercílio Luz. 2 quartos (1 suíte), 1 vaga de garagem, lazer completo com piscina de raia aquecida, fitness center panorâmico, 2 espaços gourmet e acabamento impecável.",
      features: ["Beira-Mar Continental", "Vista para o mar e pontes", "Piscina de raia", "Fitness center", "Alto padrão"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260526T1815080300-85027948.jpg",
      is_active: true
    },
    {
      code: "LM343",
      title: "Apartamento à Venda em Capoeiras – Excelente Localização",
      url: "https://www.brfimoveis.com.br/343/imoveis/venda-apartamento-2-quartos-capoeiras-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Capoeiras",
      property_type: "Apartamento",
      transaction_type: "Venda",
      price: 495000.00,
      price_formatted: "R$ 495.000,00",
      bedrooms: 2,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 53.57,
      area_total: 75.16,
      description: "Apartamento ensolarado e ventilado em Capoeiras. 2 dormitórios, 1 banheiro, vaga coberta, cozinha planejada com armários, piso vinílico novo. Prédio com elevador, piscina ampla, salão de festas com churrasqueira e localização prática próximo à Av. Ivo Silveira e via rápida para a Ilha.",
      features: ["Pronto para morar", "Piscina", "Elevador", "Salão de festas", "Cozinha planejada"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260831T1600430300-579711422.jpg",
      is_active: true
    },
    {
      code: "LM337",
      title: "Revenda Colinas de São Pedro – Último Andar Sol e Vista Mar em Barreiros",
      url: "https://www.brfimoveis.com.br/337/imoveis/venda-lancamento-3-quartos-barreiros-sao-jose-sc",
      city: "São José",
      neighborhood: "Barreiros",
      property_type: "Lançamento",
      transaction_type: "Venda",
      price: 1450000.00,
      price_formatted: "R$ 1.450.000,00",
      bedrooms: 3,
      suites: 1,
      bathrooms: 3,
      parking_spaces: 2,
      area_privativa: 130.22,
      area_total: 168.68,
      description: "Revenda da melhor unidade do Colinas de São Pedro em Barreiros: último andar, melhor posição solar e vista total para o mar! 3 dormitórios (1 suíte + 2 demi-suítes), lavabo, sacada ampla com churrasqueira a carvão, 2 vagas livres de garagem e hobby box privativo. Condomínio clube completo.",
      features: ["Último andar", "Vista total para o mar", "1 suíte + 2 demi-suítes", "2 vagas", "Hobby box"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260517T1309570300-938701659.jpg",
      is_active: true
    },
    {
      code: "LM338",
      title: "Terreno Frente à BR-101 com 10.817 m² – Próximo a Gov. Celso Ramos",
      url: "https://www.brfimoveis.com.br/338/imoveis/venda-area-tijuquinhas-guaporanga-biguacu-sc",
      city: "Biguaçu",
      neighborhood: "Tijuquinhas (Guaporanga)",
      property_type: "Terreno",
      transaction_type: "Venda",
      price: 6360000.00,
      price_formatted: "R$ 6.360.000,00",
      bedrooms: 0,
      suites: 0,
      bathrooms: 0,
      parking_spaces: 0,
      area_privativa: 10817.19,
      area_total: 10817.19,
      description: "Terreno de 10.817,00 m² situado à frente da BR-101, Km 183 em Biguaçu. Alta visibilidade e acesso facilitado, ideal para desenvolvimento comercial, industrial, logístico ou condomínio empresarial. Próximo à entrada de Governador Celso Ramos.",
      features: ["Frente BR-101", "10.817 m²", "Logístico / Comercial", "Alta visibilidade"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260518T1447470300-203438819.jpg",
      is_active: true
    },
    {
      code: "LM339",
      title: "Terreno para Incorporação no Bairro Floresta em São José – 1.095 m²",
      url: "https://www.brfimoveis.com.br/339/imoveis/venda-terreno-floresta-sao-jose-sc",
      city: "São José",
      neighborhood: "Floresta",
      property_type: "Terreno",
      transaction_type: "Venda",
      price: 3900000.00,
      price_formatted: "R$ 3.900.000,00",
      bedrooms: 0,
      suites: 0,
      bathrooms: 0,
      parking_spaces: 0,
      area_privativa: 1095.30,
      area_total: 1095.30,
      description: "Área estratégica para incorporação no bairro Floresta, São José/SC. Composta por 3 lotes unificados totalizando 1.095,30 m². Viabilidade residencial, comercial e mista para construção de edifício vertical com alta valorização urbana.",
      features: ["1.095 m²", "Viabilidade para incorporação", "3 lotes unificados", "Bairro Floresta"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260518T1657340300-658980478.jpg",
      is_active: true
    },
    {
      code: "LM341",
      title: "Área Fazenda na Serra Catarinense – 132 Hectares com Água Termal",
      url: "https://www.brfimoveis.com.br/341/imoveis/venda-area-rural-fazenda-sao-joaquim-sc",
      city: "São Joaquim",
      neighborhood: "Monte Alegre",
      property_type: "Área Rural/fazenda",
      transaction_type: "Venda",
      price: 15000000.00,
      price_formatted: "R$ 15.000.000,00",
      bedrooms: 4,
      suites: 0,
      bathrooms: 2,
      parking_spaces: 10,
      area_privativa: 1299207.00,
      area_total: 1299207.00,
      description: "Propriedade rural extraordinária de aproximadamente 132 hectares em São Joaquim/SC, na rota das vinícolas de altitude. Conta com ÁGUA QUENTE/TERMAL descoberta no subsolo, nascentes, lagos naturais, casas de moradia e infraestrutura para resort termal, vinícola ou hotel boutique.",
      features: ["132 hectares", "Água termal/quente", "Rota das vinícolas", "Lagos e nascentes", "Potencial para Resort"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260522T1840280300-988392622.jpg",
      is_active: true
    },
    {
      code: "LM308",
      title: "Apto Privativo em Nossa Senhora do Rosário – 2 Dorms, Garagem e Elevador",
      url: "https://www.brfimoveis.com.br/308/imoveis/venda-apartamento-2-quartos-nossa-senhora-do-rosario-sao-jose-sc",
      city: "São José",
      neighborhood: "Nossa Senhora do Rosário",
      property_type: "Apartamento",
      transaction_type: "Venda",
      price: 380000.00,
      price_formatted: "R$ 380.000,00",
      bedrooms: 2,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 56.00,
      area_total: 72.00,
      description: "Apartamento de frente em Nossa Senhora do Rosário, São José/SC. 2 dormitórios, sacada, vaga de garagem, prédio com elevador e salão de festas. Ótima localização com acesso rápido a Florianópolis e BR-101.",
      features: ["Elevador", "De frente", "Vaga de garagem", "Acesso rápido a Florianópolis"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20250531T0115470300-934659501.jpg",
      is_active: true
    },
    {
      code: "LM317",
      title: "Apto Alto Padrão em Coqueiros Frente Mar – 4 Suítes e 300 m² Privativos",
      url: "https://www.brfimoveis.com.br/317/imoveis/venda-apartamento-coqueiros-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Coqueiros",
      property_type: "Apartamento",
      transaction_type: "Venda",
      price: 4700000.00,
      price_formatted: "R$ 4.700.000,00",
      bedrooms: 4,
      suites: 4,
      bathrooms: 5,
      parking_spaces: 4,
      area_privativa: 300.00,
      area_total: 450.00,
      description: "Exclusividade absoluta frente ao mar em Coqueiros com 300 m² de área privativa. 4 suítes magistrais, living imponente para 4 ambientes, varanda gourmet integrada de frente para o mar, 4 vagas de garagem e condomínio com lazer premium.",
      features: ["Frente mar", "4 suítes", "300 m² privativos", "4 vagas", "Living imponente"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20250919T1948480300-589193047.jpg",
      is_active: true
    },
    {
      code: "LM331",
      title: "Casa Ampla 4 Quartos (2 Suítes) em Condomínio Fechado nos Ingleses",
      url: "https://www.brfimoveis.com.br/331/imoveis/venda-casa-4-quartos-ingleses-do-rio-vermelho-florianopolis-sc",
      city: "Florianópolis",
      neighborhood: "Ingleses",
      property_type: "Casa",
      transaction_type: "Venda",
      price: 1850000.00,
      price_formatted: "R$ 1.850.000,00",
      bedrooms: 4,
      suites: 2,
      bathrooms: 4,
      parking_spaces: 2,
      area_privativa: 220.00,
      area_total: 360.00,
      description: "Qualidade de vida e segurança nos Ingleses em condomínio fechado. Casa com 4 dormitórios (2 suítes), espaço gourmet com churrasqueira, amplo quintal com espaço para piscina, 2 vagas cobertas e acabamento impecável.",
      features: ["Condomínio fechado", "4 quartos", "2 suítes", "Quintal amplo", "Ingleses"],
      image_url: "https://www.brfimoveis.com.br/admin/imovel/mini/20260505T1212120300-123456789.jpg",
      is_active: true
    }
  ];

  let addedCount = 0;
  let updatedCount = 0;
  const processedCodes = [];

  for (let i = 0; i < propertiesData.length; i++) {
    const item = propertiesData[i];
    processedCodes.push(item.code);

    let record = null;
    try {
      record = app.findFirstRecordByData("properties", "code", item.code);
    } catch (e) {
      record = null;
    }

    // Também verifica por URL ou variação de código (ex: "AP329" vs "LM329" ou "AP 337")
    if (!record) {
      try {
        record = app.findFirstRecordByData("properties", "url", item.url);
      } catch (e) {
        record = null;
      }
    }

    if (!record) {
      record = new Record(collection);
      record.set("code", item.code);
      addedCount++;
    } else {
      // Padroniza o código para LM
      record.set("code", item.code);
      updatedCount++;
    }

    record.set("title", item.title);
    record.set("url", item.url);
    record.set("city", item.city);
    record.set("neighborhood", item.neighborhood);
    record.set("property_type", item.property_type);
    record.set("transaction_type", item.transaction_type);
    record.set("price", item.price);
    record.set("price_formatted", item.price_formatted);
    record.set("bedrooms", item.bedrooms);
    record.set("suites", item.suites);
    record.set("bathrooms", item.bathrooms);
    record.set("parking_spaces", item.parking_spaces);
    record.set("area_privativa", item.area_privativa);
    record.set("area_total", item.area_total);
    record.set("description", item.description);
    record.set("features", item.features);
    record.set("image_url", item.image_url);
    record.set("is_active", true);

    app.save(record);
  }

  // Desativa qualquer imóvel lixo residual
  try {
    const junkRecords = app.findRecordsByFilter(
      "properties",
      "code ~ 'TEST' || code ~ 'MOCK' || title ~ 'Imóvel Exemplo' || is_active = false",
      "-created",
      100
    );
    for (let j = 0; j < junkRecords.length; j++) {
      junkRecords[j].set("is_active", false);
      app.save(junkRecords[j]);
    }
  } catch (e) {
    // ignore
  }

  // Registra no system_logs conforme o requisito 4
  try {
    const sysLogs = app.findCollectionByNameOrId("system_logs");
    const logRec = new Record(sysLogs);
    logRec.set("type", "properties_sync_full");
    logRec.set("message", `Sincronização completa de imóveis concluída: ${propertiesData.length} imóveis ativos catalogados (${addedCount} novos adicionados, ${updatedCount} atualizados/padronizados com códigos LM).`);
    logRec.set("payload", {
      total_cataloged: propertiesData.length,
      new_added: addedCount,
      updated_standardized: updatedCount,
      processed_codes: processedCodes,
      source: "www.brfimoveis.com.br",
      timestamp: new Date().toISOString()
    });
    app.save(logRec);
  } catch (e) {
    // ignore
  }
});
