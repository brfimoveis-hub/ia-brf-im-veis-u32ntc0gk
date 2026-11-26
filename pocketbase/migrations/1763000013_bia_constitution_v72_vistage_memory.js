/// <reference path="../pb_data/types.d.ts" />
// ============================================================================
// MIGRATION 1763000013 — CONSTITUIÇÃO BIA v7.2 (ADITIVO ao texto p2500)
// ----------------------------------------------------------------------------
// Acrescenta à Constituição ativa (bia_learnings priority 2500, id
// oxn4280sma7d888) a seção 2-C:
//  (a) Vistage Residence — link oficial único (landing /344/), proibido
//      oferecer outro imóvel ou inventar unidades/análise de crédito;
//  (b) endurecimento anti-re-saudação: saudação só na 1ª msg da conversa;
//  (c) "vou confirmar" no máximo 1x por assunto.
// Idempotente: se a seção já existe no texto, não faz nada.
// Replaysafe: se o registro p2500 não existir, é no-op com log.
// ============================================================================
migrate(
  (app) => {
    const sectionMarker = 'SEÇÃO 2-C — VISTAGE RESIDENCE E MEMÓRIA DE PROMESSAS (v7.2)'

    let rec = null
    try {
      rec = app.findRecordById('bia_learnings', 'oxn4280sma7d888')
    } catch (_) {
      rec = null
    }
    if (!rec) {
      try {
        rec = app.findFirstRecordByFilter(
          'bia_learnings',
          'priority = 2500 && is_active = true',
          '-created',
        )
      } catch (_) {
        rec = null
      }
    }
    if (!rec) {
      console.log('[MIGRATION 1763000013] Constituição p2500 não encontrada — no-op.')
      return
    }

    const txt = rec.getString('rule_text') || ''
    if (txt.indexOf(sectionMarker) !== -1) {
      console.log(
        '[MIGRATION 1763000013] Seção 2-C já presente no texto p2500 — idempotente, nada a fazer.',
      )
      return
    }

    const addendum =
      '\n\n================================================================================\n' +
      sectionMarker +
      '\n' +
      '================================================================================\n\n' +
      '2-C.1 — VISTAGE RESIDENCE: LINK OFICIAL ÚNICO (REGRA ABSOLUTA):\n' +
      'Quando o cliente pedir, mencionar ou demonstrar interesse no VISTAGE RESIDENCE (Barreiros, São José), a Bia envia EXCLUSIVAMENTE o link oficial:\n' +
      'https://www.brfimoveis.com.br/344/imoveis/venda-apartamento-3-quartos-barreiros-sao-jose-sc\n' +
      '- É PROIBIDO oferecer outro imóvel ou lançamento no lugar do Vistage Residence.\n' +
      '- É PROIBIDO inventar unidades, tipologias, valores fora da tabela vigente ou prometer análise de crédito.\n' +
      '- NUNCA substituir o link acima por outro URL (nem /vistage nem landing interna).\n\n' +
      '2-C.2 — MEMÓRIA DA CONVERSA (ENDURECIMENTO DA 2-A):\n' +
      'A saudação "Que bom ter você aqui..." (ou qualquer variante de boas-vindas) acontece APENAS na PRIMEIRA mensagem da conversa. Depois de 2 (duas) trocas, é TERMINANTEMENTE PROIBIDO saudar de novo — a Bia entra direto no assunto em pauta.\n\n' +
      '2-C.3 — PROMESSAS DE CONFIRMAÇÃO ("VOU CONFIRMAR COM O CORRETOR"):\n' +
      'No MÁXIMO 1 (uma) vez por assunto. Se a Bia já prometeu confirmar sobre um tema, a próxima mensagem do mesmo assunto DEVE trazer a informação concreta OU admitir com transparência que ainda não tem a resposta — nunca repetir a promessa.\n'

    rec.set('rule_text', txt + addendum)
    app.saveNoValidate(rec)

    // Prova pós-save (round-trip, re-ler o registro)
    const rec2 = app.findRecordById('bia_learnings', rec.id)
    if ((rec2.getString('rule_text') || '').indexOf(sectionMarker) === -1) {
      throw new Error('[MIGRATION 1763000013] FALHA: seção 2-C ausente pós-save.')
    }
    console.log(
      '[MIGRATION 1763000013] OK: Constituição p2500 agora contém a seção 2-C (Vistage link + memória + promessas).',
    )
  },
  (app) => {
    console.log('[MIGRATION 1763000013 DOWN] Sem reversão (seção 2-C permanece no texto).')
  },
)
