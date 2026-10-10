/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1760000059: Correção pontual e idempotente de 5 registros na coleção `properties`
 *
 * Casos auditados (laudo address_audit_report em system_logs id aloyho7h2u9326l) com evidência inequívoca:
 * o SLUG DO SITE está certo, o BANCO está errado.
 * NÃO altera URLs, preços, títulos, descrições ou qualquer outro campo além de `neighborhood`.
 * NÃO toca em nenhum imóvel além destes 5:
 * 1. AP320 (id x1f4m93ova1xu3n): neighborhood "Balneário" -> "Centro" (Balneário Camboriú)
 * 2. LM296 (code='LM296' && city='Balneário Camboriú', id ynrgb4afjar68zi): neighborhood "Balneário" -> "Centro"
 * 3. CS284 (id 52bmydgnkor1t0s): neighborhood "São João do Rio Vermelho" -> "Ingleses do Rio Vermelho" (Florianópolis)
 * 4. CS331 (id cfhul2rlw8r2reu): neighborhood "São João do Rio Vermelho" -> "Ingleses do Rio Vermelho" (Florianópolis)
 * 5. CA282 (id 67deehqlvrqxg7q): neighborhood "Saco dos Limõesões" -> "Saco dos Limões" (Florianópolis)
 *
 * Imóveis preservados intactos (decisão do Mauro / já resolvidos):
 * CS378, TR338, LM326, LM280, TR325, TR421.
 *
 * Idempotência:
 * - Só altera se o valor atual for o incorreto.
 * - Se já estiver com o valor correto, não toca nem altera timestamp desnecessariamente.
 * - Registra relatório detalhado em system_logs (type='address_bank_corrections').
 */

migrate(
  (app) => {
    console.log(
      '[MIGRATION 1760000059] Iniciando correção idempotente de 5 registros em properties...',
    )

    const targets = [
      {
        code: 'AP320',
        id: 'x1f4m93ova1xu3n',
        expectedCity: 'Balneário Camboriú',
        wrongNeighborhoods: ['Balneário', 'Balneario'],
        correctNeighborhood: 'Centro',
        description: 'AP320 - Raridade em Balneário Camboriú (Centro/Barra Sul)',
      },
      {
        code: 'LM296',
        id: 'ynrgb4afjar68zi',
        expectedCity: 'Balneário Camboriú',
        wrongNeighborhoods: ['Balneário', 'Balneario'],
        correctNeighborhood: 'Centro',
        description: 'LM296 - LUMINARE RESIDENCE em Balneário Camboriú (Centro)',
      },
      {
        code: 'CS284',
        id: '52bmydgnkor1t0s',
        expectedCity: 'Florianópolis',
        wrongNeighborhoods: ['São João do Rio Vermelho', 'Sao Joao do Rio Vermelho'],
        correctNeighborhood: 'Ingleses do Rio Vermelho',
        description: 'CS284 - Casa nos Ingleses do Rio Vermelho com piscina',
      },
      {
        code: 'CS331',
        id: 'cfhul2rlw8r2reu',
        expectedCity: 'Florianópolis',
        wrongNeighborhoods: ['São João do Rio Vermelho', 'Sao Joao do Rio Vermelho'],
        correctNeighborhood: 'Ingleses do Rio Vermelho',
        description: 'CS331 - Casa em condomínio fechado nos Ingleses do Rio Vermelho',
      },
      {
        code: 'CA282',
        id: '67deehqlvrqxg7q',
        expectedCity: 'Florianópolis',
        wrongNeighborhoods: ['Saco dos Limõesões', 'Saco dos Limoesoes', 'Saco dos Limõesõesões'],
        correctNeighborhood: 'Saco dos Limões',
        description:
          'CA282 - Casa aconchegante no Saco dos Limões (texto corrompido duplicado corrigido)',
      },
    ]

    const reportItems = []
    let totalCorrigidos = 0
    let totalJaConformes = 0
    let totalNaoEncontrados = 0

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      let record = null

      // Busca prioritária por ID
      if (target.id) {
        try {
          record = app.findRecordById('properties', target.id)
        } catch (_) {
          record = null
        }
      }

      // Fallback estrito combinando code e city
      if (!record && target.code && target.expectedCity) {
        try {
          const escapedCity = target.expectedCity.replace(/'/g, "\\'")
          const candidates = app.findRecordsByFilter(
            'properties',
            `code = '${target.code}' && city = '${escapedCity}'`,
            '-created',
            5,
            0,
          )
          if (candidates && candidates.length > 0) {
            record = candidates[0]
          }
        } catch (findErr) {
          console.warn(
            `[MIGRATION 1760000059] Erro na busca por filtro de ${target.code}:`,
            String(findErr),
          )
        }
      }

      if (!record) {
        console.warn(
          `[MIGRATION 1760000059] ⚠️ Registro ${target.code} (id ${target.id || 'N/A'}) não encontrado.`,
        )
        totalNaoEncontrados++
        reportItems.push({
          code: target.code,
          id: target.id || null,
          status: 'nao_encontrado',
          description: target.description,
          previousNeighborhood: null,
          newNeighborhood: null,
          changed: false,
        })
        continue
      }

      const currentNeigh = (record.getString('neighborhood') || '').trim()
      const currentCity = (record.getString('city') || '').trim()
      const currentCode = (record.getString('code') || '').trim()
      const currentUrl = (record.getString('url') || '').trim()

      // Conferência de idempotência: se o registro já está com o neighborhood correto, nada a fazer
      if (currentNeigh === target.correctNeighborhood) {
        console.log(
          `[MIGRATION 1760000059] ℹ️ Registro ${currentCode} (id ${record.id}) já conforme: neighborhood="${currentNeigh}". Nenhuma alteração necessária.`,
        )
        totalJaConformes++
        reportItems.push({
          code: currentCode,
          id: record.id,
          city: currentCity,
          url: currentUrl,
          status: 'ja_conforme',
          description: target.description,
          previousNeighborhood: currentNeigh,
          newNeighborhood: currentNeigh,
          changed: false,
        })
        continue
      }

      // Verificação de segurança: checar se o neighborhood atual casa com os valores errados conhecidos
      const isExpectedWrong =
        target.wrongNeighborhoods.includes(currentNeigh) ||
        currentNeigh.toLowerCase() === target.wrongNeighborhoods[0].toLowerCase() ||
        (target.code === 'CA282' && currentNeigh.includes('Limõesões'))

      if (isExpectedWrong) {
        const previousValue = currentNeigh
        record.set('neighborhood', target.correctNeighborhood)
        app.saveNoValidate(record)
        totalCorrigidos++

        console.log(
          `[MIGRATION 1760000059] ✅ Correção aplicada com sucesso no imóvel ${currentCode} (id ${record.id}): neighborhood "${previousValue}" -> "${target.correctNeighborhood}".`,
        )

        reportItems.push({
          code: currentCode,
          id: record.id,
          city: currentCity,
          url: currentUrl,
          status: 'corrigido',
          description: target.description,
          previousNeighborhood: previousValue,
          newNeighborhood: target.correctNeighborhood,
          changed: true,
        })
      } else {
        // Se o valor for diferente tanto do esperado errado quanto do correto, logar aviso e não alterar cegamente
        console.warn(
          `[MIGRATION 1760000059] ⚠️ Imóvel ${currentCode} (id ${record.id}) possui neighborhood inesperado "${currentNeigh}". Não alterado por segurança.`,
        )
        reportItems.push({
          code: currentCode,
          id: record.id,
          city: currentCity,
          url: currentUrl,
          status: 'divergencia_inesperada',
          description: target.description,
          previousNeighborhood: currentNeigh,
          newNeighborhood: currentNeigh,
          changed: false,
        })
      }
    }

    console.log('[MIGRATION 1760000059] Resumo final:')
    console.log(`- Corrigidos: ${totalCorrigidos}`)
    console.log(`- Já conformes: ${totalJaConformes}`)
    console.log(`- Não encontrados: ${totalNaoEncontrados}`)

    // Gravação do laudo/relatório estruturado em system_logs (type='address_bank_corrections')
    try {
      const logsColl = app.findCollectionByNameOrId('system_logs')
      const correctionLog = new Record(logsColl)
      correctionLog.set('type', 'address_bank_corrections')
      correctionLog.set(
        'message',
        `Correção pontual de bairros (5 imóveis): ${totalCorrigidos} corrigidos, ${totalJaConformes} já conformes, ${totalNaoEncontrados} não encontrados.`,
      )
      correctionLog.set('payload', {
        migration: '1760000059_fix_five_properties_neighborhoods',
        reference_audit_log_id: 'aloyho7h2u9326l',
        summary: {
          total_targets: targets.length,
          corrigidos: totalCorrigidos,
          ja_conformes: totalJaConformes,
          nao_encontrados: totalNaoEncontrados,
        },
        items: reportItems,
        executed_at: new Date().toISOString(),
      })
      app.saveNoValidate(correctionLog)
      console.log(
        '[MIGRATION 1760000059] Relatório salvo em system_logs com type="address_bank_corrections".',
      )
    } catch (logErr) {
      console.warn(`[MIGRATION 1760000059] Aviso ao salvar log em system_logs: ${String(logErr)}`)
    }
  },
  (app) => {
    // Reversão segura se necessário (opcional)
    console.log('[MIGRATION 1760000059 DOWN] Rollback da migration.')
  },
)
