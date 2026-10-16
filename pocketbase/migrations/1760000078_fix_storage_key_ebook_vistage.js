migrate(
  (app) => {
    // 1760000078_fix_storage_key_ebook_vistage.js
    console.log('[MIGRATION_1760000078] Ajustando chave no filesystem para pbc_2708644826...')

    const targetRecordId = 'fcvyoatlxt56do2'
    const correctCollectionId = 'pbc_2708644826'

    const bookRec = app.findRecordById('ai_knowledge_files', targetRecordId)
    if (!bookRec) return

    const storedFileName = bookRec.getString('file')
    if (!storedFileName) return

    const fsys = app.newFilesystem()
    try {
      // Ler da chave antiga
      const wrongKey = 'undefined/' + targetRecordId + '/' + storedFileName
      const correctKey = correctCollectionId + '/' + targetRecordId + '/' + storedFileName

      const reader = fsys.getReader(wrongKey)
      if (reader) {
        console.log('[MIGRATION_1760000078] Copiando de ' + wrongKey + ' para ' + correctKey)
        const writer = fsys.newWriter(correctKey)
        writer.readFrom(reader)
        writer.close()
        reader.close()
        console.log('[MIGRATION_1760000078] Cópia concluída!')
      }
    } catch (err) {
      console.warn('[MIGRATION_1760000078] Tentando copy direta: ' + err.message)
      try {
        fsys.copy(
          'undefined/' + targetRecordId + '/' + storedFileName,
          correctCollectionId + '/' + targetRecordId + '/' + storedFileName,
        )
      } catch (err2) {
        console.error('[MIGRATION_1760000078] Erro copy: ' + err2.message)
      }
    } finally {
      fsys.close()
    }
  },
  (app) => {},
)
