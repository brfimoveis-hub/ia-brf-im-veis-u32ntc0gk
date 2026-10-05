/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Localizar usuário Mauro / admin
    let userRecord = null
    try {
      userRecord = app.findFirstRecordByData('users', 'email', 'mauro@brfimoveis.com.br')
    } catch (_) {
      try {
        const users = app.findRecordsByFilter('users', '1=1', '-created', 1, 0)
        if (users && users.length > 0) userRecord = users[0]
      } catch (e) {}
    }
    const userId = userRecord ? userRecord.id : ''

    // 2. Localizar imóvel Vistage Residence na tabela properties
    let vistageProp = null
    try {
      vistageProp = app.findFirstRecordByData('properties', 'code', 'LM342')
    } catch (_) {
      try {
        const vProps = app.findRecordsByFilter(
          'properties',
          "title ~ 'Vistage' || name ~ 'Vistage'",
          '-created',
          1,
          0,
        )
        if (vProps && vProps.length > 0) vistageProp = vProps[0]
      } catch (e) {}
    }
    const vistagePropId = vistageProp ? vistageProp.id : ''

    // 3. Verificar se já existe registro do Ebook/Apresentação Vistage em ai_knowledge_files
    let existingEbook = null
    try {
      const existing = app.findRecordsByFilter(
        'ai_knowledge_files',
        "name ~ 'E-book' || name ~ 'ebook' || name ~ 'Apresentação' || name ~ 'Apresentacao'",
        '-created',
        10,
        0,
      )
      for (const f of existing) {
        const ent = (f.getString('enterprise') || '').toLowerCase()
        const n = (f.getString('name') || '').toLowerCase()
        if (ent.includes('vistage') || n.includes('vistage')) {
          existingEbook = f
          break
        }
      }
    } catch (_) {}

    const vistageEbookMarkdown = `# E-BOOK & APRESENTAÇÃO OFICIAL — VISTAGE RESIDENCE
**Empreendimento:** Vistage Residence
**Endereço:** Córrego Grande, Florianópolis - SC (junto ao Parque Linear do Córrego Grande)
**Incorporação / Construtora:** AJ Coelho Engenharia
**Status da Obra:** Em obras aceleradas / Lançamento
**Página Oficial:** https://www.brfimoveis.com.br/vistage

---

## 1. TABELA DE CONDIÇÕES & VALORES VIGENTES (OUTUBRO/2026)
*Atenção: A antiga tabela com 2 dorm a R$ 608 mil está desativada. As condições vigentes oficiais são:*
- **2 Dormitórios (com suíte, 1 ou 2 vagas):** a partir de **R$ 596.000,00**
- **3 Dormitórios (com suíte, 2 vagas):** a partir de **R$ 890.000,00**
- **Apartamentos Garden (área externa privativa diferenciada):** a partir de **R$ 980.000,00**
- **Coberturas Exclusivas (vista panorâmica definitiva):** sob consulta de disponibilidade

---

## 2. DIFERENCIAIS E CONCEITO DO PROJETO
- **Localização Privilegiada:** No coração do Córrego Grande, a poucos passos da UFSC, UDESC, padarias artesanais, supermercados e restaurantes gastronômicos.
- **Conexão com a Natureza:** Vizinho imediato ao Parque Linear, unindo qualidade de vida, ar puro e conveniência urbana.
- **Acabamento Premium:** Piso em porcelanato retificado nas áreas sociais, piso vinílico nos dormitórios, forro de gesso rebaixado em 100% da unidade, esquadrias com atenuação acústica.
- **Sustentabilidade & Tecnologia:** Reaproveitamento de água pluvial para áreas comuns, iluminação em LED com sensores de presença, espera para veículos elétricos e fechadura eletrônica.
- **Lazer Completo Entregue Equipado e Decorado:**
  - Rooftop com piscina de borda infinita e vista para a mata
  - Espaço Gourmet & Salão de Festas integrado
  - Academia / Fitness center com equipamentos profissionais
  - Coworking com estações de trabalho e sala de reuniões
  - Brinquedoteca e playground infantil
  - Lounge externo com lareira (fire place)

---

## 3. FACILIDADES DE PAGAMENTO E FINANCIAMENTO
- Financiamento direto na construção com a Caixa Econômica Federal (garantia de entrega da obra Caixa).
- Entrada parcelada facilitada direto com a construtora durante o período de obras.
- Aceita utilização do saldo do FGTS na etapa de financiamento bancário.
- Possibilidade de parcelamento flexível da entrada.

---

## 4. INFORMAÇÕES DE VISITAS & ATENDIMENTO
- Decorado aberto para visitação mediante agendamento prévio.
- Atendimento especializado BRF Imóveis: https://www.brfimoveis.com.br/vistage`

    if (!existingEbook) {
      const kfCol = app.findCollectionByNameOrId('ai_knowledge_files')
      const newFile = new Record(kfCol)
      newFile.set('name', 'E-book e Apresentação Oficial Vistage Residence.md')
      newFile.set('enterprise', 'Vistage')
      newFile.set('extracted_text', vistageEbookMarkdown)
      newFile.set('is_active', true)
      newFile.set('size_bytes', vistageEbookMarkdown.length)
      if (userId) newFile.set('user_id', userId)
      if (vistagePropId) newFile.set('property_id', vistagePropId)
      app.saveNoValidate(newFile)
    } else {
      // Atualiza com dados vigentes completos e vincula ao imóvel Vistage
      existingEbook.set('name', 'E-book e Apresentação Oficial Vistage Residence.md')
      existingEbook.set('enterprise', 'Vistage')
      existingEbook.set('extracted_text', vistageEbookMarkdown)
      existingEbook.set('is_active', true)
      if (vistagePropId) existingEbook.set('property_id', vistagePropId)
      app.saveNoValidate(existingEbook)
    }
  },
  (app) => {
    // Reversão
  },
)
