// pocketbase/migrations/0282_repair_corrupted_property_titles.js
migrate(
  (app) => {
    // Mapa de correcoes de titulos corrompidos conhecidos
    const corrections = [
      {
        filter: "code = 'AP 337' || code = 'AP337' || id = 'llod7agk19amwja'",
        title: 'REVENDA COLINAS DE São Pedro - ÓTIMO ANDAR/SOL e VISTA 3 DORM/suíte + 2 demi-suíte',
      },
      {
        filter: "id = 's1uos1weufkwohy' || code = 'ARU 341'",
        title: 'Área rural / Fazenda em São Joaquim - Rota das Vinícolas, 132 ha',
      },
      {
        filter: "id = 'x5t5pac4p24kf2q' || code = 'AP387'",
        title: 'Apartamento 3 suítes 3 Vagas de Garagem Jurerê Internacional',
      },
      {
        filter: "id = 'o1y8q6d3cgzvtcl' || code = 'AP334'",
        title: 'Jurerê Internacional - REQUINTADO E ESPAÇOSO APTO. 3 SUÍTES / 3 VAGAS + H.BOX',
      },
      {
        filter: "id = 's0qitmr34cj9uv1' || (code = 'AP 334' && price = 3710000)",
        title: 'Alto Padrão - Apartamento 4 suítes 3 vagas + H.Box em Jurerê Internacional',
      },
      {
        filter: "id = '7w1vb0b4jlc7q2d' || code = 'AP322'",
        title: 'OPORTUNIDADE NA PALHOÇA - APTO NOVO 3 DORMITÓRIOS/SUÍTE/LAVABO - H.BOX/2VG',
      },
      {
        filter: "id = 'od655tg0w1fpqeh' || code = 'AP328'",
        title: 'Apto 2 dormitórios Areias São José, porteira fechada, para morar hoje',
      },
      {
        filter: "id = '15za7eoyuob12m7' || code = 'AP309'",
        title: 'VENDO AMPLO APTO térreo EM Balneário/Estreito MOBILIADO 3 SUÍTES E 2 VAGAS',
      },
    ]

    for (let i = 0; i < corrections.length; i++) {
      const item = corrections[i]
      try {
        const records = app.findRecordsByFilter('properties', item.filter, '', 10)
        for (let j = 0; j < records.length; j++) {
          const rec = records[j]
          rec.set('title', item.title)
          app.save(rec)
        }
      } catch (err) {
        console.log(
          '[Migration 0282] Erro aplicando correcao em ' +
            item.filter +
            ': ' +
            (err && err.message ? err.message : err),
        )
      }
    }

    // Varredura geral em properties e launches para normalizar NFC e substituir sequencias corrompidas
    try {
      const allProps = app.findRecordsByFilter('properties', 'is_active = true', '', 200)
      for (let k = 0; k < allProps.length; k++) {
        const p = allProps[k]
        let t = p.getString('title') || ''
        if (typeof t.normalize === 'function') {
          t = t.normalize('NFC')
        }
        let cleaned = t
          .replace(/\u068c/g, 'Ó')
          .replace(/\ua809/g, 'I')
          .replace(/\u01cf/g, 'ÇO ')
          .replace(/\u0354/g, '')
          .replace(/\u9b20/g, ', ')
          .replace(/\u0360/g, '')
          .replace(/su[ií]te[\u0354]?ES/gi, 'suítes')
          .replace(/su[ií]te[\u0360]?\s*\+\s*2/gi, 'suíte + 2')
          .replace(/espa\u7be0/gi, 'espaço ')
          .replace(/padr\u3bdc/gi, 'padrão,')
          .replace(/voc\ua822usca/gi, 'você busca')
          .replace(/seguran\u7861/gi, 'segurança ')
          .replace(/\u9821/g, 'é a')
          .replace(/im\uddbec\u78a8/gi, 'imóvel')
        if (cleaned !== t) {
          p.set('title', cleaned)
          app.save(p)
        }
      }
    } catch (scanErr) {
      console.log(
        '[Migration 0282] Erro na varredura geral properties: ' +
          (scanErr && scanErr.message ? scanErr.message : scanErr),
      )
    }
  },
  (app) => {
    // Reversao sem acao
  },
)
