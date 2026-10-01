onRecordAfterCreateSuccess((e) => {
  // O hook nativo ai_knowledge_extract.js processa a extração de texto via $documents.toMarkdown
  // e texto puro para o campo extracted_text. Sem lógica vetorial quebrada.
  return e.next()
}, 'ai_knowledge_files')
