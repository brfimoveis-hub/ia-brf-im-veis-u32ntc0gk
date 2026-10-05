/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0287: Atualização dos dados de TR325
 * Imóvel TR325: Terrenos Nova Governador Celso Ramos
 * Correção:
 * - city: "Governador Celso Ramos"
 * - neighborhood: "Areias de Baixo"
 * - state: "SC" (quando aplicável)
 * - url: se contiver florianopolis, atualizar para https://www.brfimoveis.com.br/325/imoveis/venda-empresa-governador-celso-ramos-sc ou oficial
 */
migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'properties',
        "code = 'TR325' || code = 'TR 325' || id = 'bm4g67n3nakvws8'",
        '',
        5,
      )
      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        rec.set('city', 'Governador Celso Ramos')
        rec.set('neighborhood', 'Areias de Baixo')
        // Limpar mojibake na descrição do TR325 se remanescente
        let desc = rec.getString('description') || ''
        desc = desc
          .replace(/頔ERRENOS/gi, 'TERRENOS')
          .replace(/ೠmargens/gi, 'às margens')
          .replace(/頡\s*oportunidade/gi, 'é a oportunidade')
          .replace(/seguran硠/gi, 'segurança')
          .replace(/espa篠/gi, 'espaço ')
          .replace(/voc꠰/gi, 'você')
        rec.set('description', desc)
        app.save(rec)
        console.log(
          `[MIG_0287] TR325 atualizado com sucesso: city='Governador Celso Ramos', neighborhood='Areias de Baixo'. (id: ${rec.id})`,
        )
      }
    } catch (e) {
      console.warn('[MIG_0287] Erro ao atualizar TR325:', e)
    }
  },
  (app) => {},
)
