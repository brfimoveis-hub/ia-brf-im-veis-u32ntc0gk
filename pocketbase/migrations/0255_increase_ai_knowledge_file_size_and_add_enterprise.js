/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ai_knowledge_files')

    // 1. Adiciona campo 'enterprise' para organização por empreendimento se não existir
    if (!col.fields.getByName('enterprise')) {
      col.fields.add(
        new TextField({
          name: 'enterprise',
          required: false,
        }),
      )
    }

    // 2. Atualiza o campo 'file' para aumentar o limite de 30MB para 100MB (104857600 bytes)
    const fileField = col.fields.getByName('file')
    if (fileField) {
      fileField.maxSize = 104857600 // 100 MB
    }

    // 3. Adiciona índice para buscas/filtros rápidos por empreendimento
    col.addIndex('idx_ai_knowledge_files_enterprise', false, 'enterprise', '')

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ai_knowledge_files')
      col.removeIndex('idx_ai_knowledge_files_enterprise')
      const enterpriseField = col.fields.getByName('enterprise')
      if (enterpriseField) {
        col.fields.removeByName('enterprise')
      }
      const fileField = col.fields.getByName('file')
      if (fileField) {
        fileField.maxSize = 31457280 // Restaura 30 MB
      }
      app.save(col)
    } catch (_) {}
  },
)
