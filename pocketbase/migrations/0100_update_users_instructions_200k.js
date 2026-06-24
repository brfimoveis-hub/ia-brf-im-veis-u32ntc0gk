/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    const aiInst = col.fields.getByName('ai_instructions')
    if (aiInst) aiInst.max = 200000

    const biaInst = col.fields.getByName('bia_instructions')
    if (biaInst) biaInst.max = 200000

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    const aiInst = col.fields.getByName('ai_instructions')
    if (aiInst) aiInst.max = 0

    const biaInst = col.fields.getByName('bia_instructions')
    if (biaInst) biaInst.max = 0

    app.save(col)
  },
)
