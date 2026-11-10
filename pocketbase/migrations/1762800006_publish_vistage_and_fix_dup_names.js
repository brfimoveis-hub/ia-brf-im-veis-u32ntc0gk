// Rodada de execução pura (Mauro):
// 1. Corrige duplicação de nome surgida no rename — properties.title e
//    ai_knowledge_files (enterprise/summary/name/extrato) ficaram com
//    "Residencial Residencial Vistage Residence" / "Vistage Residence Barreiros"
//    em registros antigos. Idempotente: colapsa "Residencial Residencial" →
//    "Residencial" e normaliza variantes para o nome oficial.
// 2. Publica a landing do Vistage: launches.status = 'publicado'
//    (aprovada pelo Mauro). Idempotente — só seta se ainda não estiver.
//
// Regras respeitadas: disparo nasce DESLIGADO (campaign_dispatch_active
// permanece false e não é tocado aqui); valores nunca congelados em prompt.

migrate(
  (app) => {
    var NEW = 'Residencial Vistage Residence'
    var DUP = 'Residencial Residencial '

    function dedup(text) {
      if (!text) return text
      var out = String(text)
      // Colapsa repetições acumuladas do prefixo
      while (out.indexOf(DUP + DUP) !== -1) out = out.split(DUP + DUP).join(DUP)
      out = out.split(DUP).join('Residencial ')
      return out
    }

    var changedTotal = 0

    // ---- launches: publicar + garantir nome exato ----
    try {
      var launches = app.findRecordsByFilter(
        'launches',
        "slug ~ 'vistage' || name ~ 'Vistage' || enterprise_name ~ 'Vistage'",
        '',
        0,
        0,
      )
      for (var i = 0; i < launches.length; i++) {
        var l = launches[i]
        var changed = false

        if (l.getString('status') !== 'publicado') {
          l.set('status', 'publicado')
          changed = true
        }

        var name = dedup(l.getString('name') || '')
        if (name !== NEW) {
          l.set('name', NEW)
          changed = true
        }
        var ent = dedup(l.getString('enterprise_name') || '')
        if (ent !== NEW) {
          l.set('enterprise_name', NEW)
          changed = true
        }

        // Textos livres: só dedup, preservando o resto
        var textFields = ['headline', 'description', 'cta_default_message', 'raw_material']
        for (var f = 0; f < textFields.length; f++) {
          var v = l.getString(textFields[f])
          if (v) {
            var nv = dedup(v)
            if (nv !== v) {
              l.set(textFields[f], nv)
              changed = true
            }
          }
        }

        if (changed) {
          app.save(l)
          changedTotal++
          console.log('[1762800006] launches ' + l.id + ' status=' + l.getString('status'))
        }
      }
    } catch (e) {
      console.error('[1762800006] launches: ' + e)
      throw e
    }

    // ---- properties: title sem duplicação ----
    try {
      var props = app.findRecordsByFilter('properties', "title ~ 'Vistage'", '', 0, 0)
      for (var p = 0; p < props.length; p++) {
        var prop = props[p]
        var title = dedup(prop.getString('title') || '')
        if (title !== NEW && title.indexOf(NEW) === 0) {
          // "Residencial Vistage Residence ..." — manter como está (sufixo tipo - AJ Coelho)
          prop.set('title', title)
        } else if (title === NEW || title === NEW + ' - AJ Coelho') {
          prop.set('title', title)
        } else if (title !== prop.getString('title')) {
          // normaliza para o oficial com sufixo
          prop.set('title', NEW + ' - AJ Coelho')
        }
        if (prop.getString('title') !== (prop.original && prop.original().getString('title'))) {
          app.save(prop)
          changedTotal++
          console.log('[1762800006] properties ' + prop.id + ' title=' + prop.getString('title'))
        }
      }
    } catch (e2) {
      console.error('[1762800006] properties: ' + e2)
      throw e2
    }

    // ---- ai_knowledge_files: enterprise/summary/name dedup ----
    try {
      var kfs = app.findRecordsByFilter('ai_knowledge_files', "enterprise ~ 'Vistage'", '', 0, 0)
      var kfCount = 0
      for (var k = 0; k < kfs.length; k++) {
        var kf = kfs[k]
        var kChanged = false
        var kEnt = dedup(kf.getString('enterprise') || '')
        if (kEnt !== kf.getString('enterprise')) {
          kf.set('enterprise', kEnt)
          kChanged = true
        }
        var kSum = dedup(kf.getString('summary') || '')
        if (kSum !== kf.getString('summary')) {
          kf.set('summary', kSum)
          kChanged = true
        }
        var kName = dedup(kf.getString('name') || '')
        if (
          kName !== kf.getString('name') &&
          kName.indexOf('.pdf') === -1 &&
          kName.indexOf('.docx') === -1
        ) {
          // só renomeia se não for nome de arquivo com extensão
          kf.set('name', kName)
          kChanged = true
        }
        if (kChanged) {
          app.save(kf)
          kfCount++
        }
      }
      changedTotal += kfCount
      console.log('[1762800006] ai_knowledge_files atualizados: ' + kfCount)
    } catch (e3) {
      console.error('[1762800006] ai_knowledge_files: ' + e3)
      throw e3
    }

    // ---- bia_learnings: dedup em content ----
    try {
      var bls = app.findRecordsByFilter(
        'bia_learnings',
        "rule_text ~ 'Residencial Residencial'",
        '',
        0,
        0,
      )
      var blCount = 0
      for (var b = 0; b < bls.length; b++) {
        var bl = bls[b]
        var bContent = dedup(bl.getString('rule_text') || '')
        if (bContent !== bl.getString('rule_text')) {
          bl.set('rule_text', bContent)
          app.save(bl)
          blCount++
        }
      }
      changedTotal += blCount
      console.log('[1762800006] bia_learnings atualizados: ' + blCount)
    } catch (e4) {
      console.error('[1762800006] bia_learnings: ' + e4)
      throw e4
    }

    console.log('[1762800006] Concluída. Registros alterados: ' + changedTotal)
  },
  (app) => {
    // down: sem reversão — publicação e correção aprovadas pelo Mauro
  },
)
