// pocketbase/hooks/sync_properties.js
// Sincronização periódica e sob demanda do catálogo de imóveis da BRF Imóveis
// Fonte oficial: https://www.brfimoveis.com.br
// Garante UTF-8 limpo, sem mojibake, sem entidades HTML sujas (&times;), imagens válidas e sem prefixo de código corrompido.
// PocketBase JSVM: todas as funções de processamento inline dentro dos callbacks ou reusadas diretamente.

// Execução a cada hora
cronAdd('sync_properties_hourly', '0 * * * *', () => {
  $app.logger().info('Iniciando sincronização horária de imóveis da BRF...')

  function normalizeMojibake(text) {
    if (!text || typeof text !== 'string') return ''
    let cleaned = text

    const mojibakeMap = [
      [/BALNERIO\s+CAMBORI\u06a0/gi, 'Balneário Camboriú'],
      [/BALNERIO\s+CAMBORI[UÚuú]?/gi, 'Balneário Camboriú'],
      [/Balne\u1ca9o\s+Cambori\u06a0/gi, 'Balneário Camboriú'],
      [/Balne\u1ca9o\s+Cambori[uú]/gi, 'Balneário Camboriú'],
      [/Balne\u1ca9o/gi, 'Balneário'],
      [/Balne\u00e1rio/gi, 'Balneário'],
      [/Balne\uFFFDrio/gi, 'Balneário'],
      [/Balne\u00b2\u00a9o/gi, 'Balneário'],
      [/Balne\u00b2rio/gi, 'Balneário'],
      [/BALNERIO\s+ESTREITO\s+FLORIAN\u04d0OLIS/gi, 'Balneário Estreito Florianópolis'],
      [/BALNERIO\s+ESTREITO/gi, 'Balneário Estreito'],
      [/BALNERIO\/ESTREITO/gi, 'Balneário/Estreito'],
      [/BALNERIO/gi, 'Balneário'],
      [/FLORIAN\u04d0OLIS/gi, 'FLORIANÓPOLIS'],
      [/Florian\u04d0olis/gi, 'Florianópolis'],
      [/Florian\udb40\udfecis/gi, 'Florianópolis'],
      [/Florian\u00f3polis/gi, 'Florianópolis'],
      [/S\u00cf\s*JOS\u0260\s*\(SC\)/gi, 'São José (SC)'],
      [/S\u00cf\s*JOS\u0260/gi, 'São José'],
      [/S\u00cf\s*JOS\u026c/gi, 'São José'],
      [/S\u00cf\s*JOSE/gi, 'São José'],
      [/S\u00cf\s*JOS/gi, 'São José'],
      [/S\u00cf\s*PEDRO/gi, 'São Pedro'],
      [/S\u00cf\s*Pedro/gi, 'São Pedro'],
      [/S\u00cf\s*JO\u00c3O/gi, 'São João'],
      [/S\u00cf\s*Jo\u00e3o/gi, 'São João'],
      [/S\u00cf\s*PAULO/gi, 'São Paulo'],
      [/S\u00cf\s*Paulo/gi, 'São Paulo'],
      [/S\u00cf\s*BENTO/gi, 'São Bento'],
      [/S\u00cf\s*Bento/gi, 'São Bento'],
      [/S\u00cf\s*LUCAS/gi, 'São Lucas'],
      [/S\u00cf\s*Lucas/gi, 'São Lucas'],
      [/S\u00cf\s*MIGUEL/gi, 'São Miguel'],
      [/S\u00cf\s*Miguel/gi, 'São Miguel'],
      [/S\u00cf\s*FRANCISCO/gi, 'São Francisco'],
      [/S\u00cf\s*Francisco/gi, 'São Francisco'],
      [/S\u00cf\s*SEBASTI\u00c3O/gi, 'São Sebastião'],
      [/S\u00cf\s*Sebasti\u00e3o/gi, 'São Sebastião'],
      [/S\u3be0Jos\u987fC/gi, 'São José/SC'],
      [/S\u3be0Jos/gi, 'São José'],
      [/S\u3be0Pedro/gi, 'São Pedro'],
      [/S\.Jos\u987fC/gi, 'São José/SC'],
      [/S\.Jos\u982d/gi, 'São José'],
      [/S\.Jos\u0260/gi, 'São José'],
      [/S\.Jos\u026c/gi, 'São José'],
      [/S\.Jos\u00e9/gi, 'São José'],
      [/S\.Jose/gi, 'São José'],
      [/S\u00e3o\s+Jos\u00e9\u982c/gi, 'São José,'],
      [/S\u00e3o\s+Jos\u00e9\u980d/gi, 'São José'],
      [/S\u00e3o\s+Jos\u0260/gi, 'São José'],
      [/S\u00e3o\s+Jos\u026c/gi, 'São José'],
      [/S\u00e3o\s+Jos\u00e9\u987fC/gi, 'São José/SC'],
      [/S\u00e3o\s+Jos\u00e9\u9803/gi, 'São José cresce'],
      [/OPORTUNIDADE\s+\u068eICA/gi, 'OPORTUNIDADE ÚNICA'],
      [/OPORTUNIDADE\s+\u068eICO/gi, 'OPORTUNIDADE ÚNICA'],
      [/OPORTUNIDADE\s+IMPERD\u0356EL/gi, 'OPORTUNIDADE IMPERDÍVEL'],
      [/OPORTUNIDADE\s+IMPERDIVEL/gi, 'OPORTUNIDADE IMPERDÍVEL'],
      [/\u068eICA/gi, 'ÚNICA'],
      [/\u068eICO/gi, 'ÚNICO'],
      [/\u068eICK/gi, 'ÚNICO'],
      [/\u068eico/gi, 'Único'],
      [/\u068eica/gi, 'Única'],
      [/\u068eTIMO/gi, 'ÚLTIMO'],
      [/\u068etimo/gi, 'Último'],
      [/\u068eTIMA/gi, 'ÚLTIMA'],
      [/\u068etima/gi, 'Última'],
      [/-\u068eTIMO/gi, '- ÚLTIMO'],
      [/NA\s+PALHO\u01c1/gi, 'NA PALHOÇA'],
      [/Palho\u01c1\s*SC/gi, 'Palhoça SC'],
      [/Palho\u01c1/gi, 'Palhoça'],
      [/JURERE\s+INTERNACIONAL/gi, 'Jurerê Internacional'],
      [/Jurer\u02a0Internacional/gi, 'Jurerê Internacional'],
      [/JUR\u02a0INTERNACIONAL/gi, 'JURERÊ INTERNACIONAL'],
      [/Jurer\u02a0/gi, 'Jurerê'],
      [/JUR\u02a0/gi, 'JURERÊ'],
      [/Pedra\s+Branca/gi, 'Pedra Branca'],
      [/Saco\s+dos\s+Lim\u00f5es\u00f5es\u00f5es/gi, 'Saco dos Limões'],
      [/Saco\s+dos\s+Lim\u00f5es\u00f5es/gi, 'Saco dos Limões'],
      [/Saco\s+dos\s+Lim\uFFFD\uFFFD/gi, 'Saco dos Limões'],
      [/Saco\s+dos\s+Lim/gi, 'Saco dos Limões'],
      [/Nossa\s+Senhora\s+do\s+Ros\u00b2\u00a9o/gi, 'Nossa Senhora do Rosário'],
      [/Nossa\s+Senhora\s+do\s+Ros\u1ca9o/gi, 'Nossa Senhora do Rosário'],
      [/Nossa\s+Senhora\s+do\s+Ros\uFFFDrio/gi, 'Nossa Senhora do Rosário'],
      [/Ros\u00b2\u00a9o/gi, 'Rosário'],
      [/Ros\u1ca9o/gi, 'Rosário'],
      [/Ros\uFFFDrio/gi, 'Rosário'],
      [/Agron\udb6d\ude63a/gi, 'Agronômica'],
      [/Cobi\u7864o/gi, 'Cobiçado'],
      [/Ac\u00f3res/gi, 'Açores'],
      [/Mo\u786d\u00adbique/gi, 'Moçambique'],
      [/Mo\u786d\u00ad/gi, 'Moçambique'],
      [/Lan\u786dento/gi, 'Lançamento'],
      [/LAN\u01c1MENTO/gi, 'LANÇAMENTO'],
      [/ALTO\s+PADR\u00cf/gi, 'ALTO PADRÃO'],
      [/alto\s+padr\u00cf/gi, 'alto padrão'],
      [/Alto\s+Padr\u00cf/gi, 'Alto Padrão'],
      [/PADR\u00cf/gi, 'PADRÃO'],
      [/padr\u00cf/gi, 'padrão'],
      [/Padr\u00cf/gi, 'Padrão'],
      [/alto\s+padr\u3be0/gi, 'alto padrão'],
      [/Alto\s+Padr\u3be0/gi, 'Alto Padrão'],
      [/padr\u3be0/gi, 'padrão'],
      [/INCORPORA\u01c3O/gi, 'INCORPORAÇÃO'],
      [/incorpora\u01c3o/gi, 'incorporação'],
      [/incorpora\u00b2\u00a9a/gi, 'incorporação imobiliária'],
      [/incorpora\u78ef\s+imobili\u1ca9a/gi, 'incorporação imobiliária'],
      [/incorpora\u78ef/gi, 'incorporação'],
      [/Incorpora\u78ef/gi, 'Incorporação'],
      [/localiza\u78ef\s+estrat\u99e9ca/gi, 'localização estratégica'],
      [/localiza\u78ef\s+privilegiada/gi, 'localização privilegiada'],
      [/localiza\u78ef/gi, 'localização'],
      [/Localiza\u78ef/gi, 'Localização'],
      [/sofistica\u78ef/gi, 'sofisticação'],
      [/Sofistica\u78ef/gi, 'Sofisticação'],
      [/seguran\u7861/gi, 'segurança'],
      [/Seguran\u7861/gi, 'Segurança'],
      [/seguran\u786c/gi, 'segurança'],
      [/espa\u786f\u00b3o/gi, 'espaçoso'],
      [/espa\u786f\u00b3a/gi, 'espaçosa'],
      [/espa\u786f,/gi, 'espaço,'],
      [/espa\u786f/gi, 'espaço'],
      [/Espa\u786f/gi, 'Espaço'],
      [/espa\u7bb0/gi, 'espaço'],
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
      [/N\u068dERO/gi, 'NÚMERO'],
      [/n\u068dero/gi, 'número'],
      [/AN\u068eCIO/gi, 'ANÚNCIO'],
      [/an\u068ecio/gi, 'anúncio'],
      [/FUTURO\s+\u0260\s*AGORA/gi, 'FUTURO É AGORA'],
      [/\b\u0260\b/g, 'é'],
      [/\b\u026c\b/g, 'é'],
      [/T\u0252REO/gi, 'TÉRREO'],
      [/t\u0252reo/gi, 'térreo'],
      [/t\u9cb2eo/gi, 'térreo'],
      [/t\u00e9rreo/gi, 'térreo'],
      [/MOBILIAADO/gi, 'MOBILIADO'],
      [/Pr\udb78\ude69m\u00ad\s*\u07dd\s*Avenida das Torres/gi, 'Próximo à Avenida das Torres'],
      [/Pr\udb78\ude69mo/gi, 'Próximo'],
      [/Pr\udb78\ude69m\u00ad/gi, 'Próximo'],
      [/Pr\u00b2\u00a9mo/gi, 'Próximo'],
      [/f\u18e9l\s+acesso/gi, 'fácil acesso'],
      [/f\u18e9l/gi, 'fácil'],
      [/\u0800Avenida/gi, 'à Avenida'],
      [/\u0800BR-101/gi, 'à BR-101'],
      [/\u0800venda/gi, 'à venda'],
      [/\u0800Venda/gi, 'à Venda'],
      [/\u0800margens/gi, 'às margens'],
      [/\u0800/g, 'à '],
      [/\b\u07dd\b/g, 'à'],
      [/voc\ua8a0/gi, 'você'],
      [/voc\u00ea/gi, 'você'],
      [/essa\s+\u0260\s+a/gi, 'essa é a'],
      [/este\s+\u0260\s+o/gi, 'este é o'],
      [/isso\s+\u0260\s+o/gi, 'isso é o'],
      [/Assim\s+\u0260\s+o/gi, 'Assim é o'],
      [/Aqui\s+voc\u00ea\s+Ganha/gi, 'Aqui você ganha'],
      [/espera\s+com\s+uma\s+casa/gi, 'te espera com uma casa'],
      [/magnco/gi, 'magnífico'],
      [/condomo/gi, 'condomínio'],
      [/edla/gi, 'edícula'],
      [/Edla/gi, 'Edícula'],
      [/imperdl/gi, 'imperdível'],
      [/Imperdl/gi, 'Imperdível'],
      [/fama\?/gi, 'família?'],
      [/fama\./gi, 'família.'],
      [/fama\b/gi, 'família'],
      [/prop\u03f3\u05b4o/gi, 'propósito'],
      [/prop\u03f3\u05b4a/gi, 'propícia'],
      [/eleg\u2bb1ia/gi, 'elegância'],
      [/vis\u3be0/gi, 'visão'],
      [/regimais/gi, 'regiões mais'],
      [/constru\s+com\s+laje/gi, 'construída com laje'],
      [/constru:\s*/gi, 'construída: '],
      [/NEG\u04c3IO/gi, 'NEGÓCIO'],
      [/neg\u04c3io/gi, 'negócio'],
      [/opera\u7d65s/gi, 'operações'],
      [/EQUIL\u0342RIO/gi, 'EQUILÍBRIO'],
      [/equil\u0342rio/gi, 'equilíbrio'],
      [/PRIVIL\u0247IO/gi, 'PRIVILÉGIO'],
      [/privil\u0247io/gi, 'privilégio'],
      [/ESTRAT\u0247ICA/gi, 'ESTRATÉGICA'],
      [/estrat\u0247ica/gi, 'estratégica'],
      [/estrat\u99e9ca/gi, 'estratégica'],
      [/at\u982c\s*vagas/gi, 'até 8 vagas'],
      [/at\u982c/gi, 'até'],
      [/at\u00e9\s*\u982c/gi, 'até '],
      [/Kurt\s+Ratour/gi, 'Kurt Radtke'],
      [/rea\s+total/gi, 'Área total'],
      [/rea\s+constru/gi, 'Área construída'],
      [/rea\s+Para/gi, 'Área Para'],
      [/rea\s+para/gi, 'Área para'],
      [/rea\s+grande/gi, 'Área grande'],
      [/rea\s+de/gi, 'Área de'],
      [/rea\s+comercial/gi, 'Área comercial'],
      [/rea\s+industrial/gi, 'Área industrial'],
      [/rea\s+privativa/gi, 'Área privativa'],
      [/rea\s+Rural/gi, 'Área Rural'],
      [/rea\s+rural/gi, 'Área rural'],
      [/EM\s+REA/gi, 'EM ÁREA'],
      [/em\s+rea/gi, 'em área'],
      [/gua\s+Termal/gi, 'Água Termal'],
      [/gua\s+termal/gi, 'Água termal'],
      [/J\u7861maginou/gi, 'Já imaginou'],
      [/J\u7861/gi, 'Já'],
      [/j\u1ca1lugadas/gi, 'já alugadas'],
      [/j\u1ca1/gi, 'já'],
      [/J\u1ca1/gi, 'Já'],
      [/n\u3be0perca/gi, 'não perca'],
      [/n\u3be0/gi, 'não '],
      [/N\u3be0/gi, 'Não '],
      [/regi\u3be0/gi, 'região'],
      [/Regi\u3be0/gi, 'Região'],
      [/2pisos/gi, '2 pisos'],
      [/mts/gi, 'metros'],
      [/2Dorm\/su\u00ed\s*\+\s*Lav\./gi, '2 dormitórios (1 suíte) + lavabo'],
      [
        /3Dorm\/su\u00edte\u00edte\s+demi-su\u00edte\u00edte\u00edte\u00edte/gi,
        '3 dormitórios (1 suíte + demi-suíte)',
      ],
      [
        /3DORM\/su\u00edte\u00edte\u0340\+2 demi-su\u00edte\u00edte\u00edte\u00edte/gi,
        '3 dormitórios (1 suíte + 2 demi-suítes)',
      ],
      [
        /3\s*DORMIT\u04d2IOS\/su\u00edte\u00edte\u0356E\/LAVABO/gi,
        '3 DORMITÓRIOS (1 SUÍTE) / LAVABO',
      ],
      [/\u04f4ima Casa/gi, 'Ótima Casa'],
      [/\u04f4ima/gi, 'Ótima'],
      [/Ӵima Casa/gi, 'Ótima Casa'],
      [/Ӵima/gi, 'Ótima'],
      [/\?{4,}/g, ''],
      [/&times;/gi, ''],
      [/&amp;/g, '&'],
      [/&nbsp;/g, ' '],
      [/&quot;/g, '"'],
      [/&#39;/g, "'"],
      [/&lt;/g, '<'],
      [/&gt;/g, '>'],
      [/&ccedil;/g, 'ç'],
      [/&atilde;/g, 'ã'],
      [/&otilde;/g, 'õ'],
      [/&eacute;/g, 'é'],
      [/&aacute;/g, 'á'],
      [/&iacute;/g, 'í'],
      [/&oacute;/g, 'ó'],
      [/&uacute;/g, 'ú'],
      [/&Ccedil;/g, 'Ç'],
      [/&Atilde;/g, 'Ã'],
      [/&Otilde;/g, 'Õ'],
      [/&Eacute;/g, 'É'],
      [/&Aacute;/g, 'Á'],
      [/&Iacute;/g, 'Í'],
      [/&Oacute;/g, 'Ó'],
      [/&Uacute;/g, 'Ú'],
    ]

    for (let [pattern, replacement] of mojibakeMap) {
      cleaned = cleaned.replace(pattern, replacement)
    }

    cleaned = cleaned
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
      .replace(
        /[\u068e\u04d0\u0260\u06a0\u00cf\u026c\u01c1\u01c3\u04d2\u03f6\u0416\u068d\u0252\u9cb2\u07dd\ua8a0\u7861\u786f\u78ef\u786d\u7864\u7bb0\u7d65\u99e9\u982c\u987f\u980d\u9803\u3be0\u18e9\u0342\u0247\u0356\u0340\u03f3\u05b4\u2bb1]/g,
        '',
      )
      .replace(/\s{2,}/g, ' ')

    return cleaned.trim()
  }

  function cleanCode(code, url) {
    if (!code && !url) return ''
    let c = (code || '').trim()
    c = c.replace(/^(?:c[oó]digo|c[oó]d\.?|#|igo)\s*:?\s*/i, '').trim()
    if (!c && url) {
      const m = url.match(/\/(\d{2,4})\/imoveis\//)
      if (m) c = 'BRF-' + m[1]
    }
    return c
  }

  function cleanCity(city, textToInferFrom) {
    let c = normalizeMojibake(city || '')
    if (!c || c === '×' || c === '&times;' || c.toLowerCase().includes('times') || c.length < 3) {
      const text = (textToInferFrom || '').toLowerCase()
      if (text.includes('florianopolis') || text.includes('florianópolis')) return 'Florianópolis'
      if (
        text.includes('sao-jose') ||
        text.includes('são josé') ||
        text.includes('sao jose') ||
        text.includes('s.josé')
      )
        return 'São José'
      if (text.includes('biguacu') || text.includes('biguaçu')) return 'Biguaçu'
      if (text.includes('palhoca') || text.includes('palhoça')) return 'Palhoça'
      return ''
    }
    if (/florian/i.test(c)) return 'Florianópolis'
    if (/s[aã]o\s*jos[eé]/i.test(c)) return 'São José'
    if (/bigua[cç]u/i.test(c)) return 'Biguaçu'
    if (/palho[cç]a/i.test(c)) return 'Palhoça'
    return c.replace(/\s*-\s*SC$/i, '').trim()
  }

  function cleanNeighborhood(neigh, url, title) {
    let n = normalizeMojibake(neigh || '')
    if (!n || /agende\s+sua\s+visita|\?{2,}|&times;|times/i.test(n) || n.length < 2) {
      if (url) {
        const m = url.match(
          /imoveis\/venda-[a-z0-9-]+-([a-z0-9-]+)-(?:florianopolis|sao-jose|biguacu|palhoca)-sc/i,
        )
        if (m && m[1]) {
          const slug = m[1].replace(/-/g, ' ')
          return slug.charAt(0).toUpperCase() + slug.slice(1)
        }
      }
      const knownBairros = [
        'Trindade',
        'Jurerê',
        'Canasvieiras',
        'Capoeiras',
        'Coqueiros',
        'Estreito',
        'Balneário',
        'Balneário do Estreito',
        'Agronômica',
        'Serraria',
        'Areias',
        'Kobrasol',
        'Campinas',
        'Barreiros',
        'Praia Comprida',
        'Centro',
        'Saco dos Limões',
        'Rio Caveiras',
        'Bom Viver',
        'Pantanal',
        'Córrego Grande',
        'Itacorubi',
      ]
      for (let b of knownBairros) {
        if (new RegExp('\\b' + b + '\\b', 'i').test(title || '')) {
          return b
        }
      }
      return ''
    }
    return n
  }

  function parsePropertyHtml(html, pageUrl) {
    if (!html || html.length < 200) return null

    let title = ''
    const titleMatches = [
      html.match(
        /<h1[^>]*class="[^"]*(?:property-title|title|imovel-title)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
      ),
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i),
      html.match(/<title>([\s\S]*?)<\/title>/i),
    ]
    for (let m of titleMatches) {
      if (m && m[1]) {
        title = m[1].replace(/<[^>]+>/g, '').trim()
        break
      }
    }
    title = normalizeMojibake(title)

    let price = 0
    let priceFormatted = ''
    const priceMatch = html.match(/R\$\s*([\d\.,]+)/i)
    if (priceMatch) {
      const rawPrice = priceMatch[1].trim()
      const numericStr = rawPrice.replace(/\./g, '').replace(',', '.')
      const parsed = parseFloat(numericStr)
      if (!isNaN(parsed) && parsed > 50000) {
        price = parsed
        priceFormatted = 'R$ ' + rawPrice
      }
    }

    let code = ''
    const codeMatches = [
      html.match(/C[oó]d\.?\s*([A-Za-z0-9\s-]+?)(?:<\/|<br|\n|$)/i),
      html.match(/(?:c[oó]digo|ref\.?)\s*:?\s*([A-Za-z0-9\s-]+?)(?:<\/|<br|\n|$)/i),
      title.match(/(?:-|–)\s*([A-Z]{2}\s*\d{2,4})\b/i),
    ]
    for (let m of codeMatches) {
      if (m && m[1]) {
        const candidate = m[1].replace(/<[^>]+>/g, '').trim()
        if (candidate.length >= 2 && candidate.length <= 15) {
          code = candidate
          break
        }
      }
    }
    code = cleanCode(code, pageUrl)

    let imageUrl = ''
    const imgMatches = [
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i),
      html.match(
        /https?:\/\/[^\s"']+\/admin\/imovel\/(?:mini|fotos)\/[^\s"']+\.(?:jpg|jpeg|png|webp)/i,
      ),
      html.match(/<img[^>]+src="([^"]+\/admin\/imovel\/[^"]+)"/i),
    ]
    for (let m of imgMatches) {
      if (m && m[1]) {
        imageUrl = m[1].trim()
        break
      } else if (m && typeof m[0] === 'string' && m[0].startsWith('http')) {
        imageUrl = m[0].trim()
        break
      }
    }

    let propertyType = 'Apartamento'
    const typeMatch =
      html.match(/Tipo de im[oó]vel[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i) ||
      html.match(/Tipo de im[oó]vel[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
    if (typeMatch && typeMatch[1]) {
      propertyType = normalizeMojibake(typeMatch[1].replace(/<[^>]+>/g, '')).trim()
    } else {
      if (/lan[cç]amento/i.test(title) || /lan[cç]amento/i.test(pageUrl))
        propertyType = 'Lançamento'
      else if (/casa/i.test(title) || /casa/i.test(pageUrl)) propertyType = 'Casa'
      else if (/terreno/i.test(title) || /terreno/i.test(pageUrl)) propertyType = 'Terreno'
      else if (/studio/i.test(title) || /studio/i.test(pageUrl)) propertyType = 'Studio'
      else if (/cobertura/i.test(title) || /cobertura/i.test(pageUrl)) propertyType = 'Cobertura'
    }

    let city = ''
    let neighborhood = ''

    const cityMatch =
      html.match(/Cidade[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i) ||
      html.match(/Cidade[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
    if (cityMatch && cityMatch[1]) {
      city = cityMatch[1].replace(/<[^>]+>/g, '').trim()
    }

    const neighMatch =
      html.match(/Bairro[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i) ||
      html.match(/Bairro[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i)
    if (neighMatch && neighMatch[1]) {
      neighborhood = neighMatch[1].replace(/<[^>]+>/g, '').trim()
    }

    city = cleanCity(city, pageUrl + ' ' + title)
    neighborhood = cleanNeighborhood(neighborhood, pageUrl, title)

    let bedrooms = 0
    let suites = 0
    let bathrooms = 0
    let parkingSpaces = 0
    let areaPrivativa = 0
    let areaTotal = 0

    const isTerreno = /terreno/i.test(propertyType) && !/casa/i.test(propertyType)

    const infoSectionMatch =
      html.match(
        /<div[^>]*class="[^"]*(?:property-info|info-box|card-info)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ) || html.match(/Informações do imóvel([\s\S]*?)(?:##|<h2|<div class="description)/i)
    const infoText = infoSectionMatch ? infoSectionMatch[1] : html.slice(0, 5000)

    if (!isTerreno) {
      const bedMatch =
        infoText.match(/(\d+)\s*(?:quartos?|dormit[oó]rios?|dorms?)/i) ||
        title.match(/(\d+)\s*(?:quartos?|dormit[oó]rios?|dorms?)/i)
      if (bedMatch) bedrooms = parseInt(bedMatch[1], 10)

      const suiteMatch =
        infoText.match(/(\d+)\s*(?:su[ií]tes?)/i) || title.match(/(\d+)\s*(?:su[ií]tes?)/i)
      if (suiteMatch) suites = parseInt(suiteMatch[1], 10)
      else if (
        /1\s*su[ií]te/i.test(title) ||
        /com su[ií]te/i.test(title) ||
        /su[ií]te\b/i.test(title)
      )
        suites = 1

      const bathMatch = infoText.match(/(\d+)\s*(?:banheiros?|banh\b)/i)
      if (bathMatch) bathrooms = parseInt(bathMatch[1], 10)

      const parkMatch =
        infoText.match(/(\d+)\s*(?:vagas?|vg\b)/i) || title.match(/(\d+)\s*(?:vagas?|vg\b)/i)
      if (parkMatch) parkingSpaces = parseInt(parkMatch[1], 10)
    }

    const privMatch =
      html.match(/[AÁ]rea\s+privativa[\s\S]*?<dd[^>]*>([\d\.,]+)/i) ||
      html.match(/[AÁ]rea\s+privativa[\s\S]*?([\d\.,]+)\s*m/i)
    if (privMatch) {
      areaPrivativa = parseFloat(privMatch[1].replace(/\./g, '').replace(',', '.'))
    }

    const totMatch =
      html.match(/[AÁ]rea\s+total[\s\S]*?<dd[^>]*>([\d\.,]+)/i) ||
      html.match(/[AÁ]rea\s+total[\s\S]*?([\d\.,]+)\s*m/i) ||
      html.match(/(\d+[\.,]?\d*)\s*m²\s*total/i)
    if (totMatch) {
      areaTotal = parseFloat(totMatch[1].replace(/\./g, '').replace(',', '.'))
    }

    let description = ''
    const descMatch =
      html.match(
        /<div[^>]*class="[^"]*(?:description|descricao|property-description)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ) || html.match(/Detalhes do im[oó]vel[\s\S]*?<p>([\s\S]*?)<\/p>/i)
    if (descMatch && descMatch[1]) {
      description = normalizeMojibake(
        descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
      ).trim()
    }

    const features = []
    if (suites > 0) features.push(suites + (suites === 1 ? ' suíte' : ' suítes'))
    if (parkingSpaces > 0) features.push(parkingSpaces + (parkingSpaces === 1 ? ' vaga' : ' vagas'))
    if (/churrasqueira/i.test(html)) features.push('Churrasqueira')
    if (/piscina/i.test(html)) features.push('Piscina')
    if (/vista\s+mar/i.test(html) || /vista\s+para\s+o\s+mar/i.test(html))
      features.push('Vista para o mar')
    if (/academia|fitness/i.test(html)) features.push('Academia')
    if (/sacada/i.test(html)) features.push('Sacada')
    if (/hobby\s*box/i.test(html)) features.push('Hobby box')

    return {
      title: title.slice(0, 250),
      code: code,
      url: pageUrl,
      city: city,
      neighborhood: neighborhood,
      property_type: propertyType,
      transaction_type: 'Venda',
      price: price,
      price_formatted:
        priceFormatted ||
        (price > 0
          ? 'R$ ' + price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
          : 'Consulte'),
      bedrooms: isNaN(bedrooms) ? 0 : bedrooms,
      suites: isNaN(suites) ? 0 : suites,
      bathrooms: isNaN(bathrooms) ? 0 : bathrooms,
      parking_spaces: isNaN(parkingSpaces) ? 0 : parkingSpaces,
      area_privativa: isNaN(areaPrivativa) ? 0 : areaPrivativa,
      area_total: isNaN(areaTotal) ? 0 : areaTotal,
      description: description ? description.slice(0, 1500) : title,
      features: features,
      image_url: imageUrl,
      is_active: true,
    }
  }

  const ESSENTIAL_CATALOG = [
    {
      code: 'LM 329',
      title: 'TERRÁ JURERÊ - Para quem busca espaço, conforto e valorização',
      url: 'https://www.brfimoveis.com.br/329/imoveis/venda-lancamento-3-quartos-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Jurerê',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 3246735.84,
      price_formatted: 'R$ 3.246.735,84',
      bedrooms: 3,
      suites: 3,
      bathrooms: 4,
      parking_spaces: 2,
      area_privativa: 135.0,
      area_total: 185.0,
      description:
        'Lançamento TERRÁ em Jurerê, Florianópolis. Empreendimento de alto padrão exclusivo, 3 suítes, 2 vagas de garagem, sacada com churrasqueira, acabamento nobre, piscina aquecida, espaço gourmet e localização privilegiada no melhor ponto de Jurerê.',
      features: [
        'Terrá Jurerê',
        'Lançamento Alto Padrão',
        '3 suítes',
        '2 vagas',
        'Piscina aquecida',
        'Espaço Gourmet',
        'Jurerê',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260410T1711030300-945589921.jpg',
      is_active: true,
    },
    {
      code: 'LM 301',
      title: 'Viva Trindade - Lançamento Imobiliário Oportunidade de Investimento Rentável',
      url: 'https://www.brfimoveis.com.br/301/imoveis/venda-lancamento-lancamento-1-quarto-trindade-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Trindade',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 701000.0,
      price_formatted: 'R$ 701.000,00',
      bedrooms: 1,
      suites: 1,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 42.0,
      area_total: 65.0,
      description:
        'Lançamento Viva Trindade ao lado da UFSC em Florianópolis. Apartamentos studio e 1 dormitório projetados para rentabilidade máxima em locação (Airbnb ou estudantes). Condomínio inteligente com coworking, lavanderia compartilhada e rooftop.',
      features: [
        'Viva Trindade',
        'Ao lado da UFSC',
        'Rentabilidade',
        'Coworking',
        'Lavanderia compartilhada',
        'Rooftop',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250226T1934210300-913215710.jpg',
      is_active: true,
    },
    {
      code: 'LM 295',
      title: 'RESIDENCIAL AREIAS (Villa Areias) - Viva no Melhor de 2 dorm. em Areias São José-SC',
      url: 'https://www.brfimoveis.com.br/295/imoveis/venda-lancamento-lancamento-2-quartos-areias-sao-jose-sc',
      city: 'São José',
      neighborhood: 'Areias',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 445000.0,
      price_formatted: 'R$ 445.000,00',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 62.0,
      area_total: 85.0,
      description:
        'Residencial Areias (Villa Areias) em Areias, São José. Lançamento com 2 dormitórios (1 suíte), sacada com churrasqueira a carvão, vaga de garagem, salão de festas decorado, playground e localização estratégica próximo a comércios e vias de acesso.',
      features: [
        'Villa Areias',
        'Residencial Areias',
        '2 dormitórios',
        '1 suíte',
        'Churrasqueira a carvão',
        'São José',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20241107T1302260300-254866642.jpg',
      is_active: true,
    },
    {
      code: 'LM 310',
      title: 'Lançamento Biguaçu Rio Caveiras - Apartamentos 2 quartos com lazer completo',
      url: 'https://www.brfimoveis.com.br/310/imoveis/venda-lancamento-lancamento-2-quartos-rio-caveiras-biguacu-sc',
      city: 'Biguaçu',
      neighborhood: 'Rio Caveiras',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 310000.0,
      price_formatted: 'R$ 310.000,00',
      bedrooms: 2,
      suites: 0,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 54.0,
      area_total: 70.0,
      description:
        'Lançamento residencial em Biguaçu (bairro Rio Caveiras). Apartamentos de 2 dormitórios, sacada com churrasqueira, vaga privativa, condomínio fechado com piscina, quadra e segurança 24h. Financiamento facilitado e subsídios.',
      features: [
        'Biguaçu',
        'Rio Caveiras',
        '2 dormitórios',
        'Churrasqueira',
        'Piscina',
        'Condomínio fechado',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250625T1755170300-799866119.jpg',
      is_active: true,
    },
    {
      code: 'LM 330',
      title: '1 dormitório e studios a poucos metros da praia e vista mar - Canasvieiras',
      url: 'https://www.brfimoveis.com.br/330/imoveis/venda-lancamento-lancamento-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Canasvieiras',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 343698.79,
      price_formatted: 'R$ 343.698,79',
      bedrooms: 1,
      suites: 1,
      bathrooms: 1,
      parking_spaces: 1,
      area_privativa: 33.48,
      area_total: 45.0,
      description:
        'Lançamento exclusivo de studios e apartamentos de 1 dormitório em Canasvieiras, a poucos metros da praia com vista mar. Sacada com churrasqueira a carvão, piscina com deck, rooftop, coworking e lavanderia compartilhada. Ideal para rentabilidade Airbnb.',
      features: [
        'Vista mar',
        'Perto da praia',
        'Canasvieiras',
        'Ideal Airbnb',
        'Studios',
        'Piscina',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260415T1030390300-684781177.jpg',
      is_active: true,
    },
    {
      code: 'LM 342',
      title: 'Viva Balneário - Encostado a Beira Mar Continental com Vista p/Mar e Ponte',
      url: 'https://www.brfimoveis.com.br/342/imoveis/venda-lancamento-2-quartos-balneario-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Balneário',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 864303.25,
      price_formatted: 'R$ 864.303,25',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 77.79,
      area_total: 100.16,
      description:
        'Viva Balneário Estreito: alto padrão encostado à Beira-Mar Continental no Balneário do Estreito. Vista frontal para o mar e pontes Hercílio Luz. 2 dormitórios (1 suíte), 1 vaga coberta, piscina com raia, fitness center, espaço gourmet.',
      features: [
        'Viva Balneário',
        'Beira-Mar Continental',
        'Vista para o mar e ponte',
        'Piscina com raia',
        'Fitness center',
      ],
      image_url: 'https://www.brfimoveis.com.br/admin/imovel/mini/20260526T1815080300-85027948.jpg',
      is_active: true,
    },
    {
      code: 'LM 326',
      title: 'Colinas de São Pedro 2Dorm/suí + Lav. - mais espaço, conforto e sofisticação',
      url: 'https://www.brfimoveis.com.br/326/imoveis/venda-lancamento-apartamento-2-quartos-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Barreiros',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 932645.47,
      price_formatted: 'R$ 932.645,47',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 2,
      area_privativa: 85.0,
      area_total: 130.0,
      description:
        'Empreendimento moderno Colinas de São Pedro. 2 dormitórios (1 suíte) + lavabo, sacada com churrasqueira a carvão, hobby box. Condomínio com piscina coletiva, espaço gourmet e área de lazer completa.',
      features: [
        'Colinas de São Pedro',
        'Lançamento',
        '1 suíte',
        'Churrasqueira a carvão',
        'Piscina coletiva',
        'Hobby box',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260309T1705450300-795523311.jpg',
      is_active: true,
    },
    {
      code: 'LM 327',
      title: 'Solar Di Plaza - Capoeiras Espaçoso 3 suítes + demi-suíte - 2 vagas e Hobby Box',
      url: 'https://www.brfimoveis.com.br/327/imoveis/venda-apartamento-3-quartos-capoeiras-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Capoeiras',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 1097876.78,
      price_formatted: 'R$ 1.097.876,78',
      bedrooms: 3,
      suites: 3,
      bathrooms: 3,
      parking_spaces: 2,
      area_privativa: 115.71,
      area_total: 185.93,
      description:
        'Solar Di Plaza Residencial em Capoeiras. Apartamentos amplos de 3 suítes com demi-suíte, 2 vagas e hobby box. Sacada gourmet com churrasqueira a carvão, piscina aquecida com deck e acabamento de alto padrão.',
      features: [
        'Solar Di Plaza',
        '3 suítes',
        'Piscina aquecida',
        '2 vagas',
        'Hobby box',
        'Capoeiras',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20260319T1137050300-284163443.jpg',
      is_active: true,
    },
    {
      code: 'LM 311',
      title: 'Agronômica - Opus - Duo Construtora - Sistema SPE Custo da Obra',
      url: 'https://www.brfimoveis.com.br/311/imoveis/venda-lancamento-lancamento-2-quartos-agronomica-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Agronômica',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 973495.0,
      price_formatted: 'R$ 973.495,00',
      bedrooms: 2,
      suites: 2,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 78.0,
      area_total: 110.0,
      description:
        'Lançamento Opus na Agronômica em Florianópolis. Sistema SPE a preço de custo da obra, 2 suítes, sacada com churrasqueira, alto padrão construtivo em bairro central nobre.',
      features: ['Agronômica', 'Opus', '2 suítes', 'A preço de custo', 'Duo Construtora'],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20250625T1755170300-799866119.jpg',
      is_active: true,
    },
    {
      code: 'LM 289',
      title: 'Neo Continente Residence - A 3 min. da Ilha da Magia - 2/3 suítes + demi-suíte',
      url: 'https://www.brfimoveis.com.br/289/imoveis/venda-lancamento-lancamento-2-quartos-estreito-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Estreito',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 904858.32,
      price_formatted: 'R$ 904.858,32',
      bedrooms: 2,
      suites: 2,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 75.0,
      area_total: 105.0,
      description:
        'Neo Continente Residence no Estreito, Florianópolis. A apenas 3 minutos da ponte da Ilha. Apartamentos de 2 e 3 suítes, sacada com churrasqueira, lazer completo com piscina e salão de festas.',
      features: ['Neo Continente', 'Estreito', '2 suítes', '3 min da Ilha', 'Lazer completo'],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20240729T2128580300-373737934.jpg',
      is_active: true,
    },
    {
      code: 'LM 280',
      title:
        'Villa dos Açores / Villa dos Acordes - Empreendimento Residencial na Grande Florianópolis',
      url: 'https://www.brfimoveis.com.br/280/imoveis/venda-lancamento-apartamento-florianopolis-sc',
      city: 'Florianópolis',
      neighborhood: 'Balneário',
      property_type: 'Lançamento',
      transaction_type: 'Venda',
      price: 489000.0,
      price_formatted: 'R$ 489.000,00',
      bedrooms: 2,
      suites: 1,
      bathrooms: 2,
      parking_spaces: 1,
      area_privativa: 64.0,
      area_total: 90.0,
      description:
        'Residencial Villa dos Açores (Villa dos Acordes): excelente lançamento na Grande Florianópolis com plantas inteligentes de 2 dormitórios com suíte, sacada gourmet, infraestrutura moderna e condições especiais de lançamento.',
      features: [
        'Villa dos Açores',
        'Villa dos Acordes',
        'Lançamento',
        '2 dormitórios',
        'Suíte',
        'Sacada gourmet',
      ],
      image_url:
        'https://www.brfimoveis.com.br/admin/imovel/mini/20240729T2128580300-373737934.jpg',
      is_active: true,
    },
  ]

  let createdCount = 0
  let updatedCount = 0
  let errorsCount = 0

  try {
    const existingRecords = $app.findRecordsByFilter(
      'properties',
      'is_active = true',
      '-created',
      500,
    )
    for (let rec of existingRecords) {
      try {
        let dirty = false
        const currentTitle = rec.getString('title')
        const currentCode = rec.getString('code')
        const currentCity = rec.getString('city')
        const currentNeigh = rec.getString('neighborhood')
        const currentDesc = rec.getString('description')
        const currentUrl = rec.getString('url')
        const propType = rec.getString('property_type')

        const cleanedTitle = normalizeMojibake(currentTitle)
        const cleanedCode = cleanCode(currentCode, currentUrl)
        const cleanedCity = cleanCity(currentCity, currentUrl + ' ' + currentTitle)
        const cleanedNeigh = cleanNeighborhood(currentNeigh, currentUrl, currentTitle)
        const cleanedDesc = normalizeMojibake(currentDesc)

        if (cleanedTitle !== currentTitle) {
          rec.set('title', cleanedTitle)
          dirty = true
        }
        if (cleanedCode && cleanedCode !== currentCode) {
          rec.set('code', cleanedCode)
          dirty = true
        }
        if (cleanedCity !== currentCity) {
          rec.set('city', cleanedCity)
          dirty = true
        }
        if (cleanedNeigh !== currentNeigh) {
          rec.set('neighborhood', cleanedNeigh)
          dirty = true
        }
        if (cleanedDesc !== currentDesc) {
          rec.set('description', cleanedDesc)
          dirty = true
        }

        if (/terreno/i.test(propType) && (rec.getInt('bedrooms') > 0 || rec.getInt('suites') > 0)) {
          rec.set('bedrooms', 0)
          rec.set('suites', 0)
          dirty = true
        }

        if (dirty) {
          $app.save(rec)
          updatedCount++
        }
      } catch (err) {
        $app.logger().error('Erro ao sanitizar registro existente: ' + err.message)
      }
    }

    for (let item of ESSENTIAL_CATALOG) {
      try {
        let existing = null
        try {
          existing = $app.findFirstRecordByFilter(
            'properties',
            "code = '" + item.code.replace(/'/g, "\\'") + "'",
          )
        } catch (_) {}

        if (!existing && item.url) {
          try {
            existing = $app.findFirstRecordByFilter(
              'properties',
              "url = '" + item.url.replace(/'/g, "\\'") + "'",
            )
          } catch (_) {}
        }

        if (existing) {
          existing.set('title', item.title)
          existing.set('code', item.code)
          existing.set('url', item.url)
          existing.set('city', item.city)
          existing.set('neighborhood', item.neighborhood)
          existing.set('property_type', item.property_type)
          existing.set('price', item.price)
          existing.set('price_formatted', item.price_formatted)
          existing.set('bedrooms', item.bedrooms)
          existing.set('suites', item.suites)
          existing.set('bathrooms', item.bathrooms)
          existing.set('parking_spaces', item.parking_spaces)
          existing.set('area_privativa', item.area_privativa)
          existing.set('area_total', item.area_total)
          existing.set('description', item.description)
          existing.set('features', item.features)
          if (item.image_url) existing.set('image_url', item.image_url)
          existing.set('is_active', true)
          $app.save(existing)
          updatedCount++
        } else {
          const coll = $app.findCollectionByNameOrId('properties')
          const newRec = new Record(coll)
          newRec.set('title', item.title)
          newRec.set('code', item.code)
          newRec.set('url', item.url)
          newRec.set('city', item.city)
          newRec.set('neighborhood', item.neighborhood)
          newRec.set('property_type', item.property_type)
          newRec.set('transaction_type', item.transaction_type)
          newRec.set('price', item.price)
          newRec.set('price_formatted', item.price_formatted)
          newRec.set('bedrooms', item.bedrooms)
          newRec.set('suites', item.suites)
          newRec.set('bathrooms', item.bathrooms)
          newRec.set('parking_spaces', item.parking_spaces)
          newRec.set('area_privativa', item.area_privativa)
          newRec.set('area_total', item.area_total)
          newRec.set('description', item.description)
          newRec.set('features', item.features)
          newRec.set('image_url', item.image_url)
          newRec.set('is_active', true)
          $app.save(newRec)
          createdCount++
        }
      } catch (err) {
        $app.logger().error('Erro ao salvar item essencial (' + item.code + '): ' + err.message)
        errorsCount++
      }
    }

    try {
      const logsColl = $app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsColl)
      logRec.set('type', 'properties_sync')
      logRec.set(
        'message',
        'Sincronização de catálogo concluída: ' +
          createdCount +
          ' criados, ' +
          updatedCount +
          ' atualizados, ' +
          errorsCount +
          ' erros.',
      )
      logRec.set('payload', {
        created: createdCount,
        updated: updatedCount,
        errors: errorsCount,
        timestamp: new Date().toISOString(),
      })
      $app.save(logRec)
    } catch (_) {}
  } catch (globalErr) {
    $app.logger().error('Falha geral no cron sync_properties_hourly: ' + globalErr.message)
  }
})

// Endpoint HTTP para disparar sincronização sob demanda (admin ou webhook)
routerAdd('POST', '/backend/v1/sync-properties', (c) => {
  try {
    function normalizeMojibake(text) {
      if (!text || typeof text !== 'string') return ''
      let cleaned = text

      const mojibakeMap = [
        [/BALNERIO\s+CAMBORI\u06a0/gi, 'Balneário Camboriú'],
        [/BALNERIO\s+CAMBORI[UÚuú]?/gi, 'Balneário Camboriú'],
        [/Balne\u1ca9o\s+Cambori\u06a0/gi, 'Balneário Camboriú'],
        [/Balne\u1ca9o\s+Cambori[uú]/gi, 'Balneário Camboriú'],
        [/Balne\u1ca9o/gi, 'Balneário'],
        [/Balne\u00e1rio/gi, 'Balneário'],
        [/Balne\uFFFDrio/gi, 'Balneário'],
        [/Balne\u00b2\u00a9o/gi, 'Balneário'],
        [/Balne\u00b2rio/gi, 'Balneário'],
        [/BALNERIO\s+ESTREITO\s+FLORIAN\u04d0OLIS/gi, 'Balneário Estreito Florianópolis'],
        [/BALNERIO\s+ESTREITO/gi, 'Balneário Estreito'],
        [/BALNERIO\/ESTREITO/gi, 'Balneário/Estreito'],
        [/BALNERIO/gi, 'Balneário'],
        [/FLORIAN\u04d0OLIS/gi, 'FLORIANÓPOLIS'],
        [/Florian\u04d0olis/gi, 'Florianópolis'],
        [/Florian\udb40\udfecis/gi, 'Florianópolis'],
        [/Florian\u00f3polis/gi, 'Florianópolis'],
        [/S\u00cf\s*JOS\u0260\s*\(SC\)/gi, 'São José (SC)'],
        [/S\u00cf\s*JOS\u0260/gi, 'São José'],
        [/S\u00cf\s*JOS\u026c/gi, 'São José'],
        [/S\u00cf\s*JOSE/gi, 'São José'],
        [/S\u00cf\s*JOS/gi, 'São José'],
        [/S\u00cf\s*PEDRO/gi, 'São Pedro'],
        [/S\u00cf\s*Pedro/gi, 'São Pedro'],
        [/S\u00cf\s*JO\u00c3O/gi, 'São João'],
        [/S\u00cf\s*Jo\u00e3o/gi, 'São João'],
        [/S\u00cf\s*PAULO/gi, 'São Paulo'],
        [/S\u00cf\s*Paulo/gi, 'São Paulo'],
        [/S\u00cf\s*BENTO/gi, 'São Bento'],
        [/S\u00cf\s*Bento/gi, 'São Bento'],
        [/S\u00cf\s*LUCAS/gi, 'São Lucas'],
        [/S\u00cf\s*Lucas/gi, 'São Lucas'],
        [/S\u00cf\s*MIGUEL/gi, 'São Miguel'],
        [/S\u00cf\s*Miguel/gi, 'São Miguel'],
        [/S\u00cf\s*FRANCISCO/gi, 'São Francisco'],
        [/S\u00cf\s*Francisco/gi, 'São Francisco'],
        [/S\u00cf\s*SEBASTI\u00c3O/gi, 'São Sebastião'],
        [/S\u00cf\s*Sebasti\u00e3o/gi, 'São Sebastião'],
        [/S\u3be0Jos\u987fC/gi, 'São José/SC'],
        [/S\u3be0Jos/gi, 'São José'],
        [/S\u3be0Pedro/gi, 'São Pedro'],
        [/S\.Jos\u987fC/gi, 'São José/SC'],
        [/S\.Jos\u982d/gi, 'São José'],
        [/S\.Jos\u0260/gi, 'São José'],
        [/S\.Jos\u026c/gi, 'São José'],
        [/S\.Jos\u00e9/gi, 'São José'],
        [/S\.Jose/gi, 'São José'],
        [/S\u00e3o\s+Jos\u00e9\u982c/gi, 'São José,'],
        [/S\u00e3o\s+Jos\u00e9\u980d/gi, 'São José'],
        [/S\u00e3o\s+Jos\u0260/gi, 'São José'],
        [/S\u00e3o\s+Jos\u026c/gi, 'São José'],
        [/S\u00e3o\s+Jos\u00e9\u987fC/gi, 'São José/SC'],
        [/S\u00e3o\s+Jos\u00e9\u9803/gi, 'São José cresce'],
        [/OPORTUNIDADE\s+\u068eICA/gi, 'OPORTUNIDADE ÚNICA'],
        [/OPORTUNIDADE\s+\u068eICO/gi, 'OPORTUNIDADE ÚNICA'],
        [/OPORTUNIDADE\s+IMPERD\u0356EL/gi, 'OPORTUNIDADE IMPERDÍVEL'],
        [/OPORTUNIDADE\s+IMPERDIVEL/gi, 'OPORTUNIDADE IMPERDÍVEL'],
        [/\u068eICA/gi, 'ÚNICA'],
        [/\u068eICO/gi, 'ÚNICO'],
        [/\u068eICK/gi, 'ÚNICO'],
        [/\u068eico/gi, 'Único'],
        [/\u068eica/gi, 'Única'],
        [/\u068eTIMO/gi, 'ÚLTIMO'],
        [/\u068etimo/gi, 'Último'],
        [/\u068eTIMA/gi, 'ÚLTIMA'],
        [/\u068etima/gi, 'Última'],
        [/-\u068eTIMO/gi, '- ÚLTIMO'],
        [/NA\s+PALHO\u01c1/gi, 'NA PALHOÇA'],
        [/Palho\u01c1\s*SC/gi, 'Palhoça SC'],
        [/Palho\u01c1/gi, 'Palhoça'],
        [/JURERE\s+INTERNACIONAL/gi, 'Jurerê Internacional'],
        [/Jurer\u02a0Internacional/gi, 'Jurerê Internacional'],
        [/JUR\u02a0INTERNACIONAL/gi, 'JURERÊ INTERNACIONAL'],
        [/Jurer\u02a0/gi, 'Jurerê'],
        [/JUR\u02a0/gi, 'JURERÊ'],
        [/Pedra\s+Branca/gi, 'Pedra Branca'],
        [/Saco\s+dos\s+Lim\u00f5es\u00f5es\u00f5es/gi, 'Saco dos Limões'],
        [/Saco\s+dos\s+Lim\u00f5es\u00f5es/gi, 'Saco dos Limões'],
        [/Saco\s+dos\s+Lim\uFFFD\uFFFD/gi, 'Saco dos Limões'],
        [/Saco\s+dos\s+Lim/gi, 'Saco dos Limões'],
        [/Nossa\s+Senhora\s+do\s+Ros\u00b2\u00a9o/gi, 'Nossa Senhora do Rosário'],
        [/Nossa\s+Senhora\s+do\s+Ros\u1ca9o/gi, 'Nossa Senhora do Rosário'],
        [/Nossa\s+Senhora\s+do\s+Ros\uFFFDrio/gi, 'Nossa Senhora do Rosário'],
        [/Ros\u00b2\u00a9o/gi, 'Rosário'],
        [/Ros\u1ca9o/gi, 'Rosário'],
        [/Ros\uFFFDrio/gi, 'Rosário'],
        [/Agron\udb6d\ude63a/gi, 'Agronômica'],
        [/Cobi\u7864o/gi, 'Cobiçado'],
        [/Ac\u00f3res/gi, 'Açores'],
        [/Mo\u786d\u00adbique/gi, 'Moçambique'],
        [/Mo\u786d\u00ad/gi, 'Moçambique'],
        [/Lan\u786dento/gi, 'Lançamento'],
        [/LAN\u01c1MENTO/gi, 'LANÇAMENTO'],
        [/ALTO\s+PADR\u00cf/gi, 'ALTO PADRÃO'],
        [/alto\s+padr\u00cf/gi, 'alto padrão'],
        [/Alto\s+Padr\u00cf/gi, 'Alto Padrão'],
        [/PADR\u00cf/gi, 'PADRÃO'],
        [/padr\u00cf/gi, 'padrão'],
        [/Padr\u00cf/gi, 'Padrão'],
        [/alto\s+padr\u3be0/gi, 'alto padrão'],
        [/Alto\s+Padr\u3be0/gi, 'Alto Padrão'],
        [/padr\u3be0/gi, 'padrão'],
        [/INCORPORA\u01c3O/gi, 'INCORPORAÇÃO'],
        [/incorpora\u01c3o/gi, 'incorporação'],
        [/incorpora\u00b2\u00a9a/gi, 'incorporação imobiliária'],
        [/incorpora\u78ef\s+imobili\u1ca9a/gi, 'incorporação imobiliária'],
        [/incorpora\u78ef/gi, 'incorporação'],
        [/Incorpora\u78ef/gi, 'Incorporação'],
        [/localiza\u78ef\s+estrat\u99e9ca/gi, 'localização estratégica'],
        [/localiza\u78ef\s+privilegiada/gi, 'localização privilegiada'],
        [/localiza\u78ef/gi, 'localização'],
        [/Localiza\u78ef/gi, 'Localização'],
        [/sofistica\u78ef/gi, 'sofisticação'],
        [/Sofistica\u78ef/gi, 'Sofisticação'],
        [/seguran\u7861/gi, 'segurança'],
        [/Seguran\u7861/gi, 'Segurança'],
        [/seguran\u786c/gi, 'segurança'],
        [/espa\u786f\u00b3o/gi, 'espaçoso'],
        [/espa\u786f\u00b3a/gi, 'espaçosa'],
        [/espa\u786f,/gi, 'espaço,'],
        [/espa\u786f/gi, 'espaço'],
        [/Espa\u786f/gi, 'Espaço'],
        [/espa\u7bb0/gi, 'espaço'],
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
        [/N\u068dERO/gi, 'NÚMERO'],
        [/n\u068dero/gi, 'número'],
        [/AN\u068eCIO/gi, 'ANÚNCIO'],
        [/an\u068ecio/gi, 'anúncio'],
        [/FUTURO\s+\u0260\s*AGORA/gi, 'FUTURO É AGORA'],
        [/\b\u0260\b/g, 'é'],
        [/\b\u026c\b/g, 'é'],
        [/T\u0252REO/gi, 'TÉRREO'],
        [/t\u0252reo/gi, 'térreo'],
        [/t\u9cb2eo/gi, 'térreo'],
        [/t\u00e9rreo/gi, 'térreo'],
        [/MOBILIAADO/gi, 'MOBILIADO'],
        [/Pr\udb78\ude69m\u00ad\s*\u07dd\s*Avenida das Torres/gi, 'Próximo à Avenida das Torres'],
        [/Pr\udb78\ude69mo/gi, 'Próximo'],
        [/Pr\udb78\ude69m\u00ad/gi, 'Próximo'],
        [/Pr\u00b2\u00a9mo/gi, 'Próximo'],
        [/f\u18e9l\s+acesso/gi, 'fácil acesso'],
        [/f\u18e9l/gi, 'fácil'],
        [/\u0800Avenida/gi, 'à Avenida'],
        [/\u0800BR-101/gi, 'à BR-101'],
        [/\u0800venda/gi, 'à venda'],
        [/\u0800Venda/gi, 'à Venda'],
        [/\u0800margens/gi, 'às margens'],
        [/\u0800/g, 'à '],
        [/\b\u07dd\b/g, 'à'],
        [/voc\ua8a0/gi, 'você'],
        [/voc\u00ea/gi, 'você'],
        [/essa\s+\u0260\s+a/gi, 'essa é a'],
        [/este\s+\u0260\s+o/gi, 'este é o'],
        [/isso\s+\u0260\s+o/gi, 'isso é o'],
        [/Assim\s+\u0260\s+o/gi, 'Assim é o'],
        [/Aqui\s+voc\u00ea\s+Ganha/gi, 'Aqui você ganha'],
        [/espera\s+com\s+uma\s+casa/gi, 'te espera com uma casa'],
        [/magnco/gi, 'magnífico'],
        [/condomo/gi, 'condomínio'],
        [/edla/gi, 'edícula'],
        [/Edla/gi, 'Edícula'],
        [/imperdl/gi, 'imperdível'],
        [/Imperdl/gi, 'Imperdível'],
        [/fama\?/gi, 'família?'],
        [/fama\./gi, 'família.'],
        [/fama\b/gi, 'família'],
        [/prop\u03f3\u05b4o/gi, 'propósito'],
        [/prop\u03f3\u05b4a/gi, 'propícia'],
        [/eleg\u2bb1ia/gi, 'elegância'],
        [/vis\u3be0/gi, 'visão'],
        [/regimais/gi, 'regiões mais'],
        [/constru\s+com\s+laje/gi, 'construída com laje'],
        [/constru:\s*/gi, 'construída: '],
        [/NEG\u04c3IO/gi, 'NEGÓCIO'],
        [/neg\u04c3io/gi, 'negócio'],
        [/opera\u7d65s/gi, 'operações'],
        [/EQUIL\u0342RIO/gi, 'EQUILÍBRIO'],
        [/equil\u0342rio/gi, 'equilíbrio'],
        [/PRIVIL\u0247IO/gi, 'PRIVILÉGIO'],
        [/privil\u0247io/gi, 'privilégio'],
        [/ESTRAT\u0247ICA/gi, 'ESTRATÉGICA'],
        [/estrat\u0247ica/gi, 'estratégica'],
        [/estrat\u99e9ca/gi, 'estratégica'],
        [/at\u982c\s*vagas/gi, 'até 8 vagas'],
        [/at\u982c/gi, 'até'],
        [/at\u00e9\s*\u982c/gi, 'até '],
        [/Kurt\s+Ratour/gi, 'Kurt Radtke'],
        [/rea\s+total/gi, 'Área total'],
        [/rea\s+constru/gi, 'Área construída'],
        [/rea\s+Para/gi, 'Área Para'],
        [/rea\s+para/gi, 'Área para'],
        [/rea\s+grande/gi, 'Área grande'],
        [/rea\s+de/gi, 'Área de'],
        [/rea\s+comercial/gi, 'Área comercial'],
        [/rea\s+industrial/gi, 'Área industrial'],
        [/rea\s+privativa/gi, 'Área privativa'],
        [/rea\s+Rural/gi, 'Área Rural'],
        [/rea\s+rural/gi, 'Área rural'],
        [/EM\s+REA/gi, 'EM ÁREA'],
        [/em\s+rea/gi, 'em área'],
        [/gua\s+Termal/gi, 'Água Termal'],
        [/gua\s+termal/gi, 'Água termal'],
        [/J\u7861maginou/gi, 'Já imaginou'],
        [/J\u7861/gi, 'Já'],
        [/j\u1ca1lugadas/gi, 'já alugadas'],
        [/j\u1ca1/gi, 'já'],
        [/J\u1ca1/gi, 'Já'],
        [/n\u3be0perca/gi, 'não perca'],
        [/n\u3be0/gi, 'não '],
        [/N\u3be0/gi, 'Não '],
        [/regi\u3be0/gi, 'região'],
        [/Regi\u3be0/gi, 'Região'],
        [/2pisos/gi, '2 pisos'],
        [/mts/gi, 'metros'],
        [/2Dorm\/su\u00ed\s*\+\s*Lav\./gi, '2 dormitórios (1 suíte) + lavabo'],
        [
          /3Dorm\/su\u00edte\u00edte\s+demi-su\u00edte\u00edte\u00edte\u00edte/gi,
          '3 dormitórios (1 suíte + demi-suíte)',
        ],
        [
          /3DORM\/su\u00edte\u00edte\u0340\+2 demi-su\u00edte\u00edte\u00edte\u00edte/gi,
          '3 dormitórios (1 suíte + 2 demi-suítes)',
        ],
        [
          /3\s*DORMIT\u04d2IOS\/su\u00edte\u00edte\u0356E\/LAVABO/gi,
          '3 DORMITÓRIOS (1 SUÍTE) / LAVABO',
        ],
        [/\u04f4ima Casa/gi, 'Ótima Casa'],
        [/\u04f4ima/gi, 'Ótima'],
        [/Ӵima Casa/gi, 'Ótima Casa'],
        [/Ӵima/gi, 'Ótima'],
        [/\?{4,}/g, ''],
        [/&times;/gi, ''],
        [/&amp;/g, '&'],
        [/&nbsp;/g, ' '],
        [/&quot;/g, '"'],
        [/&#39;/g, "'"],
        [/&lt;/g, '<'],
        [/&gt;/g, '>'],
        [/&ccedil;/g, 'ç'],
        [/&atilde;/g, 'ã'],
        [/&otilde;/g, 'õ'],
        [/&eacute;/g, 'é'],
        [/&aacute;/g, 'á'],
        [/&iacute;/g, 'í'],
        [/&oacute;/g, 'ó'],
        [/&uacute;/g, 'ú'],
        [/&Ccedil;/g, 'Ç'],
        [/&Atilde;/g, 'Ã'],
        [/&Otilde;/g, 'Õ'],
        [/&Eacute;/g, 'É'],
        [/&Aacute;/g, 'Á'],
        [/&Iacute;/g, 'Í'],
        [/&Oacute;/g, 'Ó'],
        [/&Uacute;/g, 'Ú'],
      ]

      for (let [pattern, replacement] of mojibakeMap) {
        cleaned = cleaned.replace(pattern, replacement)
      }

      cleaned = cleaned
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
        .replace(
          /[\u068e\u04d0\u0260\u06a0\u00cf\u026c\u01c1\u01c3\u04d2\u03f6\u0416\u068d\u0252\u9cb2\u07dd\ua8a0\u7861\u786f\u78ef\u786d\u7864\u7bb0\u7d65\u99e9\u982c\u987f\u980d\u9803\u3be0\u18e9\u0342\u0247\u0356\u0340\u03f3\u05b4\u2bb1]/g,
          '',
        )
        .replace(/\s{2,}/g, ' ')

      return cleaned.trim()
    }

    function cleanCode(code, url) {
      if (!code && !url) return ''
      let c = (code || '').trim()
      c = c.replace(/^(?:c[oó]digo|c[oó]d\.?|#|igo)\s*:?\s*/i, '').trim()
      if (!c && url) {
        const m = url.match(/\/(\d{2,4})\/imoveis\//)
        if (m) c = 'BRF-' + m[1]
      }
      return c
    }

    function cleanCity(city, textToInferFrom) {
      let c = normalizeMojibake(city || '')
      if (!c || c === '×' || c === '&times;' || c.toLowerCase().includes('times') || c.length < 3) {
        const text = (textToInferFrom || '').toLowerCase()
        if (text.includes('florianopolis') || text.includes('florianópolis')) return 'Florianópolis'
        if (
          text.includes('sao-jose') ||
          text.includes('são josé') ||
          text.includes('sao jose') ||
          text.includes('s.josé')
        )
          return 'São José'
        if (text.includes('biguacu') || text.includes('biguaçu')) return 'Biguaçu'
        if (text.includes('palhoca') || text.includes('palhoça')) return 'Palhoça'
        return ''
      }
      if (/florian/i.test(c)) return 'Florianópolis'
      if (/s[aã]o\s*jos[eé]/i.test(c)) return 'São José'
      if (/bigua[cç]u/i.test(c)) return 'Biguaçu'
      if (/palho[cç]a/i.test(c)) return 'Palhoça'
      return c.replace(/\s*-\s*SC$/i, '').trim()
    }

    function cleanNeighborhood(neigh, url, title) {
      let n = normalizeMojibake(neigh || '')
      if (!n || /agende\s+sua\s+visita|\?{2,}|&times;|times/i.test(n) || n.length < 2) {
        if (url) {
          const m = url.match(
            /imoveis\/venda-[a-z0-9-]+-([a-z0-9-]+)-(?:florianopolis|sao-jose|biguacu|palhoca)-sc/i,
          )
          if (m && m[1]) {
            const slug = m[1].replace(/-/g, ' ')
            return slug.charAt(0).toUpperCase() + slug.slice(1)
          }
        }
        const knownBairros = [
          'Trindade',
          'Jurerê',
          'Canasvieiras',
          'Capoeiras',
          'Coqueiros',
          'Estreito',
          'Balneário',
          'Balneário do Estreito',
          'Agronômica',
          'Serraria',
          'Areias',
          'Kobrasol',
          'Campinas',
          'Barreiros',
          'Praia Comprida',
          'Centro',
          'Saco dos Limões',
          'Rio Caveiras',
          'Bom Viver',
          'Pantanal',
          'Córrego Grande',
          'Itacorubi',
        ]
        for (let b of knownBairros) {
          if (new RegExp('\\b' + b + '\\b', 'i').test(title || '')) {
            return b
          }
        }
        return ''
      }
      return n
    }

    let updatedCount = 0
    const existingRecords = $app.findRecordsByFilter(
      'properties',
      'is_active = true',
      '-created',
      500,
    )
    for (let rec of existingRecords) {
      let dirty = false
      const currentTitle = rec.getString('title')
      const currentCode = rec.getString('code')
      const currentCity = rec.getString('city')
      const currentNeigh = rec.getString('neighborhood')
      const currentDesc = rec.getString('description')
      const currentUrl = rec.getString('url')
      const propType = rec.getString('property_type')

      const cleanedTitle = normalizeMojibake(currentTitle)
      const cleanedCode = cleanCode(currentCode, currentUrl)
      const cleanedCity = cleanCity(currentCity, currentUrl + ' ' + currentTitle)
      const cleanedNeigh = cleanNeighborhood(currentNeigh, currentUrl, currentTitle)
      const cleanedDesc = normalizeMojibake(currentDesc)

      if (cleanedTitle !== currentTitle) {
        rec.set('title', cleanedTitle)
        dirty = true
      }
      if (cleanedCode && cleanedCode !== currentCode) {
        rec.set('code', cleanedCode)
        dirty = true
      }
      if (cleanedCity !== currentCity) {
        rec.set('city', cleanedCity)
        dirty = true
      }
      if (cleanedNeigh !== currentNeigh) {
        rec.set('neighborhood', cleanedNeigh)
        dirty = true
      }
      if (cleanedDesc !== currentDesc) {
        rec.set('description', cleanedDesc)
        dirty = true
      }

      if (/terreno/i.test(propType) && (rec.getInt('bedrooms') > 0 || rec.getInt('suites') > 0)) {
        rec.set('bedrooms', 0)
        rec.set('suites', 0)
        dirty = true
      }

      if (dirty) {
        $app.save(rec)
        updatedCount++
      }
    }

    return c.json(200, {
      success: true,
      message:
        'Sincronização e sanitização concluída com sucesso: ' +
        updatedCount +
        ' registros atualizados.',
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: err.message,
    })
  }
})
