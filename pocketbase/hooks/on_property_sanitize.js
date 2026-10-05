// pocketbase/hooks/on_property_sanitize.js
// Intercepta criação e atualização na coleção 'properties'
// Garante que nenhum caminho de escrita grave título com repetições acentuadas ("ÁÁÁÁÁrea...") ou lixo remanescente
// IMPORTANTE: Todas as funções/variáveis devem ser inline no callback (scoping rule da JSVM do PocketBase)

onRecordCreate((e) => {
  const record = e.record
  if (record) {
    const code = record.getString('code')
    if (code) {
      const normalizedCode = code
        .replace(/\s+/g, '')
        .replace(/^([A-Za-z]+)-+(\d+)/, '$1$2')
        .toUpperCase()
        .trim()
      if (normalizedCode !== code) {
        record.set('code', normalizedCode)
      }
    }
    const title = record.getString('title')
    if (title) {
      let clean = title
      if (typeof clean.normalize === 'function') {
        clean = clean.normalize('NFC')
      }
      // Preservar acentuação portuguesa: colapsar apenas caracteres idênticos repetidos 3 ou mais vezes
      clean = clean.replace(/(.)\1{2,}/g, '$1$1').trim()
      if (/(.)\1{4,}/.test(clean)) {
        const cCode = record.getString('code') || 'imóvel'
        const city = record.getString('city') || 'SC'
        clean = `Imóvel ${cCode} — ${city}`
      }
      if (clean !== title) {
        record.set('title', clean)
      }
    }
    const desc = record.getString('description')
    if (desc) {
      let cleanDesc = desc
      cleanDesc = cleanDesc
        .replace(/([A-Za-zÀ-ÖØ-öø-ÿ])\1{3,}/g, '$1')
        .replace(/Jurer\uA809nternacional/gi, 'Jurerê Internacional')
        .replace(/Jurer\uA809/gi, 'Jurerê')
        .replace(/seguran\u7861total/gi, 'segurança total')
        .replace(/segurançatotal/gi, 'segurança total')
        .replace(/espa篠e\s*luxo/gi, 'espaço e luxo')
        .replace(/espa篠/gi, 'espaço ')
        .replace(/頡\s*oportunidade/gi, 'é a oportunidade')
        .replace(/suítea\s+empresa/gi, 'sua empresa')
        .replace(/suítea/gi, 'sua')
        .replace(/suítel/gi, 'Sul')
        .replace(/resuíteltados/gi, 'resultados')
        .replace(/ࠖenda/gi, 'à venda')
        .replace(/࠶enda/gi, 'à venda')
        .replace(/im󶥬/gi, 'imóvel')
        .replace(/neg󣩯s/gi, 'negócios')
        .replace(/residꮣia/gi, 'residência')
        .replace(/vocꠢ/gi, 'você ')
        .replace(/voc꠳/gi, 'você ')
        .replace(/voc꠰/gi, 'você')
        .replace(/São José顠/gi, 'São José ')
        .replace(/São José頿\?*/gi, 'São José')
      if (cleanDesc !== desc) {
        record.set('description', cleanDesc)
      }
    }
  }
  return e.next()
}, 'properties')

onRecordUpdate((e) => {
  const record = e.record
  if (record) {
    const code = record.getString('code')
    if (code) {
      const normalizedCode = code
        .replace(/\s+/g, '')
        .replace(/^([A-Za-z]+)-+(\d+)/, '$1$2')
        .toUpperCase()
        .trim()
      if (normalizedCode !== code) {
        record.set('code', normalizedCode)
      }
    }
    const title = record.getString('title')
    if (title) {
      let clean = title
      if (typeof clean.normalize === 'function') {
        clean = clean.normalize('NFC')
      }
      // Preservar acentuação portuguesa: colapsar apenas caracteres idênticos repetidos 3 ou mais vezes
      clean = clean.replace(/(.)\1{2,}/g, '$1$1').trim()
      if (/(.)\1{4,}/.test(clean)) {
        const cCode = record.getString('code') || 'imóvel'
        const city = record.getString('city') || 'SC'
        clean = `Imóvel ${cCode} — ${city}`
      }
      if (clean !== title) {
        record.set('title', clean)
      }
    }
    const desc = record.getString('description')
    if (desc) {
      let cleanDesc = desc
      cleanDesc = cleanDesc
        .replace(/([A-Za-zÀ-ÖØ-öø-ÿ])\1{3,}/g, '$1')
        .replace(/Jurer\uA809nternacional/gi, 'Jurerê Internacional')
        .replace(/Jurer\uA809/gi, 'Jurerê')
        .replace(/seguran\u7861total/gi, 'segurança total')
        .replace(/segurançatotal/gi, 'segurança total')
        .replace(/espa篠e\s*luxo/gi, 'espaço e luxo')
        .replace(/espa篠/gi, 'espaço ')
        .replace(/頡\s*oportunidade/gi, 'é a oportunidade')
        .replace(/suítea\s+empresa/gi, 'sua empresa')
        .replace(/suítea/gi, 'sua')
        .replace(/suítel/gi, 'Sul')
        .replace(/resuíteltados/gi, 'resultados')
        .replace(/ࠖenda/gi, 'à venda')
        .replace(/࠶enda/gi, 'à venda')
        .replace(/im󶥬/gi, 'imóvel')
        .replace(/neg󣩯s/gi, 'negócios')
        .replace(/residꮣia/gi, 'residência')
        .replace(/vocꠢ/gi, 'você ')
        .replace(/voc꠳/gi, 'você ')
        .replace(/voc꠰/gi, 'você')
        .replace(/São José顠/gi, 'São José ')
        .replace(/São José頿\?*/gi, 'São José')
      if (cleanDesc !== desc) {
        record.set('description', cleanDesc)
      }
    }
  }
  return e.next()
}, 'properties')
