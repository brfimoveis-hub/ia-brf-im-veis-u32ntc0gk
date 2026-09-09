migrate(
  (app) => {
    // 1. Create properties collection if it doesn't exist
    if (!app.hasTable('properties')) {
      const collection = new Collection({
        name: 'properties',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'url', type: 'text', required: true },
          { name: 'city', type: 'text' },
          { name: 'neighborhood', type: 'text' },
          { name: 'property_type', type: 'text' },
          { name: 'transaction_type', type: 'text' },
          { name: 'price', type: 'number' },
          { name: 'price_formatted', type: 'text' },
          { name: 'bedrooms', type: 'number' },
          { name: 'suites', type: 'number' },
          { name: 'bathrooms', type: 'number' },
          { name: 'parking_spaces', type: 'number' },
          { name: 'area_privativa', type: 'number' },
          { name: 'area_total', type: 'number' },
          { name: 'description', type: 'text' },
          { name: 'features', type: 'json' },
          { name: 'image_url', type: 'text' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_properties_code ON properties (code)',
          'CREATE INDEX idx_properties_city ON properties (city)',
          'CREATE INDEX idx_properties_neighborhood ON properties (neighborhood)',
          'CREATE INDEX idx_properties_price ON properties (price)',
        ],
      })
      app.save(collection)
    }

    // 2. Seed properties from brfimoveis.com.br
    const propertiesCol = app.findCollectionByNameOrId('properties')

    const initialProperties = [
      {
        code: 'AP-320',
        title: 'Raridade em Balneário Camboriú – Um por Andar, 50m da Praia, 3 Suítes!',
        url: 'https://www.brfimoveis.com.br/320/imoveis/venda-apartamento-3-quartos-centro-balneario-camboriu-sc',
        city: 'Balneário Camboriú',
        neighborhood: 'Centro',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 2750000,
        price_formatted: 'R$ 2.750.000,00',
        bedrooms: 3,
        suites: 3,
        bathrooms: 3,
        parking_spaces: 2,
        area_privativa: 127.73,
        area_total: 178.48,
        description:
          'Um por andar com exclusividade a 50m da Avenida Atlântica / Barra Sul. Alto padrão com 3 suítes amplas, 2 salas integradas, cozinha planejada com varanda e churrasqueira a carvão, 2 vagas cobertas privativas, ótima posição solar. Condomínio R$ 1.200,00.',
        features: [
          '50m da praia',
          'Um por andar',
          'Churrasqueira a carvão',
          'Varanda',
          'Garagem coberta',
          'Próximo à Barra Sul',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20251010T1409410300-375424033.jpg',
        is_active: true,
      },
      {
        code: 'AP387',
        title: 'Jurerê Internacional – Sofisticação, Conforto e Exclusividade Integrado à Natureza',
        url: 'https://www.brfimoveis.com.br/224/imoveis/venda-apartamento-3-quartos-jurere-internacional-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Jurerê Internacional',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 3500000,
        price_formatted: 'R$ 3.500.000,00',
        bedrooms: 3,
        suites: 3,
        bathrooms: 4,
        parking_spaces: 3,
        area_privativa: 117.56,
        area_total: 256.0,
        description:
          'Apartamento alto padrão em Jurerê Internacional, totalmente mobiliado e pronto para morar. 3 suítes espaçosas, sacada com churrasqueira voltada para o verde, 3 vagas de garagem, hobby box, condomínio com piscina semiolímpica de 25m, fitness e segurança biométrica.',
        features: [
          'Mobiliado',
          'Piscina semiolímpica',
          '3 suítes',
          '3 vagas',
          'Hobby box',
          'Sacada com churrasqueira',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20220806T1537460300-786863948.jpg',
        is_active: true,
      },
      {
        code: 'AP334',
        title:
          'Jurerê Internacional – Requintado e Espaçoso Apartamento 3 Suítes / 3 Vagas + Hobby Box',
        url: 'https://www.brfimoveis.com.br/336/imoveis/venda-apartamento-3-quartos-jurere-internacional-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Jurerê Internacional',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 3710000,
        price_formatted: 'R$ 3.710.000,00',
        bedrooms: 3,
        suites: 3,
        bathrooms: 4,
        parking_spaces: 3,
        area_privativa: 147.27,
        area_total: 272.48,
        description:
          'Apartamento impecável, mobiliado e pronto para morar em Jurerê Internacional. 3 suítes aconchegantes, sala de estar e jantar amplas, cozinha moderna em conceito aberto, sacada ampla com churrasqueira, 3 vagas, sauna, piscina semiolímpica e acabamento de alto padrão.',
        features: [
          '3 suítes',
          '3 vagas de garagem',
          'Hobby box',
          'Mobiliado',
          'Piscina',
          'Sauna',
          'Churrasqueira',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260515T1549500300-911024747.jpg',
        is_active: true,
      },
      {
        code: 'LM326',
        title: 'Colinas de São Pedro – 2 Dormitórios (1 Suíte) + Lavabo',
        url: 'https://www.brfimoveis.com.br/326/imoveis/venda-lancamento-apartamento-2-quartos-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Continente / São Pedro',
        property_type: 'Lançamento',
        transaction_type: 'Venda',
        price: 932645,
        price_formatted: 'R$ 932.645,47',
        bedrooms: 2,
        suites: 1,
        bathrooms: 2,
        parking_spaces: 2,
        area_privativa: 99.15,
        area_total: 130.0,
        description:
          'Empreendimento moderno Colinas de São Pedro. 2 dormitórios (1 suíte) + lavabo, sacada com churrasqueira a carvão, vaga especial com 22,80m², hobby box. Condomínio com piscina coletiva, espaço gourmet, fitness, brinquedoteca, playground e gás central.',
        features: [
          'Lançamento',
          '1 suíte',
          'Churrasqueira a carvão',
          'Piscina coletiva',
          'Hobby box',
          'Espaço gourmet',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260309T1705450300-795523311.jpg',
        is_active: true,
      },
      {
        code: 'AP343',
        title: 'Apartamento à venda em Capoeiras – Excelente Localização',
        url: 'https://www.brfimoveis.com.br/343/imoveis/venda-apartamento-2-quartos-capoeiras-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Capoeiras',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 495000,
        price_formatted: 'R$ 495.000,00',
        bedrooms: 2,
        suites: 0,
        bathrooms: 1,
        parking_spaces: 1,
        area_privativa: 53.57,
        area_total: 75.16,
        description:
          'Apartamento ensolarado e ventilado em Capoeiras. 2 dormitórios, 1 banheiro, vaga coberta, cozinha planejada com armários, piso vinílico novo. Prédio com elevador, piscina ampla, salão de festas com churrasqueira a carvão, quiosque e vigilância eletrônica. Condomínio R$ 442,00.',
        features: [
          'Pronto para morar',
          'Piscina',
          'Elevador',
          'Salão de festas com churrasqueira',
          'Cozinha planejada',
          'Condomínio baixo',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260831T1600430300-579711422.jpg',
        is_active: true,
      },
      {
        code: 'AP 342',
        title: 'Viva Balneário – Encostado à Beira Mar Continental com Vista para o Mar e Ponte',
        url: 'https://www.brfimoveis.com.br/342/imoveis/venda-lancamento-2-quartos-balneario-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Balneário do Estreito',
        property_type: 'Lançamento',
        transaction_type: 'Venda',
        price: 864303,
        price_formatted: 'R$ 864.303,25',
        bedrooms: 2,
        suites: 1,
        bathrooms: 2,
        parking_spaces: 1,
        area_privativa: 77.79,
        area_total: 100.16,
        description:
          'Alto padrão encostado na Beira Mar Continental no Balneário do Estreito. Vista deslumbrante para o mar e pontes. 2 quartos (1 suíte), 1 vaga, lazer completo com piscina de raia, fitness center, 2 espaços gourmet, locker delivery, mini market, sustentabilidade com energia solar e espera para carro elétrico.',
        features: [
          'Beira-mar Continental',
          'Vista para o mar e ponte',
          'Piscina com raia',
          'Fitness center',
          'Espaço gourmet',
          'Lançamento alto padrão',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260526T1815080300-85027948.jpg',
        is_active: true,
      },
      {
        code: 'AP322',
        title: 'Vênus Residence – Alto Padrão no Pagani / Palhoça SC',
        url: 'https://www.brfimoveis.com.br/322/imoveis/venda-apartamento-3-quartos-passa-vinte-palhoca-sc',
        city: 'Palhoça',
        neighborhood: 'Passa Vinte / Pagani',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 950000,
        price_formatted: 'R$ 950.000,00',
        bedrooms: 3,
        suites: 1,
        bathrooms: 2,
        parking_spaces: 2,
        area_privativa: 115.0,
        area_total: 124.0,
        description:
          'Revenda de unidade exclusiva no Vênus Residence, bairro Pagani / Passa Vinte em Palhoça. 3 dormitórios, 2 banheiros, 2 vagas, hobby box. Condomínio com lounge com fire pit panorâmico, piscina com borda infinita na cobertura, salão de festas sofisticado. Próximo ao Shopping Via Catarina.',
        features: [
          'Piscina borda infinita na cobertura',
          'Lounge fire pit',
          'Hobby box',
          'Próximo ao Shopping Via Catarina',
          '2 vagas',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20251124T0022390300-553942829.jpg',
        is_active: true,
      },
      {
        code: 'AP318',
        title: 'Apartamento Alto Padrão em Coqueiros Frente Mar – 3 Quartos (2 Suítes)',
        url: 'https://www.brfimoveis.com.br/318/imoveis/venda-apartamento-3-quartos-coqueiros-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Coqueiros',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 2350000,
        price_formatted: 'R$ 2.350.000,00',
        bedrooms: 3,
        suites: 2,
        bathrooms: 3,
        parking_spaces: 2,
        area_privativa: 130.55,
        area_total: 214.2,
        description:
          'Apartamento frente mar permanente em Coqueiros. 3 dormitórios (2 suítes amplas), 2 vagas livres + hobby box, espaço gourmet privativo integrado, porcelanato Portobello, cozinha com Ice Maker e Corian. Apenas 11 apartamentos no edifício para total privacidade.',
        features: [
          'Frente mar permanente',
          '2 suítes',
          'Hobby box',
          'Espaço Gourmet privativo',
          'Apenas 11 apartamentos',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20250923T1629350300-250354756.jpg',
        is_active: true,
      },
      {
        code: 'AP328',
        title: 'Apartamento 2 dormitórios Areias São José – Porteira Fechada para Morar Hoje',
        url: 'https://www.brfimoveis.com.br/328/imoveis/venda-apartamento-2-quartos-areias-sao-jose-sc',
        city: 'São José',
        neighborhood: 'Areias',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 400000,
        price_formatted: 'R$ 400.000,00',
        bedrooms: 2,
        suites: 0,
        bathrooms: 1,
        parking_spaces: 1,
        area_privativa: 58.74,
        area_total: 75.29,
        description:
          'Porteira fechada no bairro Areias em São José. 2 dormitórios aconchegantes, sala com sacada, totalmente mobiliado e equipado com eletrodomésticos e móveis novos. Condomínio Ilhas do Norte com salão de festas e portaria 24 horas. 1 vaga rotativa.',
        features: [
          'Porteira fechada (totalmente mobiliado)',
          'Sacada',
          'Portaria 24h',
          'Salão de festas',
          'Excelente custo-benefício',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260323T1845050300-832942506.jpg',
        is_active: true,
      },
      {
        code: 'LM327',
        title: 'Solar Plaza Residencial – Capoeiras 3 Suítes / Demi-suítes + 2 Vagas e Hobby Box',
        url: 'https://www.brfimoveis.com.br/327/imoveis/venda-apartamento-3-quartos-capoeiras-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Capoeiras',
        property_type: 'Lançamento',
        transaction_type: 'Venda',
        price: 1097876,
        price_formatted: 'R$ 1.097.876,78',
        bedrooms: 3,
        suites: 3,
        bathrooms: 4,
        parking_spaces: 2,
        area_privativa: 115.71,
        area_total: 185.93,
        description:
          'Solar Plaza Residencial no coração do Continente (Capoeiras). Apartamentos de 3 suítes ou 3 dorms com demi-suíte, 2 vagas e hobby box. Sacada com churrasqueira a carvão, piscina aquecida com deck, academia com deck externo, fechadura digital e reconhecimento facial no hall.',
        features: [
          '3 suítes',
          'Piscina aquecida',
          '2 vagas',
          'Hobby box',
          'Reconhecimento facial',
          'Churrasqueira a carvão',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260319T1137050300-284163443.jpg',
        is_active: true,
      },
      {
        code: 'AP 337',
        title:
          'Revenda Colinas de São Pedro – Último Andar Sol e Vista Mar 3 Dorms (1 Suíte + 2 Demi)',
        url: 'https://www.brfimoveis.com.br/337/imoveis/venda-lancamento-3-quartos-barreiros-sao-jose-sc',
        city: 'São José',
        neighborhood: 'Barreiros',
        property_type: 'Lançamento',
        transaction_type: 'Venda',
        price: 1450000,
        price_formatted: 'R$ 1.450.000,00',
        bedrooms: 3,
        suites: 1,
        bathrooms: 3,
        parking_spaces: 2,
        area_privativa: 130.22,
        area_total: 168.68,
        description:
          'Revenda da melhor unidade do Colinas de São Pedro em Barreiros: último andar, melhor posição solar e vista total para o mar! 3 dormitórios (1 suíte + 2 demi-suítes), lavabo, sacada ampla com churrasqueira a carvão, 2 vagas de garagem e hobby box privativo.',
        features: [
          'Último andar',
          'Vista total para o mar',
          'Melhor posição solar',
          '1 suíte + 2 demi-suítes',
          '2 vagas',
          'Hobby box',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260517T1309570300-938701659.jpg',
        is_active: true,
      },
      {
        code: 'TR 338',
        title: 'Terreno Frente à BR-101 com 10.817 m² – Próximo a Nova Governador Celso Ramos',
        url: 'https://www.brfimoveis.com.br/338/imoveis/venda-area-tijuquinhas-guaporanga-biguacu-sc',
        city: 'Biguaçu',
        neighborhood: 'Tijuquinhas (Guaporanga)',
        property_type: 'Terreno',
        transaction_type: 'Venda',
        price: 6360000,
        price_formatted: 'R$ 6.360.000,00',
        bedrooms: 0,
        suites: 0,
        bathrooms: 0,
        parking_spaces: 0,
        area_privativa: 10817.19,
        area_total: 10817.19,
        description:
          'Terreno de 10.817,00 m² situado à frente da BR-101, Km 183. Alta visibilidade e acesso fácil, ideal para desenvolvimento comercial, industrial, logístico ou condomínio empresarial. Próximo à Nova Governador Celso Ramos.',
        features: [
          'Frente BR-101',
          '10.817 m²',
          'Comercial/Industrial/Logístico',
          'Alta visibilidade',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260518T1447470300-203438819.jpg',
        is_active: true,
      },
      {
        code: 'TR 339',
        title: 'Terreno para Incorporação no Bairro Floresta em São José – 1.095 m²',
        url: 'https://www.brfimoveis.com.br/339/imoveis/venda-terreno-floresta-sao-jose-sc',
        city: 'São José',
        neighborhood: 'Floresta',
        property_type: 'Terreno',
        transaction_type: 'Venda',
        price: 3900000,
        price_formatted: 'R$ 3.900.000,00',
        bedrooms: 0,
        suites: 0,
        bathrooms: 0,
        parking_spaces: 0,
        area_privativa: 1095.3,
        area_total: 1095.3,
        description:
          'Área estratégica para incorporação no bairro Floresta, São José/SC. Composta por 3 lotes totalizando 1.095,30 m². Viabilidade residencial, comercial e industrial para construção de edifício vertical com alta liquidez.',
        features: [
          '1.095 m²',
          'Viabilidade vertical/incorporação',
          '3 lotes unificados',
          'Bairro Floresta',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260518T1657340300-658980478.jpg',
        is_active: true,
      },
      {
        code: 'ARU 341',
        title: 'Área Fazenda Ilha na Serra Catarinense – 132 Hectares com Água Termal',
        url: 'https://www.brfimoveis.com.br/341/imoveis/venda-area-rural-fazenda-sao-joaquim-sc',
        city: 'São Joaquim',
        neighborhood: 'Monte Alegre',
        property_type: 'Área Rural/fazenda',
        transaction_type: 'Venda',
        price: 15000000,
        price_formatted: 'R$ 15.000.000,00',
        bedrooms: 4,
        suites: 0,
        bathrooms: 2,
        parking_spaces: 10,
        area_privativa: 1299207.0,
        area_total: 1299207.0,
        description:
          'Propriedade rural extraordinária de aproximadamente 132 hectares em São Joaquim/SC, rota das vinícolas. Conta com ÁGUA QUENTE/TERMAL descoberta no subsolo, nascentes, lagos naturais, casas de moradia e sede de confraternização. Potencial espetacular para resort termal, hotelaria ou condomínio rural de alto padrão.',
        features: [
          '132 hectares',
          'Água termal/quente no subsolo',
          'Rota das vinícolas',
          'Nascentes e lagos',
          'Resort/Hotelaria',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260522T1840280300-988392622.jpg',
        is_active: true,
      },
      {
        code: 'AP330',
        title: 'Studios e 1 Dormitório a Poucos Metros da Praia de Canasvieiras',
        url: 'https://www.brfimoveis.com.br/330/imoveis/venda-lancamento-lancamento-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Canasvieiras',
        property_type: 'Lançamento',
        transaction_type: 'Venda',
        price: 343698,
        price_formatted: 'R$ 343.698,79',
        bedrooms: 1,
        suites: 0,
        bathrooms: 1,
        parking_spaces: 0,
        area_privativa: 35.0,
        area_total: 45.0,
        description:
          'Lançamento com studios e 1 dormitório com vista para o mar a poucos passos da praia em Canasvieiras, Florianópolis. Excelente retorno para locação de temporada (Airbnb) e valorização garantida.',
        features: [
          'Perto do mar',
          'Canasvieiras',
          'Ideal para Airbnb/Locação',
          'Preço inicial atrativo',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260415T1030390300-684781177.jpg',
        is_active: true,
      },
      {
        code: 'AP329',
        title: 'Terrá Jurerê – Lançamento 3 Quartos com Espaço, Conforto e Valorização',
        url: 'https://www.brfimoveis.com.br/329/imoveis/venda-lancamento-3-quartos-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Jurerê',
        property_type: 'Lançamento',
        transaction_type: 'Venda',
        price: 3246735,
        price_formatted: 'R$ 3.246.735,84',
        bedrooms: 3,
        suites: 2,
        bathrooms: 4,
        parking_spaces: 2,
        area_privativa: 180.0,
        area_total: 327.85,
        description:
          'Terrá Jurerê: sofisticação e espaço em Jurerê. 3 quartos (suítes), 4 banheiros, 2 vagas, área total de 327,85 m². Projeto moderno com arquitetura contemporânea e lazer exclusivo para quem busca viver com requinte.',
        features: ['Lançamento', 'Jurerê', '327 m² de área total', '2 vagas', 'Padrão luxo'],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260410T1711030300-945589921.jpg',
        is_active: true,
      },
      {
        code: 'CS331',
        title: 'Casa Ampla 4 Quartos (2 Suítes) em Condomínio Fechado nos Ingleses',
        url: 'https://www.brfimoveis.com.br/331/imoveis/venda-casa-4-quartos-ingleses-do-rio-vermelho-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Ingleses do Rio Vermelho',
        property_type: 'Casa',
        transaction_type: 'Venda',
        price: 1850000,
        price_formatted: 'R$ 1.850.000,00',
        bedrooms: 4,
        suites: 2,
        bathrooms: 4,
        parking_spaces: 2,
        area_privativa: 220.0,
        area_total: 360.0,
        description:
          'Qualidade de vida e segurança nos Ingleses em condomínio fechado. Casa com 4 dormitórios (2 suítes), espaço gourmet com churrasqueira, amplo quintal com espaço para piscina, 2 vagas cobertas, acabamento impecável.',
        features: ['Condomínio fechado', '4 quartos', '2 suítes', 'Quintal amplo', 'Ingleses'],
        image_url: '',
        is_active: true,
      },
      {
        code: 'AP317',
        title: 'Apto Alto Padrão em Coqueiros Frente Mar – 4 Suítes e 300 m² Privativos',
        url: 'https://www.brfimoveis.com.br/317/imoveis/venda-apartamento-coqueiros-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Coqueiros',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 4700000,
        price_formatted: 'R$ 4.700.000,00',
        bedrooms: 4,
        suites: 4,
        bathrooms: 5,
        parking_spaces: 4,
        area_privativa: 300.0,
        area_total: 450.0,
        description:
          'Exclusividade absoluta frente ao mar em Coqueiros com 300 m² de área privativa. 4 suítes magistrais, living imponente para 4 ambientes, varanda gourmet integrada de frente para o mar, 4 vagas de garagem.',
        features: [
          'Frente mar cinematográfico',
          '4 suítes',
          '300 m² privativos',
          '4 vagas',
          'Living imponente',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20250919T1948480300-589193047.jpg',
        is_active: true,
      },
      {
        code: 'AP308',
        title: 'Apto Privativo em Nossa Senhora do Rosário – 2 Dorms, Garagem e Elevador',
        url: 'https://www.brfimoveis.com.br/308/imoveis/venda-apartamento-2-quartos-nossa-senhora-do-rosario-sao-jose-sc',
        city: 'São José',
        neighborhood: 'Nossa Senhora do Rosário',
        property_type: 'Apartamento',
        transaction_type: 'Venda',
        price: 380000,
        price_formatted: 'R$ 380.000,00',
        bedrooms: 2,
        suites: 0,
        bathrooms: 1,
        parking_spaces: 1,
        area_privativa: 56.0,
        area_total: 72.0,
        description:
          'Apartamento de frente em Nossa Senhora do Rosário, São José/SC. 2 dormitórios, sacada, vaga de garagem, prédio com elevador, salão de festas. Ótima localização com acesso rápido a Florianópolis e BR-101.',
        features: [
          'Elevador',
          'De frente',
          'Vaga de garagem',
          'Acesso rápido a Florianópolis',
          'Excelente preço',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20250531T0115470300-934659501.jpg',
        is_active: true,
      },
      {
        code: 'AP301',
        title: 'Lançamento Viva Trindade – 1 Quarto com Alta Rentabilidade',
        url: 'https://www.brfimoveis.com.br/301/imoveis/venda-lancamento-lancamento-1-quarto-trindade-florianopolis-sc',
        city: 'Florianópolis',
        neighborhood: 'Trindade',
        property_type: 'Lançamento',
        transaction_type: 'Venda',
        price: 701000,
        price_formatted: 'R$ 701.000,00',
        bedrooms: 1,
        suites: 0,
        bathrooms: 1,
        parking_spaces: 1,
        area_privativa: 42.0,
        area_total: 60.0,
        description:
          'Viva Trindade próximo à UFSC e centros médicos. 1 quarto moderno, planta inteligente, rooftop com piscina, coworking, fitness e lavanderia coletiva. Perfeito para morar com praticidade ou alugar com altíssima taxa de ocupação.',
        features: [
          'Próximo à UFSC',
          'Rooftop com piscina',
          'Coworking',
          'Alta liquidez',
          'Trindade',
        ],
        image_url:
          'https://www.brfimoveis.com.br/admin/imovel/mini/20250226T1934210300-913215710.jpg',
        is_active: true,
      },
    ]

    for (const item of initialProperties) {
      try {
        let existing = null
        try {
          existing = app.findFirstRecordByData('properties', 'code', item.code)
        } catch (_) {}

        const record = existing || new Record(propertiesCol)
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
        record.set('is_active', item.is_active)
        app.save(record)
      } catch (saveErr) {
        console.warn('Error saving property record: ' + String(saveErr))
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('properties')
      app.delete(col)
    } catch (_) {}
  },
)
