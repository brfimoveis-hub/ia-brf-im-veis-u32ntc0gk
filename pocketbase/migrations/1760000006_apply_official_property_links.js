/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1760000006: Aplicar correspondência exata código/ID -> Link oficial BRF Imóveis
 * Fonte oficial enviada por Mauro verbatim:
 * 49 links canônicos de https://www.brfimoveis.com.br
 * Atualiza 'properties' (campo url) casando por código numérico ou URL existente.
 * Atualiza 'launches' (campo website_url) quando corresponder a um lançamento do catálogo.
 */
migrate(
  (app) => {
    const OFFICIAL_LINKS = [
      {
        id: 344,
        url: 'https://www.brfimoveis.com.br/344/imoveis/venda-apartamento-3-quartos-barreiros-sao-jose-sc',
      },
      {
        id: 343,
        url: 'https://www.brfimoveis.com.br/343/imoveis/venda-apartamento-2-quartos-capoeiras-florianopolis-sc',
      },
      {
        id: 342,
        url: 'https://www.brfimoveis.com.br/342/imoveis/venda-lancamento-2-quartos-balneario-florianopolis-sc',
      },
      {
        id: 341,
        url: 'https://www.brfimoveis.com.br/341/imoveis/venda-area-rural-fazenda-sao-joaquim-sc',
      },
      {
        id: 339,
        url: 'https://www.brfimoveis.com.br/339/imoveis/venda-terreno-floresta-sao-jose-sc',
      },
      {
        id: 338,
        url: 'https://www.brfimoveis.com.br/338/imoveis/venda-area-tijuquinhas-guaporanga-biguacu-sc',
      },
      {
        id: 337,
        url: 'https://www.brfimoveis.com.br/337/imoveis/venda-lancamento-3-quartos-barreiros-sao-jose-sc',
      },
      {
        id: 336,
        url: 'https://www.brfimoveis.com.br/336/imoveis/venda-apartamento-3-quartos-jurere-internacional-florianopolis-sc',
      },
      {
        id: 334,
        url: 'https://www.brfimoveis.com.br/334/imoveis/venda-apartamento-3-quartos-jurere-internacional-florianopolis-sc',
      },
      {
        id: 333,
        url: 'https://www.brfimoveis.com.br/333/imoveis/venda-apartamento-3-quartos-barreiros-sao-jose-sc',
      },
      {
        id: 331,
        url: 'https://www.brfimoveis.com.br/331/imoveis/venda-casa-4-quartos-ingleses-do-rio-vermelho-florianopolis-sc',
      },
      {
        id: 330,
        url: 'https://www.brfimoveis.com.br/330/imoveis/venda-lancamento-lancamento-florianopolis-sc',
      },
      {
        id: 329,
        url: 'https://www.brfimoveis.com.br/329/imoveis/venda-lancamento-3-quartos-florianopolis-sc',
      },
      {
        id: 328,
        url: 'https://www.brfimoveis.com.br/328/imoveis/venda-apartamento-2-quartos-areias-sao-jose-sc',
      },
      {
        id: 327,
        url: 'https://www.brfimoveis.com.br/327/imoveis/venda-apartamento-3-quartos-capoeiras-florianopolis-sc',
      },
      {
        id: 326,
        url: 'https://www.brfimoveis.com.br/326/imoveis/venda-lancamento-apartamento-2-quartos-florianopolis-sc',
      },
      { id: 325, url: 'https://www.brfimoveis.com.br/325/imoveis/venda-empresa-florianopolis-sc' },
      {
        id: 324,
        url: 'https://www.brfimoveis.com.br/324/imoveis/venda-terreno-em-condominio-cidade-universitaria-pedra-branca-palhoca-sc',
      },
      {
        id: 322,
        url: 'https://www.brfimoveis.com.br/322/imoveis/venda-apartamento-3-quartos-passa-vinte-palhoca-sc',
      },
      {
        id: 321,
        url: 'https://www.brfimoveis.com.br/321/imoveis/venda-casa-4-quartos-balneario-florianopolis-sc',
      },
      {
        id: 320,
        url: 'https://www.brfimoveis.com.br/320/imoveis/venda-apartamento-3-quartos-centro-balneario-camboriu-sc',
      },
      {
        id: 318,
        url: 'https://www.brfimoveis.com.br/318/imoveis/venda-apartamento-3-quartos-coqueiros-florianopolis-sc',
      },
      {
        id: 317,
        url: 'https://www.brfimoveis.com.br/317/imoveis/venda-apartamento-coqueiros-florianopolis-sc',
      },
      {
        id: 311,
        url: 'https://www.brfimoveis.com.br/311/imoveis/venda-lancamento-lancamento-2-quartos-agronomica-florianopolis-sc',
      },
      {
        id: 310,
        url: 'https://www.brfimoveis.com.br/310/imoveis/venda-lancamento-lancamento-2-quartos-rio-caveiras-biguacu-sc',
      },
      {
        id: 309,
        url: 'https://www.brfimoveis.com.br/309/imoveis/venda-apartamento-3-quartos-balneario-florianopolis-sc',
      },
      {
        id: 308,
        url: 'https://www.brfimoveis.com.br/308/imoveis/venda-apartamento-2-quartos-nossa-senhora-do-rosario-sao-jose-sc',
      },
      {
        id: 306,
        url: 'https://www.brfimoveis.com.br/306/imoveis/venda-lancamento-empresa-governador-celso-ramos-governador-celso-ramos-sc',
      },
      {
        id: 301,
        url: 'https://www.brfimoveis.com.br/301/imoveis/venda-lancamento-lancamento-1-quarto-trindade-florianopolis-sc',
      },
      {
        id: 296,
        url: 'https://www.brfimoveis.com.br/296/imoveis/venda-lancamento-lancamento-3-quartos-centro-balneario-camboriu-sc',
      },
      {
        id: 295,
        url: 'https://www.brfimoveis.com.br/295/imoveis/venda-lancamento-lancamento-2-quartos-areias-sao-jose-sc',
      },
      {
        id: 289,
        url: 'https://www.brfimoveis.com.br/289/imoveis/venda-lancamento-lancamento-2-quartos-estreito-florianopolis-sc',
      },
      {
        id: 284,
        url: 'https://www.brfimoveis.com.br/284/imoveis/venda-casa-3-quartos-ingleses-do-rio-vermelho-florianopolis-sc',
      },
      {
        id: 282,
        url: 'https://www.brfimoveis.com.br/282/imoveis/venda-casa-4-quartos-saco-dos-limoes-florianopolis-sc',
      },
      {
        id: 276,
        url: 'https://www.brfimoveis.com.br/276/imoveis/venda-casa-8-quartos-serraria-sao-jose-sc',
      },
      {
        id: 274,
        url: 'https://www.brfimoveis.com.br/274/imoveis/venda-terreno-rocado-sao-jose-sc',
      },
      {
        id: 265,
        url: 'https://www.brfimoveis.com.br/265/imoveis/venda-lancamento-lancamento-2-quartos-barreiros-sao-jose-sc',
      },
      {
        id: 259,
        url: 'https://www.brfimoveis.com.br/259/imoveis/venda-casa-3-quartos-balneario-florianopolis-sc',
      },
      {
        id: 248,
        url: 'https://www.brfimoveis.com.br/248/imoveis/venda-terreno-bombas-bombinhas-sc',
      },
      {
        id: 247,
        url: 'https://www.brfimoveis.com.br/247/imoveis/venda-terreno-sao-joao-do-rio-vermelho-florianopolis-sc',
      },
      {
        id: 246,
        url: 'https://www.brfimoveis.com.br/246/imoveis/venda-lote-capoeiras-florianopolis-sc',
      },
      {
        id: 224,
        url: 'https://www.brfimoveis.com.br/224/imoveis/venda-apartamento-3-quartos-jurere-internacional-florianopolis-sc',
      },
      {
        id: 215,
        url: 'https://www.brfimoveis.com.br/215/imoveis/venda-casa-4-quartos-pinheira-ens-brito-palhoca-sc',
      },
      {
        id: 214,
        url: 'https://www.brfimoveis.com.br/214/imoveis/venda-casa-3-quartos-serraria-sao-jose-sc',
      },
      {
        id: 207,
        url: 'https://www.brfimoveis.com.br/207/imoveis/venda-casa-3-quartos-estreito-florianopolis-sc',
      },
      {
        id: 193,
        url: 'https://www.brfimoveis.com.br/193/imoveis/venda-casa-3-quartos-serraria-sao-jose-sc',
      },
      {
        id: 192,
        url: 'https://www.brfimoveis.com.br/192/imoveis/venda-casa-6-quartos-estreito-florianopolis-sc',
      },
      {
        id: 62,
        url: 'https://www.brfimoveis.com.br/62/imoveis/venda-casa-6-quartos-balneario-florianopolis-sc',
      },
      {
        id: 55,
        url: 'https://www.brfimoveis.com.br/55/imoveis/venda-apartamento-3-quartos-canto-balneario-florianopolis-sc',
      },
    ]

    // Mapa ID -> URL oficial
    const linkMap = {}
    for (let i = 0; i < OFFICIAL_LINKS.length; i++) {
      linkMap[OFFICIAL_LINKS[i].id] = OFFICIAL_LINKS[i].url
    }

    // Função de extração de número do código (ex: "AP343" -> 343, "LM 329" -> 329, "CS 424" -> 424)
    function extractCodeNumber(codeStr) {
      if (!codeStr || typeof codeStr !== 'string') return null
      const m = codeStr.match(/\d+/)
      return m ? parseInt(m[0], 10) : null
    }

    // Função de extração de ID a partir de URL do formato /ID/imoveis/
    function extractUrlId(urlStr) {
      if (!urlStr || typeof urlStr !== 'string') return null
      const m = urlStr.match(/\/(\d+)\/imoveis\//)
      return m ? parseInt(m[1], 10) : null
    }

    // 1. Atualizar registros em properties
    const allProps = app.findRecordsByFilter('properties', '', '', 500)
    let updatedPropsCount = 0

    for (let i = 0; i < allProps.length; i++) {
      const prop = allProps[i]
      const code = prop.getString('code')
      const currentUrl = prop.getString('url')
      const codeNum = extractCodeNumber(code)
      const urlNum = extractUrlId(currentUrl)

      let targetUrl = null

      // Casamento por número extraído da URL atual (se já tem ID 344 etc.)
      if (urlNum && linkMap[urlNum]) {
        targetUrl = linkMap[urlNum]
      }
      // Casamento por número extraído do código
      else if (codeNum && linkMap[codeNum]) {
        targetUrl = linkMap[codeNum]
      }

      // Casos específicos de mapeamentos legados no catálogo:
      // Ex: AP 231 -> 55
      if (!targetUrl && (code === 'AP 231' || code === 'AP231')) {
        targetUrl = linkMap[55]
      }
      // Ex: CS 424 -> 276
      if (!targetUrl && (code === 'CS 424' || code === 'CS424')) {
        targetUrl = linkMap[276]
      }
      // Ex: TR 421 -> 274
      if (!targetUrl && (code === 'TR 421' || code === 'TR421')) {
        targetUrl = linkMap[274]
      }
      // Ex: CA239 / CA 239 -> 62
      if (!targetUrl && (code === 'CA239' || code === 'CA 239')) {
        targetUrl = linkMap[62]
      }
      // Ex: CS 360 -> 192
      if (!targetUrl && (code === 'CS 360' || code === 'CS360')) {
        targetUrl = linkMap[192]
      }
      // Ex: CS 361 -> 193
      if (!targetUrl && (code === 'CS 361' || code === 'CS361')) {
        targetUrl = linkMap[193]
      }
      // Ex: CS 372 -> 207
      if (!targetUrl && (code === 'CS 372' || code === 'CS372')) {
        targetUrl = linkMap[207]
      }
      // Ex: CS389 -> 214
      if (!targetUrl && (code === 'CS389' || code === 'CS 389')) {
        targetUrl = linkMap[214]
      }
      // Ex: CS378 -> 215
      if (!targetUrl && (code === 'CS378' || code === 'CS 378')) {
        targetUrl = linkMap[215]
      }
      // Ex: LT406 -> 246
      if (!targetUrl && (code === 'LT406' || code === 'LT 406')) {
        targetUrl = linkMap[246]
      }
      // Ex: TR 130 -> 247
      if (!targetUrl && (code === 'TR 130' || code === 'TR130')) {
        targetUrl = linkMap[247]
      }
      // Ex: TR 404 -> 248
      if (!targetUrl && (code === 'TR 404' || code === 'TR404')) {
        targetUrl = linkMap[248]
      }
      // Ex: CS415 -> 259
      if (!targetUrl && (code === 'CS415' || code === 'CS 415')) {
        targetUrl = linkMap[259]
      }
      // Ex: AP387 -> 224
      if (!targetUrl && (code === 'AP387' || code === 'AP 387')) {
        targetUrl = linkMap[224]
      }

      if (targetUrl && targetUrl !== currentUrl) {
        prop.set('url', targetUrl)
        app.save(prop)
        updatedPropsCount++
      }
    }

    console.log('[MIG_1760000006] URLs de properties atualizadas: ' + updatedPropsCount)

    // 2. Atualizar colecao launches quando corresponder a um lançamento do catálogo
    // Ex: Villa dos Açores -> 310 (Rio Caveiras / Biguaçu) ou 280
    // Ex: Vistage Residence -> https://www.brfimoveis.com.br/vistage
    try {
      const allLaunches = app.findRecordsByFilter('launches', '', '', 50)
      for (let j = 0; j < allLaunches.length; j++) {
        const lRec = allLaunches[j]
        const slug = lRec.getString('slug') || ''
        const name = (lRec.getString('name') || '').toLowerCase()
        let currentWeb = lRec.getString('website_url') || ''

        if (slug === 'vistage-residence' || slug === 'vistage' || name.indexOf('vistage') !== -1) {
          if (currentWeb !== 'https://www.brfimoveis.com.br/vistage') {
            lRec.set('website_url', 'https://www.brfimoveis.com.br/vistage')
            app.save(lRec)
          }
        } else if (
          slug === 'villa-dos-acores' ||
          name.indexOf('villa dos açores') !== -1 ||
          name.indexOf('villa dos acores') !== -1
        ) {
          // No catálogo da BRF o lançamento em Rio Caveiras / Biguaçu é o ID 310
          const target310 = linkMap[310]
          if (target310 && currentWeb !== target310) {
            lRec.set('website_url', target310)
            app.save(lRec)
          }
        }
      }
    } catch (launchErr) {
      console.warn(
        '[MIG_1760000006] Erro ao atualizar launches: ' + String(launchErr.message || launchErr),
      )
    }
  },
  (app) => {},
)
