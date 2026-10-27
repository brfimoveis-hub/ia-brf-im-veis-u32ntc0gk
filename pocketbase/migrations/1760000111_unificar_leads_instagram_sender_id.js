/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // BACKFILL IDEMPOTENTE: Unificar leads do Instagram Direct por Sender ID no CRM
    // Regra:
    // 1. Apenas leads com source = 'Instagram Direct' (NUNCA tocar em Facebook Ads ou WhatsApp).
    // 2. Extrai o sender_id de cada lead das notes (regex /Sender ID:\s*(\d+)/i) ou do nome / texto.
    // 3. Agrupa por sender_id.
    // 4. Para grupos com mais de 1 registro:
    //    - Mantém o mais antigo (ou o que tiver mais dados / status mais avançado).
    //    - Consolida todas as mensagens/notas no lead mantido (com timestamp).
    //    - Remove os registros duplicados de leads.
    // 5. Também consolida os customers do Instagram Direct que possuem o mesmo sender_id:
    //    - Mantém o mais completo (status mais avançado ou mais antigo).
    //    - Reatribui todas as conversas (conversations) dos duplicados para o customer mantido.
    //    - Consolida origin_history e notes.
    //    - Remove os customers duplicados.
    // 6. Idempotente: se executado num banco vazio ou sem duplicados, é um no-op seguro.

    console.log('[MIG_1760000111] Iniciando unificação idempotente de leads do Instagram Direct...')

    // Função auxiliar segura para extrair Sender ID das notes
    function extractSenderId(notes) {
      if (!notes) return ''
      var match = String(notes).match(/Sender ID:\s*(\d+)/i)
      if (match && match[1]) return match[1].trim()
      var matchId = String(notes).match(/IG Sender ID:\s*(\d+)/i)
      if (matchId && matchId[1]) return matchId[1].trim()
      return ''
    }

    // A. CONSOLIDAÇÃO NA COLEÇÃO 'leads'
    try {
      var leadsCol = app.findCollectionByNameOrId('leads')
      // Busca todos os leads com source = 'Instagram Direct'
      var igLeads = app.findRecordsByFilter(
        'leads',
        "source = 'Instagram Direct'",
        'created',
        500,
        0,
      )

      if (igLeads && igLeads.length > 0) {
        var groupsBySender = {}
        for (var i = 0; i < igLeads.length; i++) {
          var lead = igLeads[i]
          var sId = extractSenderId(lead.getString('notes'))
          if (!sId) {
            // Tenta do nome Lead Instagram (16103005)
            var nameMatch = (lead.getString('name') || '').match(/Lead Instagram \((\d+)\)/i)
            if (nameMatch && nameMatch[1]) {
              sId = nameMatch[1]
            }
          }
          if (!sId) continue

          if (!groupsBySender[sId]) {
            groupsBySender[sId] = []
          }
          groupsBySender[sId].push(lead)
        }

        var senderKeys = Object.keys(groupsBySender)
        var totalUnifiedLeads = 0

        for (var k = 0; k < senderKeys.length; k++) {
          var senderId = senderKeys[k]
          var group = groupsBySender[senderId]

          if (group.length <= 1) {
            continue
          }

          console.log(
            '[MIG_1760000111] Grupo de leads duplicados encontrado para senderId=' +
              senderId +
              ' (' +
              group.length +
              ' leads)',
          )

          // Ordena: o mais antigo primeiro (created ascendente)
          group.sort(function (a, b) {
            var timeA = new Date(a.getString('created')).getTime()
            var timeB = new Date(b.getString('created')).getTime()
            return timeA - timeB
          })

          var primaryLead = group[0]
          var consolidatedNotes = primaryLead.getString('notes') || ''
          var collectedMessages = []

          for (var g = 1; g < group.length; g++) {
            var dupLead = group[g]
            var dupNotes = dupLead.getString('notes') || ''
            var dupCreated = dupLead.getString('created')

            // Extrai a mensagem de dupNotes se houver
            var msgMatch = dupNotes.match(/Mensagem:\s*([\s\S]+)$/i)
            var msgContent = msgMatch ? msgMatch[1].trim() : ''

            if (msgContent && consolidatedNotes.indexOf(msgContent) === -1) {
              collectedMessages.push('[' + dupCreated + '] Mensagem: ' + msgContent)
            } else if (!msgContent && dupNotes && consolidatedNotes.indexOf(dupNotes) === -1) {
              collectedMessages.push('[' + dupCreated + '] ' + dupNotes)
            }

            // Preserva nome se o duplicado tiver nome melhor
            var dupName = dupLead.getString('name') || ''
            var primaryName = primaryLead.getString('name') || ''
            if (
              primaryName.startsWith('Lead Instagram') &&
              dupName &&
              !dupName.startsWith('Lead Instagram')
            ) {
              primaryLead.set('name', dupName)
            }

            // Preserva status se não for 'Novo'
            var dupStatus = dupLead.getString('status') || ''
            var primaryStatus = primaryLead.getString('status') || ''
            if (primaryStatus === 'Novo' && dupStatus && dupStatus !== 'Novo') {
              primaryLead.set('status', dupStatus)
            }

            // Remove o lead duplicado
            try {
              app.delete(dupLead)
              totalUnifiedLeads++
              console.log('[MIG_1760000111] Lead duplicado removido: ' + dupLead.id)
            } catch (delErr) {
              console.warn(
                '[MIG_1760000111] Falha ao deletar lead duplicado ' + dupLead.id + ': ' + delErr,
              )
            }
          }

          if (collectedMessages.length > 0) {
            consolidatedNotes +=
              '\n\n--- Mensagens anteriores consolidadas ---\n' + collectedMessages.join('\n')
            primaryLead.set('notes', consolidatedNotes)
          }

          app.save(primaryLead)
          console.log('[MIG_1760000111] Lead principal consolidado salvo: ' + primaryLead.id)
        }

        console.log(
          '[MIG_1760000111] Concluída unificação de leads. Duplicados removidos: ' +
            totalUnifiedLeads,
        )
      }
    } catch (leadsErr) {
      console.error('[MIG_1760000111] Erro na consolidação de leads: ' + leadsErr)
    }

    // B. CONSOLIDAÇÃO NA COLEÇÃO 'customers'
    // Garantir que a mesma pessoa do Instagram Direct também tenha apenas 1 registro em customers,
    // preservando todas as mensagens da conversa (conversations).
    try {
      var customersCol = app.findCollectionByNameOrId('customers')
      var igCustomers = app.findRecordsByFilter(
        'customers',
        "source = 'Instagram Direct'",
        'created',
        500,
        0,
      )

      if (igCustomers && igCustomers.length > 0) {
        var custGroupsBySender = {}
        for (var c = 0; c < igCustomers.length; c++) {
          var cust = igCustomers[c]
          var custSid = extractSenderId(cust.getString('notes'))
          if (!custSid) {
            var origHist = cust.get('origin_history')
            if (origHist && Array.isArray(origHist)) {
              for (var h = 0; h < origHist.length; h++) {
                if (origHist[h] && origHist[h].sender_id) {
                  custSid = String(origHist[h].sender_id).trim()
                  break
                }
              }
            }
          }
          if (!custSid) {
            var cNameMatch = (cust.getString('name') || '').match(/Lead Instagram \((\d+)\)/i)
            if (cNameMatch && cNameMatch[1]) {
              custSid = cNameMatch[1]
            }
          }
          if (!custSid) continue

          if (!custGroupsBySender[custSid]) {
            custGroupsBySender[custSid] = []
          }
          custGroupsBySender[custSid].push(cust)
        }

        var custSenderKeys = Object.keys(custGroupsBySender)
        var totalUnifiedCustomers = 0

        for (var ck = 0; ck < custSenderKeys.length; ck++) {
          var cSenderId = custSenderKeys[ck]
          var cGroup = custGroupsBySender[cSenderId]

          if (cGroup.length <= 1) {
            continue
          }

          console.log(
            '[MIG_1760000111] Grupo de customers duplicados encontrado para senderId=' +
              cSenderId +
              ' (' +
              cGroup.length +
              ' customers)',
          )

          // Seleciona o melhor customer para manter:
          // Aquele que tem mais conversas associadas ou status mais avançado que '1. Acolhimento'
          var primaryCustomer = cGroup[0]
          var maxScore = -1

          for (var idx = 0; idx < cGroup.length; idx++) {
            var cand = cGroup[idx]
            var score = 0
            if (cand.getString('status') && cand.getString('status') !== '1. Acolhimento') {
              score += 10
            }
            if (cand.getString('name') && !cand.getString('name').startsWith('Lead Instagram')) {
              score += 5
            }
            try {
              var convCount = app.countRecords('conversations', "customer_id = '" + cand.id + "'")
              score += convCount
            } catch (_) {}

            if (score > maxScore) {
              maxScore = score
              primaryCustomer = cand
            }
          }

          console.log(
            '[MIG_1760000111] Customer primário eleito: ' +
              primaryCustomer.id +
              ' (score=' +
              maxScore +
              ')',
          )

          // Reatribui conversas dos demais e consolida dados
          for (var dIdx = 0; dIdx < cGroup.length; dIdx++) {
            var dupCust = cGroup[dIdx]
            if (dupCust.id === primaryCustomer.id) continue

            // 1. Migra conversas vinculadas ao duplicado para o primário
            try {
              var dupConvs = app.findRecordsByFilter(
                'conversations',
                "customer_id = '" + dupCust.id + "'",
                'created',
                200,
                0,
              )
              for (var convIdx = 0; convIdx < dupConvs.length; convIdx++) {
                var convRec = dupConvs[convIdx]
                convRec.set('customer_id', primaryCustomer.id)
                app.save(convRec)
              }
              console.log(
                '[MIG_1760000111] ' +
                  dupConvs.length +
                  ' conversas migradas de ' +
                  dupCust.id +
                  ' para ' +
                  primaryCustomer.id,
              )
            } catch (convErr) {
              console.warn('[MIG_1760000111] Erro migrando conversas: ' + convErr)
            }

            // 2. Consolida origin_history
            try {
              var primHist = primaryCustomer.get('origin_history') || []
              var dupHist = dupCust.get('origin_history') || []
              if (Array.isArray(dupHist) && dupHist.length > 0) {
                var mergedHist = [].concat(primHist)
                for (var dh = 0; dh < dupHist.length; dh++) {
                  mergedHist.push(dupHist[dh])
                }
                primaryCustomer.set('origin_history', mergedHist)
              }
            } catch (_) {}

            // 3. Deleta o customer duplicado
            try {
              app.delete(dupCust)
              totalUnifiedCustomers++
              console.log('[MIG_1760000111] Customer duplicado deletado: ' + dupCust.id)
            } catch (delCustErr) {
              console.warn(
                '[MIG_1760000111] Falha ao deletar customer duplicado ' +
                  dupCust.id +
                  ': ' +
                  delCustErr,
              )
            }
          }

          app.save(primaryCustomer)
        }

        console.log(
          '[MIG_1760000111] Concluída unificação de customers. Duplicados removidos: ' +
            totalUnifiedCustomers,
        )
      }
    } catch (custsErr) {
      console.error('[MIG_1760000111] Erro na consolidação de customers: ' + custsErr)
    }

    console.log('[MIG_1760000111] Unificação concluída com sucesso.')
  },
  (app) => {
    // Reversão não necessária para merge idempotente de dados duplicados
  },
)
