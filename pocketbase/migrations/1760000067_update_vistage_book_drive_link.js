migrate(
  (app) => {
    // 1760000067_update_vistage_book_drive_link.js
    // Atualiza o registro oficial do BOOK VISTAGE RESIDENCE em ai_knowledge_files (id fcvyoatlxt56do2)
    // com o link público do Google Drive fornecido pelo usuário (Mauro):
    // https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing
    //
    // Garante que:
    // 1. O registro fcvyoatlxt56do2 esteja ativo (is_active = true) e vinculado a 4ccqbm5dmc2d21f
    // 2. O extracted_text contenha o link oficial do Google Drive no formato que resolveLaunchAndKnowledgeData reconhece
    // 3. A summary seja descritiva para o RAG e busca semântica da Bia
    // 4. Nenhum outro material indevido (ex: duplicatas vazias com nome errado) interfira
    console.log('[MIGRATION_1760000067] Atualizando registro do BOOK VISTAGE RESIDENCE...')

    const DRIVE_PUBLIC_LINK =
      'https://drive.google.com/file/d/1w9GadvkqN4aILCYfcg_6-tN6qFbcsCeG/view?usp=sharing'
    const VISTAGE_PROP_ID = '4ccqbm5dmc2d21f'

    try {
      const bookRec = app.findRecordById('ai_knowledge_files', 'fcvyoatlxt56do2')
      if (bookRec) {
        const structuredText = `# BOOK VISTAGE RESIDENCE
Empreendimento: Vistage Residence
Vínculo: Imóvel ID ${VISTAGE_PROP_ID} (Vistage Residence Barreiros - AJ Coelho)
Fonte Oficial: Google Drive (Material Oficial AJ Coelho)
Link Oficial para compartilhamento: ${DRIVE_PUBLIC_LINK}

Resumo: Book oficial completo de apresentação e vendas em alta definição do Vistage Residence Barreiros (AJ Coelho Engenharia). Contém todas as perspectivas 3D, renders de fachada, plantas humanizadas de 2 e 3 dormitórios com suíte e opções com garden privativo, além das áreas comuns e de lazer completas (rooftop, piscina aquecida na cobertura com vista panorâmica, academia com vista mar, salões de festas gourmet, playground e brinquedoteca).

Localização: Rua Capitão Pedro Leite, nº 28, Barreiros, São José - SC (CEP 88.117-600), ao lado de Florianópolis com acesso facilitado à BR-101 e Via Expressa.`

        bookRec.set('is_active', true)
        bookRec.set('name', 'BOOK VISTAGE RESIDENCE.pdf')
        bookRec.set('enterprise', 'Vistage Residence')
        bookRec.set('property_id', VISTAGE_PROP_ID)
        bookRec.set('mime_type', 'application/pdf')
        bookRec.set('extracted_text', structuredText)
        bookRec.set(
          'summary',
          'Book completo de alta definição com renders, arquitetura, plantas humanizadas de 2 e 3 dormitórios e áreas de lazer do Vistage Residence. Link público oficial do Google Drive para compartilhamento com leads interessados.',
        )

        app.saveNoValidate(bookRec)
        console.log(
          '[MIGRATION_1760000067] BOOK VISTAGE RESIDENCE (fcvyoatlxt56do2) atualizado com sucesso com link público do Drive!',
        )
      } else {
        console.warn(
          '[MIGRATION_1760000067] Registro fcvyoatlxt56do2 não encontrado por ID direto!',
        )
      }
    } catch (err) {
      console.error('[MIGRATION_1760000067] Erro ao atualizar fcvyoatlxt56do2: ' + err.message)
    }

    // Limpar link do drive no registro .md (z6jbtepnisksbje) para mantê-lo estritamente como texto de conhecimento interno/RAG,
    // assegurando que o arquivo fcvyoatlxt56do2 (BOOK VISTAGE RESIDENCE.pdf) seja o único e legítimo documento selecionado.
    try {
      const mdRec = app.findRecordById('ai_knowledge_files', 'z6jbtepnisksbje')
      if (mdRec) {
        let curText = mdRec.getString('extracted_text') || ''
        if (curText.includes(DRIVE_PUBLIC_LINK)) {
          curText = curText.replace(new RegExp('\\n*Link do Book Oficial em PDF:.*', 'g'), '')
          mdRec.set('extracted_text', curText)
          app.saveNoValidate(mdRec)
          console.log('[MIGRATION_1760000067] Registro z6jbtepnisksbje mantido exclusivo para RAG.')
        }
      }
    } catch (_) {}
  },
  (app) => {},
)
