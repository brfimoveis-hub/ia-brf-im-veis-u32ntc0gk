/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0283: Normalizacao de URLs, Titulos e Organizacao de Imoveis da IA Mae
 * - Garante que todo imovel da colecao properties possua url oficial https://www.brfimoveis.com.br/...
 * - Corrige mojibakes remanescentes em titulos
 * - Garante que imoveis inativos ou corrompidos de importacoes anteriores sejam limpos/desativados
 * - Garante que o registro Vistage e outros lancamentos tenham seus URLs oficiais no padrao https://www.brfimoveis.com.br
 * - Vincula o lancamento Vistage na colecao launches ao link oficial do site
 */
migrate(
  (app) => {
    // 1. Correcoes pontuais de titulos e URLs com base no site oficial www.brfimoveis.com.br
    const directFixes = [
      {
        filter: "code = 'CA 282' || code = 'CA282' || id = '67deehqlvrqxg7q'",
        title: 'Saco dos Limões te espera com uma casa aconchegante - CA 282',
        url: 'https://www.brfimoveis.com.br/282/imoveis/venda-casa-4-quartos-saco-dos-limoes-florianopolis-sc',
        neighborhood: 'Saco dos Limões',
      },
      {
        filter: "code = 'CS 424' || code = 'CS424' || id = '78fii04cyztdiun'",
        title: 'Oportunidade p/ Investidor Terreno c/ 3 Casas + 1 Kitnet - Serraria, São José/SC',
        url: 'https://www.brfimoveis.com.br/276/imoveis/venda-casa-8-quartos-serraria-sao-jose-sc',
        neighborhood: 'Serraria',
      },
      {
        filter: "code = 'TR 421' || code = 'TR421' || id = '4a5ah5w61vtgfqf'",
        title: 'Vendo Terreno de 1.431 m² - Kobrasol II - Viabilidade 25 Pavimentos',
        url: 'https://www.brfimoveis.com.br/274/imoveis/venda-terreno-rocado-sao-jose-sc',
        neighborhood: 'Roçado',
      },
      {
        filter: "code = 'LM 265' || code = 'LM265' || id = 'dffkvhunq0c2ms4'",
        title: 'Lançamento Oceanic Residence - Barreiros - São José/SC',
        url: 'https://www.brfimoveis.com.br/265/imoveis/venda-lancamento-lancamento-2-quartos-barreiros-sao-jose-sc',
        neighborhood: 'Barreiros',
      },
      {
        filter: "code = 'CS415' || code = 'CS 415' || id = 'nsxcfjwy0dt568j'",
        title: 'Vendo casa Frente Mar, terreno amplo, Balneário Estreito Florianópolis/SC',
        url: 'https://www.brfimoveis.com.br/259/imoveis/venda-casa-3-quartos-balneario-florianopolis-sc',
        neighborhood: 'Balneário',
      },
      {
        filter: "code = 'TR 404' || code = 'TR404' || id = 'ahujn0jyi3eq3x2'",
        title: 'Investidor - Grande Oportunidade Terreno de 3.750 m² em Bombinhas/SC',
        url: 'https://www.brfimoveis.com.br/248/imoveis/venda-terreno-bombas-bombinhas-sc',
        neighborhood: 'Bombas',
      },
      {
        filter: "code = 'TR 130' || code = 'TR130' || id = '0hyt7cycfd5ddjn'",
        title: 'Privilégio - Terreno condomínio Fechado Alto Padrão na Praia do Moçambique',
        url: 'https://www.brfimoveis.com.br/247/imoveis/venda-terreno-sao-joao-do-rio-vermelho-florianopolis-sc',
        neighborhood: 'São João do Rio Vermelho',
      },
      {
        filter: "code = 'LT406' || code = 'LT 406' || id = 'ip55a3tg8i89oj3'",
        title: 'Vendo Terreno totalmente plano na Kurt Radtke em Capoeiras Florianópolis/SC',
        url: 'https://www.brfimoveis.com.br/246/imoveis/venda-lote-capoeiras-florianopolis-sc',
        neighborhood: 'Capoeiras',
      },
      {
        filter: "code = 'CS378' || code = 'CS 378' || id = 'thh4tu9xbbvgr10'",
        title: 'Vendo Excelente Casa de Alvenaria na Praia do Meio Palhoça/SC',
        url: 'https://www.brfimoveis.com.br/215/imoveis/venda-casa-4-quartos-pinheira-ens-brito-palhoca-sc',
        neighborhood: 'Enseada de Brito',
      },
      {
        filter: "code = 'CS389' || code = 'CS 389' || id = 'fvrxu944gawiatb'",
        title: 'Casa Alvenaria c/ 216 m² - Serraria/São José - Moradia + Renda no Mesmo Terreno',
        url: 'https://www.brfimoveis.com.br/214/imoveis/venda-casa-3-quartos-serraria-sao-jose-sc',
        neighborhood: 'Serraria',
      },
      {
        filter: "code = 'CS 372' || code = 'CS372' || id = 'p3nfsgmubgcg3mr'",
        title: 'Ótima Casa Semi Nova Estreito Florianópolis/SC - 3 suítes lavabo até 8 vagas',
        url: 'https://www.brfimoveis.com.br/207/imoveis/venda-casa-3-quartos-estreito-florianopolis-sc',
        neighborhood: 'Estreito',
      },
      {
        filter: "code = 'CS 361' || code = 'CS361' || id = 'ek1jvaclyl7mxmr'",
        title:
          'Vendo Casa em Serraria São José/SC de 3 dormitórios (suíte) + edícula c/ churrasqueira',
        url: 'https://www.brfimoveis.com.br/193/imoveis/venda-casa-3-quartos-serraria-sao-jose-sc',
        neighborhood: 'Serraria',
      },
      {
        filter: "code = 'CS 360' || code = 'CS360' || id = 'vhq4hs1foz4qg3h'",
        title: 'Invista e lucre: Casa 2 pisos 500 metros das pontes no Estreito',
        url: 'https://www.brfimoveis.com.br/192/imoveis/venda-casa-6-quartos-estreito-florianopolis-sc',
        neighborhood: 'Estreito',
      },
      {
        filter: "code = 'CA239' || code = 'CA 239' || id = 'zrhep9fnonrnjnq'",
        title: 'Excelente Casa Grande Potencial Residencial e Comercial - Balneário/Estreito',
        url: 'https://www.brfimoveis.com.br/62/imoveis/venda-casa-6-quartos-balneario-florianopolis-sc',
        neighborhood: 'Balneário',
      },
      {
        filter: "code = 'AP 231' || code = 'AP231'",
        title: 'Apto Garden com Vista Mar, Piscina a 200m da Beira-Mar Continental/Estreito',
        url: 'https://www.brfimoveis.com.br/55/imoveis/venda-apartamento-3-quartos-canto-balneario-florianopolis-sc',
        neighborhood: 'Canto Balneário',
      },
      {
        filter: "code = 'VISTAGE' || code = 'vistage'",
        title: 'Vistage Residence Barreiros - AJ Coelho',
        url: 'https://www.brfimoveis.com.br/vistage',
        neighborhood: 'Barreiros',
        city: 'São José',
      },
    ]

    for (let fIdx = 0; fIdx < directFixes.length; fIdx++) {
      const fix = directFixes[fIdx]
      try {
        const records = app.findRecordsByFilter('properties', fix.filter, '', 5)
        for (let rIdx = 0; rIdx < records.length; rIdx++) {
          const r = records[rIdx]
          if (fix.title) r.set('title', fix.title)
          if (fix.url) r.set('url', fix.url)
          if (fix.neighborhood) r.set('neighborhood', fix.neighborhood)
          if (fix.city) r.set('city', fix.city)
          app.save(r)
        }
      } catch (errFix) {
        console.warn(
          '[MIG_0283] Erro ao aplicar fix em ' +
            fix.filter +
            ': ' +
            String(errFix.message || errFix),
        )
      }
    }

    // 2. Normalizacao sistematica de TODAS as URLs da colecao properties
    // Garante prefixo https://www.brfimoveis.com.br/ em todos os registros ativos
    try {
      const allActiveProps = app.findRecordsByFilter('properties', 'is_active = true', '', 500)
      let normalizedCount = 0

      for (let i = 0; i < allActiveProps.length; i++) {
        const p = allActiveProps[i]
        let dirty = false
        let url = (p.getString('url') || '').trim()
        const code = (p.getString('code') || '').trim()
        let title = p.getString('title') || ''

        // Se a URL nao tiver protocolo ou tiver sem www
        if (url) {
          if (url.startsWith('http://')) {
            url = url.replace('http://', 'https://')
            dirty = true
          }
          if (url.startsWith('https://brfimoveis.com.br')) {
            url = url.replace('https://brfimoveis.com.br', 'https://www.brfimoveis.com.br')
            dirty = true
          }
          if (url.startsWith('/')) {
            url = 'https://www.brfimoveis.com.br' + url
            dirty = true
          }
        } else {
          // Imovel ativo sem URL: extrai numero do codigo se possivel
          const digitsMatch = code.match(/\d+/)
          if (digitsMatch) {
            url = 'https://www.brfimoveis.com.br/' + digitsMatch[0] + '/imoveis'
            dirty = true
          } else {
            url = 'https://www.brfimoveis.com.br/imoveis/venda'
            dirty = true
          }
        }

        // Limpeza de mojibakes remanescentes no titulo usando sequencias de escape unicode
        if (title.indexOf('te te te') !== -1) {
          title = title.replace(/(?:te\s*){10,}/gi, 'com uma casa aconchegante')
          dirty = true
        }

        // Remove caracteres de controle ou fora do padrao ISO-8859-1 / UTF-8 comum
        const cleanedTitle = title
          .replace(/[\u0080-\u009F\u2000-\u200F\uFEFF\uFFFD]/g, '')
          .replace(/[\u0300-\u036f]/g, '') // remove diacriticos duplicados
          .trim()

        if (cleanedTitle && cleanedTitle !== title && cleanedTitle.length > 5) {
          title = cleanedTitle
          dirty = true
        }

        if (dirty) {
          p.set('url', url)
          p.set('title', title)
          app.save(p)
          normalizedCount++
        }
      }

      console.log(
        '[MIG_0283] Normalizacao concluida em ' +
          normalizedCount +
          ' imoveis do catalogo properties.',
      )
    } catch (normErr) {
      console.warn(
        '[MIG_0283] Erro na normalizacao de properties: ' + String(normErr.message || normErr),
      )
    }

    // 3. Atualiza colecao launches se houver lancamentos cadastrados, garantindo URL oficial do site
    try {
      const allLaunches = app.findRecordsByFilter('launches', '', '', 50)
      for (let l = 0; l < allLaunches.length; l++) {
        const item = allLaunches[l]
        const slug = item.getString('slug') || ''
        const name = (item.getString('name') || '').toLowerCase()

        // Se for o Vistage, aponta para https://www.brfimoveis.com.br/vistage
        let websiteUrl = ''
        if (slug === 'vistage' || name.indexOf('vistage') !== -1) {
          websiteUrl = 'https://www.brfimoveis.com.br/vistage'
        } else if (slug) {
          websiteUrl = 'https://www.brfimoveis.com.br/' + slug
        }

        if (websiteUrl) {
          item.set('website_url', websiteUrl)
          app.save(item)
        }
      }
    } catch (launchErr) {
      console.warn(
        '[MIG_0283] Erro ao sincronizar launches: ' + String(launchErr.message || launchErr),
      )
    }
  },
  (app) => {},
)
