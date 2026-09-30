export interface DriveFolderInfo {
  id: number
  title: string
  category: string
  url: string
  status: 'accessible' | 'private_or_restricted'
  fileCount: number
  files: {
    name: string
    type: 'image' | 'video' | 'doc'
    size?: string
  }[]
  notes: string
  sampleImageKeywords?: string[]
}

export const DRIVE_FOLDERS_DATA: DriveFolderInfo[] = [
  {
    id: 1,
    title: 'Academia',
    category: 'Área Comum & Lazer',
    url: 'https://drive.google.com/drive/folders/1xVSAn4ttP70U1I9g4LVtyaIRWISSxmtn?usp=drive_link',
    status: 'accessible',
    fileCount: 4,
    files: [
      { name: 'Vistage - Academia_01.jpg', type: 'image', size: '11.5 MB' },
      { name: 'Vistage - Academia_02.jpg', type: 'image', size: '9.5 MB' },
      { name: 'Vistage - Academia_03.jpg', type: 'image', size: '10.2 MB' },
      { name: 'Vistage - Academia_04.jpg', type: 'image', size: '11.1 MB' },
    ],
    notes: 'Espaço fitness panorâmico equipado para musculação, cardio e treinamento funcional.',
    sampleImageKeywords: [
      'modern luxury gym',
      'condominium fitness center',
      'treadmills interior view',
    ],
  },
  {
    id: 2,
    title: 'Apto Modelo',
    category: 'Plantas & Interiores',
    url: 'https://drive.google.com/drive/folders/1vy6C6mqMAOcmxPPmx9YQOZbdTrxaEA-a?usp=drive_link',
    status: 'accessible',
    fileCount: 17,
    files: [
      { name: 'Vistage - Apto Modelo_01.jpg', type: 'image', size: '11.8 MB' },
      { name: 'Vistage - Apto Modelo_02.jpg', type: 'image', size: '11.4 MB' },
      { name: 'Vistage - Apto Modelo_03.jpg', type: 'image', size: '11.8 MB' },
      { name: 'Vistage - Apto Modelo_04.jpg', type: 'image', size: '17.4 MB' },
      { name: 'Vistage - Apto Modelo_05.jpg', type: 'image', size: '10.9 MB' },
      { name: 'Vistage - Apto Modelo_06.jpg', type: 'image', size: '12.8 MB' },
      { name: 'Vistage - Apto Modelo_07.jpg', type: 'image', size: '12.5 MB' },
      { name: 'Vistage - Apto Modelo_08.jpg', type: 'image', size: '9.8 MB' },
      { name: 'Vistage - Apto Modelo_09.jpg', type: 'image', size: '15.3 MB' },
      { name: 'Vistage - Apto Modelo_10.jpg', type: 'image', size: '17.0 MB' },
      { name: 'Vistage - Apto Modelo_11.jpg', type: 'image', size: '16.9 MB' },
      { name: 'Vistage - Apto Modelo_12.jpg', type: 'image', size: '8.7 MB' },
      { name: 'Vistage - Apto Modelo_13.jpg', type: 'image', size: '15.4 MB' },
      { name: 'Vistage - Apto Modelo_14.jpg', type: 'image', size: '15.4 MB' },
      { name: 'Vistage - Apto Modelo_15.jpg', type: 'image', size: '14.2 MB' },
      { name: 'Vistage - Apto Modelo_16.jpg', type: 'image', size: '13.1 MB' },
      { name: 'Vistage - Apto Modelo_17.jpg', type: 'image', size: '13.5 MB' },
    ],
    notes:
      'Perspectivas 3D ultra-realistas com living integrado, cozinha gourmet, suítes e acabamentos de altíssimo padrão.',
    sampleImageKeywords: [
      'luxury living room apartment',
      'modern master bedroom suite',
      'open kitchen modern interior',
    ],
  },
  {
    id: 3,
    title: 'Área Comum (Cobertura)',
    category: 'Rooftop & Lazer',
    url: 'https://drive.google.com/drive/folders/1-O7pFFZSKLF5u1cDdjVn9klhtp95gMeW?usp=drive_link',
    status: 'accessible',
    fileCount: 16,
    files: [
      { name: 'Vistage - Piscina Cobertura_01.jpg a 16.jpg', type: 'image', size: '180 MB total' },
    ],
    notes:
      'Piscina de borda infinita no rooftop com deck molhado, solarium, lounges e vista deslumbrante.',
    sampleImageKeywords: [
      'rooftop infinity pool sunset',
      'luxury deck pool lounge',
      'condo pool view',
    ],
  },
  {
    id: 4,
    title: 'Área Comum (Térreo)',
    category: 'Convivência & Família',
    url: 'https://drive.google.com/drive/folders/1QaSiFfJmaHjBlUb9nyawX0uWK3hUUj7j?usp=drive_link',
    status: 'accessible',
    fileCount: 3,
    files: [
      { name: 'Vistage - Banco_Área Comum Térreo.png', type: 'image', size: '2.4 MB' },
      { name: 'Vistage - Pet Place_Área Comum Térreo.png', type: 'image', size: '2.4 MB' },
      { name: 'Vistage - Playground_Área Comum Térreo.png', type: 'image', size: '2.6 MB' },
    ],
    notes:
      'Boulevard térreo com bancos e praça arborizada, Pet Place cercado e Playground infantil seguro.',
    sampleImageKeywords: [
      'playground park condominium',
      'pet place dog park',
      'landscaped condo courtyard',
    ],
  },
  {
    id: 5,
    title: 'Hall de Entrada',
    category: 'Acessos & Recepção',
    url: 'https://drive.google.com/drive/folders/12L4HyxVoiXL6xSy13N9kgfYSzdzUxXya?usp=drive_link',
    status: 'accessible',
    fileCount: 4,
    files: [
      { name: 'Vistage - Hall de Entrada_01.jpg', type: 'image', size: '15.0 MB' },
      { name: 'Vistage - Hall de Entrada_02.jpg', type: 'image', size: '16.3 MB' },
      { name: 'Vistage - Hall de Entrada_03.jpg', type: 'image', size: '13.8 MB' },
      { name: 'Vistage - Hall de Entrada_04.jpg', type: 'image', size: '13.4 MB' },
    ],
    notes:
      'Hall imponente com pé-direito duplo, decoração contemporânea, portaria com controle eletrônico de acesso.',
    sampleImageKeywords: [
      'luxury building entrance lobby',
      'modern condo reception desk',
      'stylish marble entrance lobby',
    ],
  },
  {
    id: 6,
    title: 'Mercado (Garagem)',
    category: 'Facilidades & Conveniência',
    url: 'https://drive.google.com/drive/folders/17azoXAZCsTv0wZWegwY-O-x9guzlY7BV?usp=drive_link',
    status: 'accessible',
    fileCount: 1,
    files: [{ name: 'Vistage - Mercado - Garagem_01.jpg', type: 'image', size: '12.8 MB' }],
    notes:
      'Marketplace autônomo 24 horas integrado ao piso de garagens para compras rápidas sem sair do condomínio.',
    sampleImageKeywords: [
      'grab and go market store',
      'condo convenience store market',
      'smart automated mini market',
    ],
  },
  {
    id: 7,
    title: 'Plantas Humanizadas (PB)',
    category: 'Projetos Arquitetônicos',
    url: 'https://drive.google.com/drive/folders/1-_7ksnp88U2xpZSK8cqmiYW5rrm7u4Ns?usp=drive_link',
    status: 'accessible',
    fileCount: 13,
    files: [
      { name: 'Vistage - Apto Cobertura.png', type: 'image', size: '6.4 MB' },
      { name: 'Vistage - Cobertura Áreas Comuns.png', type: 'image', size: '9.7 MB' },
      { name: 'Vistage - Garagem 2 e 3.png', type: 'image', size: '53.7 MB' },
      { name: 'Vistage - Hall e Garagem.png', type: 'image', size: '30.4 MB' },
      {
        name: 'Vistage - Planta Baixa 1 Pav Tipo Completo (com spa).png',
        type: 'image',
        size: '20.8 MB',
      },
      { name: 'Vistage - Planta Baixa Pav Tipo Completo.png', type: 'image', size: '14.9 MB' },
      { name: 'Vistage - Unidades 01 a 06.png', type: 'image', size: '14.2 MB' },
    ],
    notes:
      'Plantas baixas completas de todas as tipologias (2 dormitórios com suíte, 3 quartos, gardens com spa privativo e coberturas).',
    sampleImageKeywords: [
      'architectural floor plan 2d',
      'modern apartment blueprint',
      'interior floorplan architecture',
    ],
  },
  {
    id: 8,
    title: 'Salão de Festas (Cobertura)',
    category: 'Eventos & Celebração',
    url: 'https://drive.google.com/drive/folders/1MSc4Oy3TyDbQL5NiOBCbWZx40nKH3iCa?usp=drive_link',
    status: 'accessible',
    fileCount: 11,
    files: [
      {
        name: 'Vistage - (Brinquedoteca) Salão de Festas Cobertura_01.jpg',
        type: 'image',
        size: '15.1 MB',
      },
      {
        name: 'Vistage - Área Externa Salão de Festas Cobertura_01 a 03.jpg',
        type: 'image',
        size: '30.0 MB',
      },
      {
        name: 'Vistage - Salão de Festas Cobertura_02 a 11.jpg',
        type: 'image',
        size: '150 MB total',
      },
    ],
    notes:
      'Salão de festas na cobertura totalmente climatizado, mobiliado e decorado, com brinquedoteca integrada e terraço ao ar livre.',
    sampleImageKeywords: [
      'luxury event hall party space',
      'modern dining party room',
      'chic lounge banquet table',
    ],
  },
  {
    id: 9,
    title: 'Salão Gourmet (Térreo)',
    category: 'Gastronomia & Amigos',
    url: 'https://drive.google.com/drive/folders/1w_gkAn4qiyx2Ezhar81bvWqxbOXkWVUi?usp=drive_link',
    status: 'accessible',
    fileCount: 14,
    files: [
      { name: 'Vistage - Salão Gourmet - Térreo_01 a 14.jpg', type: 'image', size: '210 MB total' },
    ],
    notes:
      'Espaço gourmet no térreo com bancada de chef, churrasqueira, fogão por indução e ambiente intimista para receber amigos.',
    sampleImageKeywords: [
      'modern gourmet kitchen bar',
      'chic dining room island grill',
      'stylish bistro room',
    ],
  },
  {
    id: 10,
    title: 'Vista dos Andares (Vídeos)',
    category: 'Experiência & Visual 360°',
    url: 'https://drive.google.com/drive/folders/1I5CwhlcYKdH-E8pryn5-blZJiZD5dopB?usp=drive_link',
    status: 'accessible',
    fileCount: 14,
    files: [
      { name: '3.mp4 a 13.mp4 (Takes de drone andar a andar)', type: 'video', size: '1.2 GB' },
      { name: '201 A.mp4, Cobertura.mp4, Terraço.mp4', type: 'video', size: '310 MB' },
    ],
    notes:
      'Filmagens reais de drone mostrando a vista livre do mar e da baía norte em cada pavimento (do 3º à Cobertura).',
    sampleImageKeywords: [
      'aerial drone view sea bay city',
      'coastal town panorama florianopolis',
      'blue ocean coastal horizon',
    ],
  },
  {
    id: 11,
    title: 'Material Comercial / Branding / Caderno',
    category: 'Identidade & Vendas',
    url: 'https://drive.google.com/drive/folders/1N2ZoIoG8nO7RJ0V9airYqpS2vgMvEoFF?usp=drive_link',
    status: 'private_or_restricted',
    fileCount: 0,
    files: [],
    notes:
      'Pasta com permissão restrita no Google Drive (requer autorização/compartilhamento "Qualquer pessoa com o link"). A landing page estruturou os espaços e placeholders para este material.',
  },
]

export const VISTAGE_PROJECT_DETAILS = {
  name: 'Vistage Residence',
  developer: 'AJ Coelho Construtora',
  agency: 'BRF Imóveis',
  agentName: 'Bia — Especialista BRF',
  city: 'São José / Grande Florianópolis - SC',
  neighborhood: 'Barreiros',
  priceFrom: 'R$ 596.000',
  priceFromNum: 596000,
  wabaPhone: '+55 48 99209-8050',
  wabaNumberRaw: '5548992098050',
  officialWebsite: 'brfimoveis.com.br',
  tagline: 'O novo marco de sofisticação, conforto e vista privilegiada em Barreiros',
  totalUnits: 79,
  typologies: [
    {
      id: 'typ-1',
      name: '2 Dormitórios c/ Suíte',
      area: '63m² a 72m²',
      startingPrice: 'A partir de R$ 596.000',
      description:
        'Living integrado à sacada com churrasqueira a carvão, 1 suíte espaçosa + 1 dormitório, 1 a 2 vagas de garagem privativa.',
      highlights: [
        'Sacada com churrasqueira a carvão',
        'Persianas integradas nos dormitórios',
        'Piso porcelanato e teto rebaixado em gesso',
        'Espera para split em todos os ambientes',
      ],
      badge: 'Mais Procurado',
    },
    {
      id: 'typ-2',
      name: '3 Dormitórios c/ Suíte',
      area: '86m² a 105m²',
      startingPrice: 'A partir de R$ 890.000',
      description:
        'Ampla área social com estar e jantar, cozinha aberta integrada, suíte máster com closet, sacada gourmet espaçosa.',
      highlights: [
        'Suíte máster ampla com ventilação natural',
        'Lavabo social separado',
        '2 vagas de garagem privativas',
        'Vista privilegiada para o mar/bairro',
      ],
      badge: 'Família & Conforto',
    },
    {
      id: 'typ-3',
      name: 'Apartamento Garden com Terraço',
      area: '130m² a 150m²',
      startingPrice: 'A partir de R$ 980.000',
      description:
        'O privilégio de viver como em uma casa com toda a segurança de um condomínio fechado. Terraço privativo com espera para ofurô/SPA.',
      highlights: [
        'Quintal/Terraço privativo amplo',
        'Área gourmet externa exclusiva',
        'Opção de SPA/Jacuzzi privativo',
        'Excelente ventilação e insolação',
      ],
      badge: 'Exclusivo Garden',
    },
    {
      id: 'typ-4',
      name: 'Cobertura Duplex Linear',
      area: 'Até 296m²',
      startingPrice: 'Sob Consulta',
      description:
        'Planta nobre com vista panorâmica definitiva, terraço privativo de tirar o fôlego, suítes máster com closet e até 3 vagas.',
      highlights: [
        'Vista panorâmica 360° para o mar e a serra',
        'Terraço com piscina privativa',
        '3 a 4 vagas de garagem + hobby box',
        'Acabamento premium exclusivo',
      ],
      badge: 'Alto Padrão',
    },
  ],
  differentials: [
    {
      title: 'Rooftop com Piscina Panorâmica',
      desc: 'Piscina de borda infinita na cobertura com vista definitiva para a baía, deck molhado e solarium.',
      icon: 'Waves',
    },
    {
      title: 'Academia Completa no Rooftop',
      desc: 'Espaço fitness panorâmico equipado com aparelhos modernos para treino diário sem sair de casa.',
      icon: 'Dumbbell',
    },
    {
      title: 'Dois Salões Sociais Independentes',
      desc: 'Salão Gourmet no térreo para confraternizações intimistas + Salão de Festas na cobertura com brinquedoteca.',
      icon: 'Utensils',
    },
    {
      title: 'Marketplace 24h na Garagem',
      desc: 'Conveniência honest-market no subsolo para compras de emergência e lanches a qualquer hora.',
      icon: 'ShoppingBag',
    },
    {
      title: 'Espaço Pet & Playground Térreo',
      desc: 'Ambientes dedicados para a diversão das crianças e o passeio seguro do seu animal de estimação.',
      icon: 'PawPrint',
    },
    {
      title: 'Padrão Construtivo AJ Coelho',
      desc: 'Mais de 30 anos de solidez, garantia de entrega, acabamentos de primeira linha e valorização patrimonial.',
      icon: 'ShieldCheck',
    },
  ],
}
