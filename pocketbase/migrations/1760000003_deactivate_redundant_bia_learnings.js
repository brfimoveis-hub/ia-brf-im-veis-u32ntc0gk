/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // IDs dos registros anteriores e redundantes consolidados na Constituição v1.0 e nos Pilares A-D:
    const idsToDeactivate = [
      'wp0ljie775mctwo', // BIA — CONSTITUIÇÃO (Roteiro Único v3) (priority 500)
      'si75im4s7r0k054', // SDR de Alta Conversão: Sem link nem preço cheio (480)
      'jgslvrjl0378q53', // Máximo 2 opções por mensagem (470)
      'pflxomc0l8sq3mo', // Anti-Contradição: Nunca dizer que imóvel não consta (460)
      'dgm701kfjpyamcb', // Foco Absoluto no Imóvel do Lead (200)
      'kfx3ofj9pmrdkpf', // Busca Proativa no Catálogo de Imóveis (100)
      'd2zwkvs00sxt4qd', // Qualificação Leve e Uma Pergunta por Vez (90)
      'ekjpvgz84fyc2e0', // Apresentação Consultiva e Desejável de Imóveis (85)
      'vr0kf4x4kdz1h2s', // Proibição Absoluta de Repetir Dados Já Informados (80)
      'a7v4uzdiahdbbgn', // Acolhimento de Proprietários (Trilha B) (75)
    ]

    for (let i = 0; i < idsToDeactivate.length; i++) {
      const recordId = idsToDeactivate[i]
      try {
        const record = app.findRecordById('bia_learnings', recordId)
        record.set('is_active', false)
        record.set('last_reviewed_at', new Date().toISOString())
        record.set('reviewed_by', 'Mauro (Unificação v1.0)')
        app.saveNoValidate(record)
        console.log(
          `[MIG_1760000003] bia_learnings ${recordId} desativado com sucesso (is_active = false).`,
        )
      } catch (err) {
        console.warn(
          `[MIG_1760000003] Erro ao desativar bia_learnings ${recordId}: ${err.message || String(err)}`,
        )
      }
    }
  },
  (app) => {
    const idsToReactivate = [
      'wp0ljie775mctwo',
      'si75im4s7r0k054',
      'jgslvrjl0378q53',
      'pflxomc0l8sq3mo',
      'dgm701kfjpyamcb',
      'kfx3ofj9pmrdkpf',
      'd2zwkvs00sxt4qd',
      'ekjpvgz84fyc2e0',
      'vr0kf4x4kdz1h2s',
      'a7v4uzdiahdbbgn',
    ]

    for (let i = 0; i < idsToReactivate.length; i++) {
      const recordId = idsToReactivate[i]
      try {
        const record = app.findRecordById('bia_learnings', recordId)
        record.set('is_active', true)
        app.saveNoValidate(record)
      } catch (_) {}
    }
  },
)
