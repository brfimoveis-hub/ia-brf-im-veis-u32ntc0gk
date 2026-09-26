/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Criar coleção market_indices
    const marketIndicesCollection = new Collection({
      name: 'market_indices',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true }, // ex: "INCC-M", "IGP-M"
        { name: 'reference_month', type: 'text', required: true }, // ex: "08/2026", "2026-08"
        { name: 'value', type: 'number', required: true }, // ex: 0.85 ou -0.22 (% mensal)
        { name: 'accumulated_12m', type: 'number' }, // ex: 6.56 ou 2.16 (% 12m)
        { name: 'source', type: 'text' }, // ex: "BCB / FGV"
        { name: 'fetched_at', type: 'date' },
        { name: 'raw_payload', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_market_indices_name_ref ON market_indices (name, reference_month)',
        'CREATE INDEX idx_market_indices_created ON market_indices (created DESC)',
      ],
    })
    app.save(marketIndicesCollection)

    // 2. Inserir semente inicial de índices vigentes para o mês 08/2026 (base de cálculo para set/2026)
    const marketCol = app.findCollectionByNameOrId('market_indices')

    const inccSeed = new Record(marketCol, {
      name: 'INCC-M',
      reference_month: '08/2026',
      value: 0.85,
      accumulated_12m: 6.56,
      source: 'BCB SGS 192 / FGV',
      fetched_at: new Date().toISOString(),
    })
    app.save(inccSeed)

    const igpmSeed = new Record(marketCol, {
      name: 'IGP-M',
      reference_month: '08/2026',
      value: -0.22,
      accumulated_12m: 2.16,
      source: 'BCB SGS 189 / FGV',
      fetched_at: new Date().toISOString(),
    })
    app.save(igpmSeed)

    // 3. Classificar os arquivos existentes em ai_knowledge_files e desativar arquivos vazios (0 bytes)
    // Desativa arquivos de 0 bytes
    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET is_active = 0 
    WHERE file_size = 0 OR file_size IS NULL
  `)
      .execute()

    // Classificação automática com base no nome do arquivo e texto extraído
    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Vistage Residence' 
    WHERE (LOWER(name) LIKE '%vistage%' OR LOWER(extracted_text) LIKE '%vistage%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Viva Trindade' 
    WHERE (LOWER(name) LIKE '%viva%trindade%' OR LOWER(name) LIKE '%viva_trindade%' OR LOWER(extracted_text) LIKE '%viva trindade%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Neo Continente' 
    WHERE (LOWER(name) LIKE '%neo%continente%' OR LOWER(extracted_text) LIKE '%neo continente%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Viva Balneário Estreito' 
    WHERE (LOWER(name) LIKE '%viva%balne%' OR LOWER(name) LIKE '%viva_balne%' OR LOWER(extracted_text) LIKE '%viva balneário%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Essenzia Canasvieiras' 
    WHERE (LOWER(name) LIKE '%essenzia%' OR LOWER(extracted_text) LIKE '%essenzia%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Terrá Jurerê' 
    WHERE (LOWER(name) LIKE '%terr%' OR LOWER(extracted_text) LIKE '%terr%' OR LOWER(extracted_text) LIKE '%tabela de custo/reserva terrá%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Opus Agronômica' 
    WHERE (LOWER(name) LIKE '%opus%' OR LOWER(extracted_text) LIKE '%opus%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Residencial Sophia' 
    WHERE (LOWER(name) LIKE '%sophia%' OR LOWER(extracted_text) LIKE '%residencial sophia%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Colinas de São Pedro' 
    WHERE (LOWER(name) LIKE '%colina%' OR LOWER(extracted_text) LIKE '%colina de s%' OR LOWER(extracted_text) LIKE '%colinas de s%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Condomínio Fly Ville' 
    WHERE (LOWER(name) LIKE '%fly%ville%' OR LOWER(extracted_text) LIKE '%fly ville%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Solar Plaza' 
    WHERE (LOWER(name) LIKE '%solar%plaza%' OR LOWER(extracted_text) LIKE '%solar plaza%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Nova Governador Celso Ramos' 
    WHERE (LOWER(name) LIKE '%nova%gover%' OR LOWER(extracted_text) LIKE '%nova governador%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Luminare Residence' 
    WHERE (LOWER(name) LIKE '%luminare%' OR LOWER(extracted_text) LIKE '%luminare%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Geral / Tráfego & SEO' 
    WHERE (LOWER(name) LIKE '%tr_fego%' OR LOWER(name) LIKE '%palavras chaves%' OR LOWER(name) LIKE '%palavras_chaves%')
      AND (enterprise IS NULL OR enterprise = '')
  `)
      .execute()

    // Para imagens soltas não associadas (ex: fotos de portfólio), manter 'Geral / Portfólio'
    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Geral / Portfólio' 
    WHERE (enterprise IS NULL OR enterprise = '')
  `)
      .execute()
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('market_indices')
    if (collection) {
      app.delete(collection)
    }
  },
)
