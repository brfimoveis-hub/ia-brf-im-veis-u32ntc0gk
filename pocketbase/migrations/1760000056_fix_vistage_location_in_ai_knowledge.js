migrate(
  (app) => {
    // 1. Correção no documento ai_knowledge_files id 'z6jbtepnisksbje'
    // "E-book e Apresentação Oficial Vistage Residence.md"
    try {
      const ebookRec = app.findRecordById('ai_knowledge_files', 'z6jbtepnisksbje')
      if (ebookRec) {
        let text = ebookRec.getString('extracted_text') || ''

        // Substituição do endereço
        // De: **Endereço:** Córrego Grande, Florianópolis - SC (junto ao Parque Linear do Córrego Grande)
        // Para: **Endereço:** Barreiros, São José - SC (Grande Florianópolis)
        text = text.replace(
          /\*\*Endereço:\*\*.*?(?=\n\*\*Incorporação)/s,
          '**Endereço:** Barreiros, São José - SC (Grande Florianópolis)\n',
        )

        // Se houver qualquer outra variação na linha de endereço:
        text = text.replace(
          /Córrego Grande,\s*Florianópolis\s*-\s*SC\s*\(junto ao Parque Linear do Córrego Grande\)/gi,
          'Barreiros, São José - SC (Grande Florianópolis)',
        )

        // Substituição do diferencial de Localização Privilegiada
        // De: - **Localização Privilegiada:** No coração do Córrego Grande, a poucos passos da UFSC, UDESC, padarias artesanais, supermercados e restaurantes gastronômicos.
        // Para: - **Localização Privilegiada:** Em Barreiros, São José - SC, localização nobre com excelente infraestrutura, comércio, serviços e acesso facilitado.
        text = text.replace(
          /- \*\*Localização Privilegiada:\*\*.*?(?=\n- \*\*Conexão)/s,
          '- **Localização Privilegiada:** Em Barreiros, São José - SC, localização nobre com excelente infraestrutura, comércio, serviços e acesso facilitado.\n',
        )

        // Remoção da referência de ponto de referência incompatível com Barreiros: "Conexão com a Natureza: Vizinho imediato ao Parque Linear..."
        // De: - **Conexão com a Natureza:** Vizinho imediato ao Parque Linear, unindo qualidade de vida, ar puro e conveniência urbana.
        // Para: - **Conexão & Estilo de Vida:** Unindo qualidade de vida, conforto, sofisticação e conveniência urbana em Barreiros.
        text = text.replace(
          /- \*\*Conexão com a Natureza:\*\* Vizinho imediato ao Parque Linear, unindo qualidade de vida, ar puro e conveniência urbana\./gi,
          '- **Conexão & Estilo de Vida:** Unindo qualidade de vida, conforto, sofisticação e conveniência urbana em Barreiros.',
        )

        // Qualquer menção residual a Córrego Grande neste documento
        text = text.replace(/Córrego Grande/gi, 'Barreiros, São José - SC')
        text = text.replace(/Parque Linear/gi, 'área nobre de Barreiros')

        ebookRec.set('extracted_text', text)
        ebookRec.set('size_bytes', text.length)
        app.saveNoValidate(ebookRec)
        console.log(
          '[MIGRATION 1760000056] ai_knowledge_files z6jbtepnisksbje atualizado com sucesso para Barreiros, São José - SC.',
        )
      }
    } catch (err) {
      console.warn('[MIGRATION 1760000056] Erro ao atualizar z6jbtepnisksbje:', String(err))
    }

    // 2. Correção de segurança: verificar se há qualquer outro registro em ai_knowledge_files associado ao Vistage que mencione Córrego Grande
    try {
      const files = app.findRecordsByFilter(
        'ai_knowledge_files',
        "(enterprise ~ 'Vistage' || name ~ 'Vistage') && (extracted_text ~ 'Córrego' || extracted_text ~ 'Corrego')",
        '-created',
        50,
        0,
      )
      for (const f of files) {
        if (f.id === 'z6jbtepnisksbje') continue
        let t = f.getString('extracted_text') || ''
        t = t.replace(
          /Córrego Grande,\s*Florianópolis\s*-\s*SC/gi,
          'Barreiros, São José - SC (Grande Florianópolis)',
        )
        t = t.replace(/Córrego Grande/gi, 'Barreiros, São José')
        f.set('extracted_text', t)
        app.saveNoValidate(f)
        console.log('[MIGRATION 1760000056] ai_knowledge_files extra corrigido:', f.id)
      }
    } catch (e) {
      console.warn('[MIGRATION 1760000056] Aviso busca ai_knowledge_files extras:', String(e))
    }
  },
  (app) => {
    // Reversão opcional (não reintroduz erro intencionalmente)
  },
)
