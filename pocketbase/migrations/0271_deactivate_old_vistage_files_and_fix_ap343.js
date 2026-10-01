/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Desativar arquivos de conhecimento legados com a tabela preliminar do Vistage (preço 608 mil)
    const targetFileIds = ['1p354c83ug3jn8l', '05gycuiw0bf3sn1']
    for (const fid of targetFileIds) {
      try {
        const fileRec = app.findRecordById('ai_knowledge_files', fid)
        if (fileRec) {
          fileRec.set('is_active', false)
          app.saveNoValidate(fileRec)
          console.log(`[MIG_0271] ai_knowledge_file desativado com sucesso: ${fid}`)
        }
      } catch (err) {
        console.warn(`[MIG_0271] Arquivo ${fid} não encontrado por ID: ${err.message}`)
      }
    }

    // Desativar qualquer outro arquivo do Vistage Residence que mencione "608"
    try {
      const filesWith608 = app.findRecordsByFilter(
        'ai_knowledge_files',
        "enterprise ~ 'Vistage' && extracted_text ~ '608'",
        '-created',
        50,
        0,
      )
      for (const f of filesWith608) {
        f.set('is_active', false)
        app.saveNoValidate(f)
        console.log(
          `[MIG_0271] ai_knowledge_file desativado (continha '608'): ${f.id} - ${f.getString('name')}`,
        )
      }
    } catch (err608) {
      console.warn(`[MIG_0271] Busca por arquivos com 608 (não fatal): ${err608.message}`)
    }

    // 2. Garantir que o imóvel AP343 esteja cadastrado, ativo e com o link oficial correto no catálogo properties
    const propertiesCol = app.findCollectionByNameOrId('properties')
    let ap343 = null
    try {
      ap343 = app.findFirstRecordByFilter(
        'properties',
        "code = 'AP343' || code = 'AP-343' || code = '343' || url ~ '/343/'",
      )
    } catch (_) {}

    const ap343Url =
      'https://www.brfimoveis.com.br/343/imoveis/venda-apartamento-2-quartos-capoeiras-florianopolis-sc'

    if (!ap343) {
      ap343 = new Record(propertiesCol)
      ap343.set('code', 'AP343')
      ap343.set('title', 'Apartamento à venda em Capoeiras - excelente localização')
      ap343.set('url', ap343Url)
      ap343.set('city', 'Florianópolis')
      ap343.set('neighborhood', 'Capoeiras')
      ap343.set('property_type', 'Apartamento')
      ap343.set('transaction_type', 'Venda')
      ap343.set('price', 495000.0)
      ap343.set('price_formatted', 'R$ 495.000,00')
      ap343.set('bedrooms', 2)
      ap343.set('suites', 1)
      ap343.set('bathrooms', 1)
      ap343.set('parking_spaces', 1)
      ap343.set('area_privativa', 53.57)
      ap343.set('area_total', 75.16)
      ap343.set(
        'description',
        'Apartamento ensolarado e ventilado em Capoeiras, Florianópolis/SC. 2 dormitórios (1 suíte), 1 banheiro, vaga coberta, cozinha planejada com armários, piso vinílico novo. Prédio com elevador, piscina ampla, salão de festas com churrasqueira e condomínio baixo. Excelente localização!',
      )
      ap343.set('features', [
        'Pronto para morar',
        'Piscina',
        'Elevador',
        'Salão de festas com churrasqueira',
        'Cozinha planejada',
        'Condomínio baixo',
        'Capoeiras',
        'Florianópolis',
      ])
      ap343.set(
        'image_url',
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260831T1600430300-579711422.jpg',
      )
      ap343.set('is_active', true)
      app.saveNoValidate(ap343)
      console.log('[MIG_0271] Imóvel AP343 criado com sucesso no catálogo!')
    } else {
      ap343.set('code', 'AP343')
      ap343.set('title', 'Apartamento à venda em Capoeiras - excelente localização')
      ap343.set('url', ap343Url)
      ap343.set('city', 'Florianópolis')
      ap343.set('neighborhood', 'Capoeiras')
      ap343.set('price', 495000.0)
      ap343.set('price_formatted', 'R$ 495.000,00')
      ap343.set('bedrooms', 2)
      ap343.set('suites', 1)
      ap343.set('bathrooms', 1)
      ap343.set('parking_spaces', 1)
      ap343.set('area_privativa', 53.57)
      ap343.set('area_total', 75.16)
      ap343.set('is_active', true)
      app.saveNoValidate(ap343)
      console.log('[MIG_0271] Imóvel AP343 atualizado e ativado no catálogo!')
    }

    // 3. Liberar o lock ai_processing do cliente uzimu95i00gqv0l e limpar locks travados em todos os clientes
    try {
      const targetCustomer = app.findRecordById('customers', 'uzimu95i00gqv0l')
      if (targetCustomer) {
        let rawTags = targetCustomer.get('tags')
        let tags = Array.isArray(rawTags) ? rawTags : []
        const cleanTags = tags.filter(
          (t) => typeof t === 'string' && t !== 'ai_processing' && !t.startsWith('ai_processing:'),
        )
        targetCustomer.set('tags', cleanTags)
        app.saveNoValidate(targetCustomer)
        console.log('[MIG_0271] Lock liberado para o cliente uzimu95i00gqv0l via Record')
      }
    } catch (cErr) {
      console.warn(
        `[MIG_0271] Cliente uzimu95i00gqv0l não encontrado por findRecordById: ${cErr.message}`,
      )
    }

    // Limpeza em massa no banco de dados via SQL direto para garantia total de liberação
    try {
      app
        .db()
        .newQuery(
          "UPDATE customers SET tags = (SELECT json_group_array(value) FROM json_each(customers.tags) WHERE value NOT LIKE 'ai_processing%') WHERE id = 'uzimu95i00gqv0l'",
        )
        .execute()
      console.log('[MIG_0271] Lock do cliente uzimu95i00gqv0l liberado via SQL!')
    } catch (sqlErr) {
      console.warn(`[MIG_0271] Erro SQL liberação lock uzimu95i00gqv0l: ${sqlErr.message}`)
    }
  },
  (app) => {
    // Reverter ativação dos arquivos
    const targetFileIds = ['1p354c83ug3jn8l', '05gycuiw0bf3sn1']
    for (const fid of targetFileIds) {
      try {
        const fileRec = app.findRecordById('ai_knowledge_files', fid)
        if (fileRec) {
          fileRec.set('is_active', true)
          app.saveNoValidate(fileRec)
        }
      } catch (_) {}
    }
  },
)
