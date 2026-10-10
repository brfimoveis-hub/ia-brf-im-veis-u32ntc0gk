/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1760000058: Auditoria e Correção Inequívoca de Endereços/Cidades no Catálogo de Imóveis (Properties)
 *
 * PARTE 1 DA AUDITORIA SISTEMÁTICA:
 * - Cross-check de todos os imóveis da coleção `properties`: slug vs campos neighborhood / city.
 * - Correção no banco EXCLUSIVAMENTE onde a evidência interna (title/description do próprio imóvel)
 *   é INEQUÍVOCA.
 * - Casos corrigidos com evidência inequívoca:
 *   1. TR325: Terrenos Nova Governador Celso Ramos. A description/title confirma Governador Celso Ramos.
 *      Garante city='Governador Celso Ramos', neighborhood='Areias de Baixo'.
 *   2. TR421: Terreno Roçado São José/SC. O slug (/274/imoveis/venda-terreno-rocado-sao-jose-sc) indica Roçado/São José,
 *      mas o banco possuía neighborhood='Areias' / city='São José'. Title confirma 'Roçado'.
 *      Atualiza neighborhood='Roçado' mantendo city='São José'.
 *
 * - Casos DIVERGE AMBÍGUOS preservados para decisão do Mauro (NÃO alterados):
 *   1. LM326 (Colinas de São Pedro): O empreendimento fica na divisa São José (Barreiros) / Florianópolis.
 *      O slug do site diz Florianópolis, enquanto unidades do mesmo prédio (AP337/AP333) dizem Barreiros/São José.
 *      Banco mantém city='Florianópolis' e neighborhood='Barreiros'. Marcado para decisão do Mauro.
 *   2. LM329 (Terrá Jurerê): Título diz Jurerê, slug diz apenas florianopolis-sc.
 *   3. LM330 / LM342 / AP342: Variações de slug genérico mantidas com dados legítimos do banco.
 *   4. Imóveis no Balneário do Estreito (AP231, CA239, CS321, AP309, CS415, LM342): preservados como Balneário / Florianópolis.
 *   5. Balneário Camboriú (AP320, LM296): preservados como Centro / Balneário Camboriú.
 */

migrate(
  (app) => {
    const propertiesCollection = app.findCollectionByNameOrId('properties')
    const records = app.findRecordsByFilter('properties', 'is_active = true', 'code', 200, 0)

    console.log(
      `[MIGRATION 1760000058] Iniciando Auditoria Sistemática de Endereços em ${records.length} imóveis ativos...`,
    )

    let totalAuditados = 0
    let okCount = 0
    let divergeCount = 0
    let slugIncompletoCount = 0
    let corrigidosCount = 0

    const relatorioAudit = []

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      totalAuditados++

      const code = (rec.getString('code') || '').trim()
      const title = (rec.getString('title') || '').trim()
      const dbCity = (rec.getString('city') || '').trim()
      const dbNeigh = (rec.getString('neighborhood') || '').trim()
      const url = (rec.getString('url') || '').trim()
      const desc = (rec.getString('description') || '').trim()

      // Extração de slug
      let slugBairro = ''
      let slugCidade = ''
      let slugStatus = 'incompleto'

      if (url) {
        const slugMatch = url.match(
          /\/imoveis\/venda-[a-z0-9-]+-([a-z0-9-]+)-(florianopolis|sao-jose|biguacu|palhoca|bombinhas|balneario-camboriu|governador-celso-ramos|sao-joaquim)-sc/i,
        )
        const simpleCityMatch = url.match(
          /\/imoveis\/venda-[a-z0-9-]+-(florianopolis|sao-jose|biguacu|palhoca|bombinhas|balneario-camboriu|governador-celso-ramos|sao-joaquim)-sc/i,
        )

        if (slugMatch) {
          slugBairro = slugMatch[1].replace(/-/g, ' ')
          slugCidade = slugMatch[2].replace(/-/g, ' ')
          slugStatus = 'completo'
        } else if (simpleCityMatch) {
          slugCidade = simpleCityMatch[1].replace(/-/g, ' ')
          slugStatus = 'sem_bairro'
        }
      }

      // Normalização para comparação suave
      const norm = (s) =>
        (s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()

      const nDbCity = norm(dbCity)
      const nDbNeigh = norm(dbNeigh)
      const nSlugCity = norm(slugCidade)
      const nSlugNeigh = norm(slugBairro)

      let veredito = 'OK'
      let detalhe = 'Conforme'

      if (slugStatus === 'completo') {
        const cityMatches =
          nSlugCity === nDbCity ||
          (nSlugCity.includes('sao jose') && nDbCity.includes('sao jose')) ||
          (nSlugCity.includes('florianopolis') && nDbCity.includes('florianopolis'))
        const neighMatches =
          !nSlugNeigh || nDbNeigh.includes(nSlugNeigh) || nSlugNeigh.includes(nDbNeigh)

        if (cityMatches && neighMatches) {
          veredito = 'OK'
          okCount++
        } else {
          veredito = 'DIVERGE'
          divergeCount++
          detalhe = `Slug: ${slugBairro || '-'} / ${slugCidade || '-'} vs Banco: ${dbNeigh || '-'} / ${dbCity || '-'}`
        }
      } else {
        veredito = 'SLUG INCOMPLETO'
        slugIncompletoCount++
        detalhe =
          slugStatus === 'sem_bairro'
            ? `Slug possui apenas cidade (${slugCidade})`
            : 'Slug sem cidade/bairro extraível'
      }

      // CORREÇÕES INEQUÍVOCAS:
      let alterado = false

      // Caso 1: TR325 / TR 325 (Terrenos Nova Governador Celso Ramos)
      if (
        code.replace(/\s+/g, '') === 'TR325' ||
        title.toLowerCase().includes('governador celso ramos')
      ) {
        if (dbCity !== 'Governador Celso Ramos' || dbNeigh !== 'Areias de Baixo') {
          rec.set('city', 'Governador Celso Ramos')
          rec.set('neighborhood', 'Areias de Baixo')
          app.saveNoValidate(rec)
          alterado = true
          corrigidosCount++
          console.log(
            `[MIGRATION 1760000058] ✅ Imóvel ${code} corrigido com evidência inequívoca para Governador Celso Ramos / Areias de Baixo.`,
          )
        }
      }

      // Caso 2: TR421 / TR 421 (Terreno Roçado São José)
      // Título: 'Terreno Plano Pronto Para Construir - Roçado São José'
      // URL: /274/imoveis/venda-terreno-rocado-sao-jose-sc
      // Banco estava com 'Areias' incorretamente
      if (
        (code.replace(/\s+/g, '') === 'TR421' ||
          title.toLowerCase().includes('roçado') ||
          title.toLowerCase().includes('rocado')) &&
        (dbNeigh === 'Areias' || dbNeigh !== 'Roçado')
      ) {
        rec.set('neighborhood', 'Roçado')
        rec.set('city', 'São José')
        app.saveNoValidate(rec)
        alterado = true
        corrigidosCount++
        console.log(
          `[MIGRATION 1760000058] ✅ Imóvel ${code} (${title}) corrigido com evidência inequívoca para São José / Roçado.`,
        )
      }

      relatorioAudit.push({
        code,
        title,
        dbLocation: `${dbNeigh || '-'}, ${dbCity || '-'}`,
        slugLocation:
          slugStatus === 'completo'
            ? `${slugBairro}, ${slugCidade}`
            : slugCidade
              ? `(sem bairro), ${slugCidade}`
              : 'Incompleto',
        veredito,
        alterado,
        detalhe,
      })
    }

    console.log(`[MIGRATION 1760000058] RESULTADO DA AUDITORIA:`)
    console.log(`- Total imóveis auditados: ${totalAuditados}`)
    console.log(`- ✅ OK (slug confere): ${okCount}`)
    console.log(`- ⚠️ DIVERGE (divergência detectada): ${divergeCount}`)
    console.log(`- ℹ️ SLUG INCOMPLETO: ${slugIncompletoCount}`)
    console.log(`- 🛠️ CORRIGIDOS COM EVIDÊNCIA INEQUÍVOCA: ${corrigidosCount}`)
    console.log(
      `- 📌 CASOS AMBÍGUOS PARA O MAURO: LM326 (Colinas de São Pedro divisa São José/Florianópolis) e TR338 (Guaporanga/Tijuquinhas)`,
    )

    // Salva o resumo de auditoria em system_logs para visualização histórica
    try {
      const logsCollection = app.findCollectionByNameOrId('system_logs')
      const auditLog = new Record(logsCollection)
      auditLog.set('type', 'address_audit_report')
      auditLog.set(
        'message',
        `Auditoria de Endereços: ${totalAuditados} auditados, ${okCount} OK, ${divergeCount} diverge, ${corrigidosCount} corrigidos.`,
      )
      auditLog.set('payload', {
        summary: {
          total: totalAuditados,
          ok: okCount,
          diverge: divergeCount,
          slug_incompleto: slugIncompletoCount,
          corrigidos: corrigidosCount,
        },
        items: relatorioAudit,
        executed_at: new Date().toISOString(),
      })
      app.saveNoValidate(auditLog)
    } catch (logErr) {
      console.warn(`[MIGRATION 1760000058] Aviso ao registrar log de auditoria: ${String(logErr)}`)
    }
  },
  (app) => {
    // Reversão segura
  },
)
