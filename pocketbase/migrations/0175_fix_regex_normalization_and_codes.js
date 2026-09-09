// pocketbase/migrations/0175_fix_regex_normalization_and_codes.js
// Migration corretiva cirúrgica para corrigir suíte/suítes e códigos com espaço

migrate(
  (app) => {
    const existing = app.findRecordsByFilter('properties', 'is_active = true', '-created', 500)

    for (let rec of existing) {
      let dirty = false
      let title = rec.getString('title')
      let desc = rec.getString('description')
      let neigh = rec.getString('neighborhood')
      let code = rec.getString('code')

      // Consertar "suíteítes" -> "suítes" e "suítea" -> "sua"
      if (title.includes('suíteítes')) {
        title = title.replace(/suíteítes/g, 'suítes')
        dirty = true
      }
      if (desc.includes('suíteítes')) {
        desc = desc.replace(/suíteítes/g, 'suítes')
        dirty = true
      }
      if (neigh.includes('Agende') || neigh.includes('suítea')) {
        neigh = ''
        dirty = true
      }

      // Normalizar code: "igo AP 231" ou "AP 231" -> "AP231" ou "AP 231" sem prefixo lixo
      let cleanC = code.replace(/^(?:igo|c[oó]d\.?|#)\s*/i, '').trim()
      if (cleanC !== code) {
        code = cleanC
        dirty = true
      }

      // Se bairro estiver vazio, inferir do URL
      if (!neigh) {
        const url = rec.getString('url')
        if (url.includes('coqueiros')) neigh = 'Coqueiros'
        else if (url.includes('capoeiras')) neigh = 'Capoeiras'
        else if (url.includes('barreiros')) neigh = 'Barreiros'
        else if (url.includes('serraria')) neigh = 'Serraria'
        else if (url.includes('areias')) neigh = 'Areias'
        else if (url.includes('estreito')) neigh = 'Estreito'
        else if (url.includes('balneario') || url.includes('balneário')) neigh = 'Balneário'
        else if (url.includes('trindade')) neigh = 'Trindade'
        else if (url.includes('canasvieiras')) neigh = 'Canasvieiras'
        else if (url.includes('jurere') || url.includes('jurerê')) neigh = 'Jurerê'
        if (neigh) dirty = true
      }

      if (dirty) {
        rec.set('title', title)
        rec.set('description', desc)
        rec.set('neighborhood', neigh)
        rec.set('code', code)
        app.save(rec)
      }
    }

    console.log('[0175_migration] Normalização final de títulos, bairros e códigos concluída.')
  },
  (app) => {},
)
