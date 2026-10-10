migrate(
  (app) => {
    // 1. Correção do registro 'properties' id 'hzwmt7r526mdo5n' (LM280 - Villa dos Açores / Villa dos Acordes)
    try {
      const propRec = app.findRecordById('properties', 'hzwmt7r526mdo5n')
      if (propRec) {
        propRec.set('neighborhood', 'Rio Caveiras')
        propRec.set('city', 'Biguaçu')

        // Atualização da descrição para deixar clara a localização em Rio Caveiras, Biguaçu/SC
        const currentDesc = propRec.getString('description') || ''
        const updatedDesc =
          'Residencial Villa dos Açores (Villa dos Acordes): excelente lançamento localizado no bairro Rio Caveiras, Biguaçu/SC (Grande Florianópolis), com plantas inteligentes de 2 dormitórios com suíte, sacada gourmet, infraestrutura moderna e condições especiais de lançamento.'
        propRec.set('description', updatedDesc)

        // Adiciona "Biguaçu" e "Rio Caveiras" aos features se ainda não constarem
        let features = []
        try {
          const rawFeat = propRec.get('features')
          if (Array.isArray(rawFeat)) {
            features = rawFeat
          } else if (typeof rawFeat === 'string') {
            features = JSON.parse(rawFeat)
          }
        } catch (_) {
          features = []
        }
        if (!features.includes('Biguaçu')) features.push('Biguaçu')
        if (!features.includes('Rio Caveiras')) features.push('Rio Caveiras')
        propRec.set('features', features)

        app.saveNoValidate(propRec)
        console.log(
          '[MIGRATION 1760000057] properties hzwmt7r526mdo5n (LM280) corrigido: neighborhood="Rio Caveiras", city="Biguaçu".',
        )
      } else {
        console.warn('[MIGRATION 1760000057] properties hzwmt7r526mdo5n não encontrado por ID.')
      }
    } catch (err) {
      console.warn(
        '[MIGRATION 1760000057] Erro ao atualizar properties hzwmt7r526mdo5n:',
        String(err),
      )
    }

    // 2. Busca e correção de segurança por código LM280 / LM 280 caso haja registros duplicados
    try {
      const recordsByCode = app.findRecordsByFilter(
        'properties',
        "code = 'LM280' || code = 'LM 280'",
        '-created',
        10,
        0,
      )
      for (const rec of recordsByCode) {
        if (rec.id === 'hzwmt7r526mdo5n') continue
        rec.set('neighborhood', 'Rio Caveiras')
        rec.set('city', 'Biguaçu')
        const d = rec.getString('description') || ''
        if (!d.toLowerCase().includes('biguaçu') && !d.toLowerCase().includes('biguacu')) {
          rec.set(
            'description',
            'Residencial Villa dos Açores (Villa dos Acordes): excelente lançamento no bairro Rio Caveiras, Biguaçu/SC (Grande Florianópolis), com 2 dormitórios com suíte, sacada gourmet e infraestrutura moderna.',
          )
        }
        app.saveNoValidate(rec)
        console.log('[MIGRATION 1760000057] Registro duplicado LM280 corrigido:', rec.id)
      }
    } catch (codeErr) {
      console.warn('[MIGRATION 1760000057] Aviso na busca por código LM280:', String(codeErr))
    }

    // 3. Varredura de segurança em ai_knowledge_files:
    // Se algum documento mencionar Villa dos Açores com localização incorreta (ex: "Balneário" ou "Florianópolis"),
    // corrigir para "Rio Caveiras, Biguaçu - SC".
    try {
      const files = app.findRecordsByFilter(
        'ai_knowledge_files',
        "name ~ 'Açores' || name ~ 'Acores' || enterprise ~ 'Açores' || enterprise ~ 'Acores' || extracted_text ~ 'Açores' || extracted_text ~ 'Acores'",
        '-created',
        50,
        0,
      )
      for (const f of files) {
        let text = f.getString('extracted_text') || ''
        let changed = false

        if (
          text.includes('Balneário') ||
          text.includes('Balneario') ||
          text.includes('Florianópolis') ||
          text.includes('Florianopolis')
        ) {
          // Substituições direcionadas onde o Villa dos Açores foi colocado erroneamente no Balneário ou Florianópolis
          const newText = text
            .replace(
              /Villa dos Açores[^\n.,;]*no Balneário[^\n.,;]*/gi,
              'Villa dos Açores no bairro Rio Caveiras, Biguaçu/SC',
            )
            .replace(
              /Villa dos Acores[^\n.,;]*no Balneário[^\n.,;]*/gi,
              'Villa dos Açores no bairro Rio Caveiras, Biguaçu/SC',
            )
            .replace(
              /Villa dos Açores[^\n.,;]*em Florianópolis/gi,
              'Villa dos Açores em Biguaçu/SC',
            )
            .replace(
              /Villa dos Acores[^\n.,;]*em Florianópolis/gi,
              'Villa dos Açores em Biguaçu/SC',
            )
          if (newText !== text) {
            f.set('extracted_text', newText)
            changed = true
          }
        }

        // Vincular ao property_id hzwmt7r526mdo5n se estiver desvinculado
        if (!f.getString('property_id')) {
          f.set('property_id', 'hzwmt7r526mdo5n')
          changed = true
        }

        if (changed) {
          app.saveNoValidate(f)
          console.log(
            '[MIGRATION 1760000057] ai_knowledge_files ajustado:',
            f.id,
            f.getString('name'),
          )
        }
      }
    } catch (kfErr) {
      console.warn('[MIGRATION 1760000057] Erro na varredura ai_knowledge_files:', String(kfErr))
    }

    // 4. Varredura de verificação dos imóveis com neighborhood ~ 'Balneário'
    // Loga se houver algum outro com cidade incoerente
    try {
      const balnearioProps = app.findRecordsByFilter(
        'properties',
        "neighborhood ~ 'Balneário'",
        'city',
        50,
        0,
      )
      for (const bp of balnearioProps) {
        const c = bp.getString('city') || ''
        const code = bp.getString('code') || ''
        const title = bp.getString('title') || ''
        const id = bp.id
        console.log(
          `[MIGRATION 1760000057 SCAN] id=${id} code=${code} city="${c}" title="${title.substring(0, 40)}"`,
        )
      }
    } catch (scanErr) {
      console.warn('[MIGRATION 1760000057] Erro na varredura de segurança:', String(scanErr))
    }
  },
  (app) => {
    // Reversão segura
  },
)
