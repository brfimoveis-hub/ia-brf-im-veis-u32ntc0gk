/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Ajuste fino para Opus e Colinas de São Pedro
    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Opus Agronômica' 
    WHERE id = 'eq95yg8hoiig8o2' OR LOWER(name) LIKE '%opus%'
  `)
      .execute()

    app
      .db()
      .newQuery(`
    UPDATE ai_knowledge_files 
    SET enterprise = 'Colinas de São Pedro' 
    WHERE id = 'dwyuujd6m79q4ik' OR LOWER(name) LIKE '%colina%'
  `)
      .execute()
  },
  (app) => {},
)
