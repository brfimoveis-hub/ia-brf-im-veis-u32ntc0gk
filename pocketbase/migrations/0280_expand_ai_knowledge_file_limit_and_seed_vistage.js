/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const propertiesCol = app.findCollectionByNameOrId('properties')
    const kbCol = app.findCollectionByNameOrId('ai_knowledge_files')

    // 1. Garantir que o limite de arquivo em ai_knowledge_files seja até 500 MB (524288000 bytes)
    // para comportar ebooks de lançamentos pesados com fotos e renders de alta resolução
    try {
      const fileField = kbCol.fields.getByName('file')
      if (fileField) {
        fileField.maxSize = 524288000 // 500 MB
      }
      app.save(kbCol)
      console.log('[MIG_0280] ai_knowledge_files file.maxSize elevado para 500 MB')
    } catch (errKb) {
      console.warn('[MIG_0280] Aviso ao atualizar maxSize ai_knowledge_files:', errKb)
    }

    // 2. Garantir limites de arquivo em launches e users também em 500 MB
    try {
      const launchesCol = app.findCollectionByNameOrId('launches')
      const attField = launchesCol.fields.getByName('attachments')
      if (attField) attField.maxSize = 524288000
      const imgField = launchesCol.fields.getByName('images')
      if (imgField) imgField.maxSize = 524288000
      app.save(launchesCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('users')
      const userKbField = usersCol.fields.getByName('ai_knowledge_files')
      if (userKbField) userKbField.maxSize = 524288000
      app.save(usersCol)
    } catch (_) {}

    // 3. Cadastrar/Garantir o imóvel Vistage Residence no catálogo `properties` para que a
    // auto-vinculação (property_id) funcione automaticamente para ebooks, tabelas e dossiers.
    let vistageProp = null
    try {
      vistageProp = app.findFirstRecordByFilter(
        'properties',
        "code = 'VISTAGE' || code = 'LM-VISTAGE' || title ~ 'Vistage' || url ~ 'vistage'",
      )
    } catch (_) {
      vistageProp = null
    }

    if (!vistageProp) {
      try {
        vistageProp = new Record(propertiesCol)
        vistageProp.set('code', 'VISTAGE')
        vistageProp.set('title', 'Vistage Residence Barreiros')
        vistageProp.set('url', 'https://www.brfimoveis.com.br/vistage')
        vistageProp.set('city', 'São José')
        vistageProp.set('neighborhood', 'Barreiros')
        vistageProp.set('property_type', 'Lançamento')
        vistageProp.set('transaction_type', 'Venda')
        vistageProp.set('price', 596000.0)
        vistageProp.set('price_formatted', 'A partir de R$ 596.000,00')
        vistageProp.set('bedrooms', 2)
        vistageProp.set('suites', 1)
        vistageProp.set('bathrooms', 2)
        vistageProp.set('parking_spaces', 1)
        vistageProp.set('area_privativa', 63.0)
        vistageProp.set('area_total', 85.0)
        vistageProp.set(
          'description',
          'Vistage Residence em Barreiros, São José. Lançamento de alto padrão AJ Coelho com plantas de 2 e 3 dormitórios com suíte, apartamentos Garden e coberturas duplex lineares. Rooftop completo com piscina de borda infinita, academia panorâmica com vista mar, marketplace 24h na garagem e sacada com churrasqueira a carvão.',
        )
        vistageProp.set('features', [
          'Vistage Residence',
          'Barreiros',
          'São José',
          'Lançamento',
          'Rooftop com piscina borda infinita',
          'Academia com vista mar',
          'Marketplace 24h',
          'Churrasqueira a carvão',
          '2 e 3 dormitórios c/ suíte',
          'Construtora AJ Coelho',
        ])
        vistageProp.set(
          'image_url',
          'https://www.brfimoveis.com.br/admin/imovel/mini/20260831T1600430300-579711422.jpg',
        )
        vistageProp.set('is_active', true)
        app.saveNoValidate(vistageProp)
        console.log(
          '[MIG_0280] Imóvel Vistage Residence criado com sucesso no catálogo properties: ID=' +
            vistageProp.id,
        )
      } catch (createErr) {
        console.warn('[MIG_0280] Erro ao criar imóvel Vistage:', createErr)
      }
    } else {
      console.log('[MIG_0280] Imóvel Vistage já existente no catálogo: ID=' + vistageProp.id)
    }

    // 4. Auto-vincular os arquivos de ai_knowledge_files existentes do Vistage ao imóvel Vistage criado/existente
    if (vistageProp) {
      try {
        const vistageFiles = app.findRecordsByFilter(
          'ai_knowledge_files',
          "enterprise ~ 'Vistage' || name ~ 'vistage' || name ~ 'VISTAGE'",
          '-created',
          100,
          0,
        )
        for (let i = 0; i < vistageFiles.length; i++) {
          const f = vistageFiles[i]
          let dirty = false
          if (!f.getString('property_id')) {
            f.set('property_id', vistageProp.id)
            dirty = true
          }
          if (!f.getString('enterprise')) {
            f.set('enterprise', 'Vistage Residence')
            dirty = true
          }
          if (dirty) {
            app.saveNoValidate(f)
            console.log(
              '[MIG_0280] Arquivo ' +
                f.getString('name') +
                ' vinculado com sucesso ao imóvel Vistage ID=' +
                vistageProp.id,
            )
          }
        }
      } catch (linkErr) {
        console.warn('[MIG_0280] Erro ao auto-vincular arquivos Vistage existentes:', linkErr)
      }
    }
  },
  (app) => {
    // down migration
  },
)
