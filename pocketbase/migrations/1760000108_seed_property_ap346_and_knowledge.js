/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Cadastrar / atualizar o imóvel #346 (AP346) no catálogo properties
    const propertiesCol = app.findCollectionByNameOrId('properties')
    let ap346 = null
    try {
      ap346 = app.findFirstRecordByFilter(
        'properties',
        "code = '346' || code = 'AP346' || code = 'AP-346' || url ~ '/346/'",
      )
    } catch (_) {}

    const propertyData = {
      code: 'AP346',
      title: 'Apartamento 2 quartos no Centro, sala e cozinha integradas - mobiliado',
      url: 'https://www.brfimoveis.com.br/346/imoveis/venda-apartamento-2-quartos-centro-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Centro',
      property_type: 'Apartamento',
      transaction_type: 'Venda',
      price: 490000.0,
      price_formatted: 'A partir de R$ 490.000,00 (consultar tabela atualizada)',
      bedrooms: 2,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 0,
      area_privativa: 45.2755,
      area_total: 45.2755,
      description:
        'Senhores Investidores - Oportunidade única - Centrão Florianópolis. Apartamento de 2 quartos no Centro de Florianópolis, a apenas 270 metros do Mercado Público e 1,6 km da Ponte Hercílio Luz. Imóvel 100% mobiliado e equipado no 5º andar, com sala e cozinha americana integradas, operado pela Seazone para locação por temporada (renda imediata). Capacidade para até 6 hóspedes (2 camas queen + 1 sofá-cama de casal). Condomínio: R$ 1.034,00 | IPTU anual: R$ 1.820,00. Prédio com elevador e fechadura biométrica.',
      features: [
        'Florianópolis',
        'Centro',
        '2 quartos',
        '1 banheiro',
        'Mobiliado e equipado',
        'Operado pela Seazone',
        'Locação por temporada',
        'Ar-condicionado split',
        'Cozinha americana',
        'Fechadura biométrica',
        'Elevador',
        'Próximo ao Mercado Público (270m)',
        'Investimento com renda',
      ],
      image_url: 'https://www.brfimoveis.com.br/admin/imovel/mini/10272.jpg',
      is_active: true,
    }

    if (!ap346) {
      ap346 = new Record(propertiesCol)
    }

    ap346.set('code', propertyData.code)
    ap346.set('title', propertyData.title)
    ap346.set('url', propertyData.url)
    ap346.set('city', propertyData.city)
    ap346.set('neighborhood', propertyData.neighborhood)
    ap346.set('property_type', propertyData.property_type)
    ap346.set('transaction_type', propertyData.transaction_type)
    ap346.set('price', propertyData.price)
    ap346.set('price_formatted', propertyData.price_formatted)
    ap346.set('bedrooms', propertyData.bedrooms)
    ap346.set('suites', propertyData.suites)
    ap346.set('bathrooms', propertyData.bathrooms)
    ap346.set('parking_spaces', propertyData.parking_spaces)
    ap346.set('area_privativa', propertyData.area_privativa)
    ap346.set('area_total', propertyData.area_total)
    ap346.set('description', propertyData.description)
    ap346.set('features', propertyData.features)
    ap346.set('image_url', propertyData.image_url)
    ap346.set('is_active', true)
    app.saveNoValidate(ap346)
    console.log('[MIG_1760000108] Imóvel AP346 cadastrado e ativado com ID: ' + ap346.id)

    // 2. Criar ou atualizar o registro de conhecimento (dossiê) em ai_knowledge_files
    const defaultUser = app.findFirstRecordByFilter('users', "email != ''")
    const userId = defaultUser ? defaultUser.id : ''

    const aiKnowledgeCol = app.findCollectionByNameOrId('ai_knowledge_files')
    let knowledgeRec = null
    try {
      knowledgeRec = app.findFirstRecordByFilter(
        'ai_knowledge_files',
        `property_id = '${ap346.id}' || name ~ 'Dossiê do Imóvel AP346'`,
      )
    } catch (_) {}

    const dossieText = `# DOSSIÊ OFICIAL DO IMÓVEL — CÓDIGO AP346 (BRF IMÓVEIS)
## Apartamento 2 quartos no Centro de Florianópolis / SC — Mobiliado e Equipado

- **Transação:** Venda (BRF Imóveis — estritamente venda, nunca aluguel tradicional)
- **Código no Site:** AP346 (ou #346)
- **Link Oficial no Site da BRF:** https://www.brfimoveis.com.br/346/imoveis/venda-apartamento-2-quartos-centro-florianopolis-sc
- **Localização:** Centro, Florianópolis - SC. A apenas 270 metros do Mercado Público de Florianópolis e 1,6 km da Ponte Hercílio Luz.
- **Tipo:** Apartamento Residencial / Comercial (Investimento)
- **Andar:** 5º andar (prédio com elevador)
- **Área Privativa:** 45,28 m²
- **Dormitórios:** 2 quartos
- **Banheiros:** 1 banheiro
- **Vagas de Garagem:** Não possui vaga própria
- **Acomodação:** 2 camas queen + 1 sofá-cama de casal (capacidade para até 6 hóspedes)
- **Status de Mobília:** 100% mobiliado e equipado (Smart TV, Wi-Fi, ar-condicionado split, geladeira, fogão de indução, forno elétrico, micro-ondas, cafeteira, fechadura biométrica com auto check-in)
- **Operação de Renda:** Operado pela Seazone para locação por temporada (Airbnb / Booking), gerando renda passiva imediata para investidores.
- **Custos Fixos:** Condomínio: R$ 1.034,00 / mês | IPTU: R$ 1.820,00 / ano
- **Preço de Venda:** A partir de R$ 490.000,00 (consultar condições e proposta atualizada junto ao Mauro)

### DIRETRIZES DA BIA PARA ESTE IMÓVEL:
1. **Foco no Imóvel do Lead:** Se o cliente citar o imóvel #346, AP346 ou o link de 2 quartos no Centro, responda com foco exclusivo nele.
2. **Regra do Mauro sobre Preço:** Na primeira abordagem, use sempre "a partir de" e nunca mande tabela markdown inteira na primeira resposta.
3. **Público-alvo:** Investidores que buscam retorno com locação por temporada (Seazone) ou compradores que buscam praticidade no Centro de Florianópolis a passos do Mercado Público.
4. **Venda, Nunca Aluguel:** A BRF realiza apenas intermediação de venda do imóvel.
`

    if (!knowledgeRec) {
      knowledgeRec = new Record(aiKnowledgeCol)
      knowledgeRec.set('user_id', userId)
    }

    knowledgeRec.set('name', 'Dossiê do Imóvel AP346 - Centro Florianópolis.md')
    knowledgeRec.set('enterprise', 'Apartamento 2 quartos Centro Florianópolis - AP346')
    knowledgeRec.set('property_id', ap346.id)
    knowledgeRec.set('mime_type', 'text/markdown')
    knowledgeRec.set('file_size', dossieText.length)
    knowledgeRec.set('extracted_text', dossieText)
    knowledgeRec.set(
      'summary',
      'Dossiê completo do apartamento de 2 quartos no Centro de Florianópolis (cód. AP346), 45,28 m², mobiliado, operado pela Seazone para temporada a 270m do Mercado Público.',
    )
    knowledgeRec.set('is_active', true)
    app.saveNoValidate(knowledgeRec)
    console.log('[MIG_1760000108] Dossiê de conhecimento vinculado com sucesso ao imóvel AP346!')
  },
  (app) => {
    try {
      const ap346 = app.findFirstRecordByFilter('properties', "code = 'AP346' || url ~ '/346/'")
      if (ap346) {
        const kf = app.findFirstRecordByFilter('ai_knowledge_files', `property_id = '${ap346.id}'`)
        if (kf) app.delete(kf)
        app.delete(ap346)
      }
    } catch (_) {}
  },
)
