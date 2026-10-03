// pocketbase/hooks/on_property_sanitize.js
// Intercepta criação e atualização na coleção 'properties'
// Garante que nenhum caminho de escrita grave título com repetições acentuadas ("ÁÁÁÁÁrea...") ou lixo remanescente
// IMPORTANTE: Todas as funções/variáveis devem ser inline no callback (scoping rule da JSVM do PocketBase)

onRecordCreate((e) => {
  const record = e.record
  if (record) {
    const title = record.getString('title')
    if (title) {
      let clean = title
      if (typeof clean.normalize === 'function') {
        clean = clean.normalize('NFC')
      }
      // Preservar acentuação portuguesa: colapsar apenas caracteres idênticos repetidos 3 ou mais vezes
      clean = clean.replace(/(.)\1{2,}/g, '$1$1').trim()
      if (/(.)\1{4,}/.test(clean)) {
        const code = record.getString('code') || 'imóvel'
        const city = record.getString('city') || 'SC'
        clean = `Imóvel ${code} — ${city}`
      }
      if (clean !== title) {
        record.set('title', clean)
      }
    }
  }
  return e.next()
}, 'properties')

onRecordUpdate((e) => {
  const record = e.record
  if (record) {
    const title = record.getString('title')
    if (title) {
      let clean = title
      if (typeof clean.normalize === 'function') {
        clean = clean.normalize('NFC')
      }
      // Preservar acentuação portuguesa: colapsar apenas caracteres idênticos repetidos 3 ou mais vezes
      clean = clean.replace(/(.)\1{2,}/g, '$1$1').trim()
      if (/(.)\1{4,}/.test(clean)) {
        const code = record.getString('code') || 'imóvel'
        const city = record.getString('city') || 'SC'
        clean = `Imóvel ${code} — ${city}`
      }
      if (clean !== title) {
        record.set('title', clean)
      }
    }
  }
  return e.next()
}, 'properties')
