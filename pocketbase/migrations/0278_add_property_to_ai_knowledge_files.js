/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ai_knowledge_files')
    const propertiesCol = app.findCollectionByNameOrId('properties')

    if (!col.fields.getByName('property_id')) {
      col.fields.add(
        new RelationField({
          name: 'property_id',
          collectionId: propertiesCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    try {
      col.addIndex('idx_ai_knowledge_files_property', false, 'property_id', '')
    } catch (_) {}

    app.save(col)

    // Auto-vincular arquivos já existentes que correspondam a imóveis do catálogo
    try {
      const allProps = app.findRecordsByFilter('properties', 'is_active = true', '-created', 100, 0)
      const allFiles = app.findRecordsByFilter(
        'ai_knowledge_files',
        'is_active != false',
        '-created',
        200,
        0,
      )

      if (allProps && allProps.length > 0 && allFiles && allFiles.length > 0) {
        for (let i = 0; i < allFiles.length; i++) {
          const fileRec = allFiles[i]
          if (fileRec.getString('property_id')) continue

          const fName = (fileRec.getString('name') || '').toLowerCase()
          const fEnterprise = (fileRec.getString('enterprise') || '').toLowerCase()
          const fText = (fileRec.getString('extracted_text') || '').substring(0, 1000).toLowerCase()
          const fCombined = fName + ' ' + fEnterprise + ' ' + fText

          for (let j = 0; j < allProps.length; j++) {
            const p = allProps[j]
            const pCode = (p.getString('code') || '').toLowerCase().trim()
            const pCodeClean = pCode.replace(/[\s\-_]/g, '')
            const pTitle = (p.getString('title') || '').toLowerCase().trim()

            let matches = false
            if (pCode && pCode.length >= 3 && fCombined.indexOf(pCode) !== -1) {
              matches = true
            } else if (
              pCodeClean &&
              pCodeClean.length >= 3 &&
              fCombined.replace(/[\s\-_]/g, '').indexOf(pCodeClean) !== -1
            ) {
              matches = true
            } else if (
              (pTitle.indexOf('vistage') !== -1 && fCombined.indexOf('vistage') !== -1) ||
              (pTitle.indexOf('viva balneário') !== -1 &&
                (fCombined.indexOf('viva balne') !== -1 ||
                  fCombined.indexOf('viva_balne') !== -1)) ||
              (pTitle.indexOf('neo continente') !== -1 &&
                fCombined.indexOf('neo continente') !== -1) ||
              (pTitle.indexOf('colinas de são pedro') !== -1 &&
                (fCombined.indexOf('colinas') !== -1 || fCombined.indexOf('são pedro') !== -1)) ||
              (pTitle.indexOf('solar di plaza') !== -1 &&
                (fCombined.indexOf('solar plaza') !== -1 ||
                  fCombined.indexOf('solar di plaza') !== -1))
            ) {
              matches = true
            }

            if (matches) {
              fileRec.set('property_id', p.id)
              if (!fileRec.getString('enterprise')) {
                fileRec.set('enterprise', p.getString('title') || p.getString('code'))
              }
              app.saveNoValidate(fileRec)
              break
            }
          }
        }
      }
    } catch (linkErr) {
      console.warn('[MIGRATION 0278] Erro não fatal na auto-vinculação: ' + String(linkErr))
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ai_knowledge_files')
      try {
        col.removeIndex('idx_ai_knowledge_files_property')
      } catch (_) {}
      const field = col.fields.getByName('property_id')
      if (field) {
        col.fields.removeByName('property_id')
      }
      app.save(col)
    } catch (_) {}
  },
)
