/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Cria coleção específica para arquivos da Base de Conhecimento da IA (Bia)
    const collection = new Collection({
      name: 'ai_knowledge_files',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'file',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 31457280, // até 30MB
          mimeTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/plain',
            'text/markdown',
            'text/csv',
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
        },
        { name: 'file_size', type: 'number' },
        { name: 'mime_type', type: 'text' },
        { name: 'extracted_text', type: 'text' },
        { name: 'summary', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ai_knowledge_files_user ON ai_knowledge_files (user_id)',
        'CREATE INDEX idx_ai_knowledge_files_active ON ai_knowledge_files (is_active)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ai_knowledge_files')
      app.delete(col)
    } catch (_) {}
  },
)
