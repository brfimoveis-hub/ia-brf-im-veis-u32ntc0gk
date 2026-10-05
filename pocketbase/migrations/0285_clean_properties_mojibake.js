/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0285: Limpeza do mojibake Windows-1252/ISO-8859-1 gravado em properties
 * Padrões corrompidos identificados no catálogo:
 * - espaço篠 / espa篠 -> ço e / espaço
 * - 頡 -> é a
 * - 硠 -> ça
 * - ꠰ -> ocê (voc꠰ -> você)
 * - 㯬 -> ão
 * - Balneário, Florianópolis, São José, Palhoça, suítes, etc.
 */
migrate(
  (app) => {
    const mojibakeRules = [
      [/espa篠e\s*luxo/gi, 'espaço e luxo'],
      [/espa篠/gi, 'espaço '],
      [/espaço篠/gi, 'espaço e '],
      [/頡\s*oportunidade/gi, 'é a oportunidade'],
      [/頡/gi, 'é a '],
      [/seguran硠/gi, 'segurança'],
      [/硠/gi, 'ça'],
      [/voc꠰/gi, 'você'],
      [/꠰/gi, 'ocê'],
      [/㯬/gi, 'ão'],
      [/su\u00edte\u00edte\u0356ES/gi, 'suítes'],
      [/su\u00edte\u00edte\u0356E/gi, 'suíte'],
      [/su\u00edte\u00edte\u0356/gi, 'suíte'],
      [/su\u00edte\u00edtes/gi, 'suítes'],
      [/su\u00edte\u00edte/gi, 'suíte'],
      [/su\u00edte\u00edte\u00edte\u00edte\u00edtes/gi, 'suítes'],
      [/su\u00edte\u00edte\u00edte\u00edte/gi, 'suítes'],
      [/su\u00edte\u00edte\u00edte/gi, 'suíte'],
      [/demi-su\u00edte\u00edte\u00edte\u00edte\u00edtes/gi, 'demi-suítes'],
      [/demi-su\u00edte\u00edte\u00edte\u00edte/gi, 'demi-suítes'],
      [/demi-su\u00edte\u00edte\u00edte/gi, 'demi-suíte'],
      [/demi-su\u00edte\u00edtes/gi, 'demi-suítes'],
      [/demi-su\u00edte\u00edte/gi, 'demi-suíte'],
      [/demi-su\uFFFD/gi, 'demi-suíte'],
      [/demi-su\b/gi, 'demi-suíte'],
      [/su\u00edte\u00edtea\s+em/gi, 'sua em'],
      [/su\u00edte\u00edtea/gi, 'sua'],
      [/su\u00edte\u00edtel/gi, 'Sul'],
      [/su\u00edte\u00edtebsolo/gi, 'subsolo'],
      [/su\u00edte\u00edte\u00ad/gi, 'suíte'],
      [/su\uFFFDs/gi, 'suítes'],
      [/su\uFFFD/gi, 'suíte'],
      [/DORMIT\u04d2IOS/gi, 'DORMITÓRIOS'],
      [/dormit\u04d2ios/gi, 'dormitórios'],
      [/dormit\u04d2io/gi, 'dormitório'],
      [/dormit\udb72\ude69o/gi, 'dormitório'],
      [/dormit\udb72\ude69os/gi, 'dormitórios'],
      [/DORMIT\udb72\ude69OS/gi, 'DORMITÓRIOS'],
      [/im\u03f6el/gi, 'imóvel'],
      [/im\u03f6eis/gi, 'imóveis'],
      [/IM\u0416EL/gi, 'IMÓVEL'],
      [/IM\u0416EIS/gi, 'IMÓVEIS'],
      [/NA\s+PALHO\u01c1/gi, 'NA PALHOÇA'],
      [/Palho\u01c1\s*SC/gi, 'Palhoça SC'],
      [/Palho\u01c1/gi, 'Palhoça'],
      [/Jurer\u02a0Internacional/gi, 'Jurerê Internacional'],
      [/JUR\u02a0INTERNACIONAL/gi, 'JURERÊ INTERNACIONAL'],
      [/Jurer\u02a0/gi, 'Jurerê'],
      [/JUR\u02a0/gi, 'JURERÊ'],
      [/Saco\s+dos\s+Lim\u00f5es\u00f5es\u00f5es/gi, 'Saco dos Limões'],
      [/Saco\s+dos\s+Lim\u00f5es\u00f5es/gi, 'Saco dos Limões'],
      [/Saco\s+dos\s+Lim\uFFFD\uFFFD/gi, 'Saco dos Limões'],
      [/Lan\u786dento/gi, 'Lançamento'],
      [/LAN\u01c1MENTO/gi, 'LANÇAMENTO'],
      [/ALTO\s+PADR\u00cf/gi, 'ALTO PADRÃO'],
      [/alto\s+padr\u00cf/gi, 'alto padrão'],
      [/Alto\s+Padr\u00cf/gi, 'Alto Padrão'],
      [/padr\u00cf/gi, 'padrão'],
      [/INCORPORA\u01c3O/gi, 'INCORPORAÇÃO'],
      [/incorpora\u01c3o/gi, 'incorporação'],
      [/incorpora\u78ef/gi, 'incorporação'],
      [/localiza\u78ef/gi, 'localização'],
      [/sofistica\u78ef/gi, 'sofisticação'],
      [/seguran\u7861/gi, 'segurança'],
      [/espa\u786f\u00b3o/gi, 'espaçoso'],
      [/espa\u786f\u00b3a/gi, 'espaçosa'],
      [/espa\u786f,/gi, 'espaço,'],
      [/espa\u786f/gi, 'espaço'],
      [/Espa\u786f/gi, 'Espaço'],
      [/espa\u7bb0/gi, 'espaço'],
      [/f\u18e9l/gi, 'fácil'],
      [/voc\ua8a0/gi, 'você'],
      [/regi\u3be0/gi, 'região'],
      [/vis\u3be0/gi, 'visão'],
      [/n\u3be0perca/gi, 'não perca'],
      [/n\u3be0/gi, 'não '],
      [/N\u3be0/gi, 'Não '],
      [/rea\s+total/gi, 'Área total'],
      [/rea\s+privativa/gi, 'Área privativa'],
      [/rea\s+constru/gi, 'Área construída'],
      [/Ӵima Casa/gi, 'Ótima Casa'],
      [/Ӵima/gi, 'Ótima'],
      [/&times;/gi, ''],
      [/&amp;/g, '&'],
      [/&nbsp;/g, ' '],
      [/&quot;/g, '"'],
      [/&#39;/g, "'"],
      [/&ccedil;/g, 'ç'],
      [/&atilde;/g, 'ã'],
      [/&otilde;/g, 'õ'],
      [/&eacute;/g, 'é'],
      [/&aacute;/g, 'á'],
      [/&iacute;/g, 'í'],
      [/&oacute;/g, 'ó'],
      [/&uacute;/g, 'ú'],
    ]

    function cleanString(str) {
      if (!str || typeof str !== 'string') return ''
      let s = str
      for (let i = 0; i < mojibakeRules.length; i++) {
        const [pat, rep] = mojibakeRules[i]
        s = s.replace(pat, rep)
      }
      return s
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }

    try {
      const records = app.findRecordsByFilter('properties', '', '', 500)
      let count = 0
      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        const oldDesc = rec.getString('description') || ''
        const oldTitle = rec.getString('title') || ''
        const newDesc = cleanString(oldDesc)
        const newTitle = cleanString(oldTitle)

        let dirty = false
        if (newDesc !== oldDesc) {
          rec.set('description', newDesc)
          dirty = true
        }
        if (newTitle !== oldTitle) {
          rec.set('title', newTitle)
          dirty = true
        }

        if (dirty) {
          app.save(rec)
          count++
        }
      }
      console.log(
        `[MIG_0285] Limpeza de mojibake executada com sucesso em ${count} registros de properties.`,
      )
    } catch (e) {
      console.warn('[MIG_0285] Erro na limpeza de mojibake em properties:', e)
    }
  },
  (app) => {},
)
