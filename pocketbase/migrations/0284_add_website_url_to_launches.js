// pocketbase/migrations/0284_add_website_url_to_launches.js
/**
 * Garante o campo website_url na coleção launches
 * e popula a URL oficial para o Vistage Residence (https://www.brfimoveis.com.br/vistage).
 */
migrate(
  (app) => {
    try {
      const launchesCol = app.findCollectionByNameOrId('launches')
      if (launchesCol) {
        let fieldExists = false
        try {
          if (launchesCol.fields.getByName('website_url')) {
            fieldExists = true
          }
        } catch (_) {
          fieldExists = false
        }

        if (!fieldExists) {
          launchesCol.fields.add(
            new URLField({
              name: 'website_url',
              required: false,
              presentable: true,
            }),
          )
          app.save(launchesCol)
          console.log('[MIG_0284] Campo website_url adicionado com sucesso à coleção launches')
        }
      }
    } catch (errCol) {
      console.warn('[MIG_0284] Aviso ao adicionar campo website_url em launches:', errCol?.message)
    }

    // Atualiza o registro do Vistage Residence se existir
    try {
      const vistageRecord = app.findFirstRecordByFilter(
        'launches',
        "slug = 'vistage-residence' || name ~ 'Vistage'",
      )
      if (vistageRecord) {
        vistageRecord.set('website_url', 'https://www.brfimoveis.com.br/vistage')
        app.saveNoValidate(vistageRecord)
        console.log(
          '[MIG_0284] Vistage Residence atualizado com website_url oficial: https://www.brfimoveis.com.br/vistage',
        )
      }
    } catch (errVistage) {
      console.warn('[MIG_0284] Aviso ao atualizar website_url do Vistage:', errVistage?.message)
    }
  },
  (app) => {
    try {
      const launchesCol = app.findCollectionByNameOrId('launches')
      if (launchesCol) {
        launchesCol.fields.removeByName('website_url')
        app.save(launchesCol)
      }
    } catch (_) {}
  },
)
