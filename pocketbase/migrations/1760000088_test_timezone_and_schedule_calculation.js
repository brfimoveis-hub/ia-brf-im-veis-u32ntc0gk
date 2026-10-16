migrate(
  (app) => {
    // Teste de validação dos fusos do Modo Contínuo de Reenvio do E-book
    function getBrasiliaComponents(dateObj) {
      const d = dateObj || new Date()
      const brDate = new Date(d.getTime() - 3 * 3600000)
      return {
        year: brDate.getUTCFullYear(),
        month: brDate.getUTCMonth(),
        date: brDate.getUTCDate(),
        day: brDate.getUTCDay(), // 0 = Domingo, 6 = Sábado
        hour: brDate.getUTCHours(),
        minute: brDate.getUTCMinutes(),
        second: brDate.getUTCSeconds(),
        isWindow:
          brDate.getUTCDay() !== 0 && brDate.getUTCHours() >= 8 && brDate.getUTCHours() < 18,
      }
    }

    function computeNextBatchScheduleDate(fromMs) {
      const baseMs = fromMs || Date.now()
      const candidateUtcMs = baseMs + 15 * 60 * 1000
      const brComp = getBrasiliaComponents(new Date(candidateUtcMs))

      if (brComp.day !== 0 && brComp.hour >= 8 && brComp.hour < 18) {
        return new Date(candidateUtcMs).toISOString()
      }

      let daysToAdd = 0
      if (brComp.day === 0) {
        daysToAdd = 1
      } else if (brComp.day === 6 && brComp.hour >= 18) {
        daysToAdd = 2
      } else if (brComp.hour >= 18) {
        daysToAdd = 1
      } else if (brComp.hour < 8) {
        daysToAdd = 0
      } else {
        daysToAdd = 1
      }

      const nextBrDateMs = Date.UTC(brComp.year, brComp.month, brComp.date + daysToAdd, 8, 0, 0, 0)
      const targetUtcMs = nextBrDateMs + 3 * 3600000
      return new Date(targetUtcMs).toISOString()
    }

    // Caso 1: Despacho às 19:24 UTC (16:24 BRT). Próximo deve ser 19:39 UTC (16:39 BRT).
    const t1 = new Date('2026-10-16T19:24:00.000Z').getTime()
    const next1 = computeNextBatchScheduleDate(t1)
    if (next1 !== '2026-10-16T19:39:00.000Z') {
      throw new Error('Falha Caso 1: esperado 2026-10-16T19:39:00.000Z, obtido: ' + next1)
    }

    // Caso 2: Despacho às 20:50 UTC (17:50 BRT - sexta-feira). +15 min dá 21:05 UTC (18:05 BRT - fora da janela).
    // Próximo deve ser sábado às 08:00 BRT = 11:00 UTC.
    const t2 = new Date('2026-10-16T20:50:00.000Z').getTime()
    const next2 = computeNextBatchScheduleDate(t2)
    if (next2 !== '2026-10-17T11:00:00.000Z') {
      throw new Error('Falha Caso 2: esperado 2026-10-17T11:00:00.000Z, obtido: ' + next2)
    }

    // Caso 3: Despacho no sábado às 20:50 UTC (17:50 BRT de sábado). +15 min dá 18:05 BRT.
    // Domingo fechado. Próximo deve ser SEGUNDA-FEIRA (19/10) às 08:00 BRT = 11:00 UTC.
    const t3 = new Date('2026-10-17T20:50:00.000Z').getTime()
    const next3 = computeNextBatchScheduleDate(t3)
    if (next3 !== '2026-10-19T11:00:00.000Z') {
      throw new Error('Falha Caso 3: esperado 2026-10-19T11:00:00.000Z, obtido: ' + next3)
    }

    console.log('[MIGRATION 1760000088] Todos os testes de cálculo de fuso passaram com sucesso!')
  },
  (app) => {},
)
