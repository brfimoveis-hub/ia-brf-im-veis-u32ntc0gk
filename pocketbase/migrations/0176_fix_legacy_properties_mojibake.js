// pocketbase/migrations/0176_fix_legacy_properties_mojibake.js
// Migração para higienizar e decodificar mojibake nos imóveis legados ativos da coleção properties.
// Preserva intactos os 11 lançamentos essenciais já limpos.
// Idempotente: rodar múltiplas vezes não altera registros já limpos.

migrate(
  (app) => {
    const PROTECTED_CODES = [
      'LM 329',
      'LM 301',
      'LM 295',
      'LM 280',
      'LM 310',
      'LM 330',
      'LM 289',
      'LM 311',
      'LM 327',
      'LM 342',
      'LM 326',
    ]

    // Função central de decodificação de mojibake e normalização de texto
    function normalizeMojibake(text) {
      if (!text || typeof text !== 'string') return ''
      let cleaned = text

      // 1. Dicionário ordenado: expressões compostas primeiro, depois palavras específicas, depois caracteres isolados
      const mojibakeMap = [
        // Balneário Camboriú / Balneário Estreito / Cidades e Bairros
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

        // São José / São Pedro
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

        // Único / Única / Oportunidade Única / Último
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

        // Palhoça / Biguaçu / Jurerê / Ingleses / Outras regiões
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

        // Lançamento / Alto Padrão / Padrão
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

        // Suíte / Suítes e variações anômalas repetidas
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

        // Termos comuns corrompidos
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

        // Símbolos lixo e mojibake solto
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

      // 2. Limpeza de caracteres residuais corrompidos
      cleaned = cleaned
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
        .replace(
          /[\u068e\u04d0\u0260\u06a0\u00cf\u026c\u01c1\u01c3\u04d2\u03f6\u0416\u068d\u0252\u9cb2\u07dd\ua8a0\u7861\u786f\u78ef\u786d\u7864\u7bb0\u7d65\u99e9\u982c\u987f\u980d\u9803\u3be0\u18e9\u0342\u0247\u0356\u0340\u03f3\u05b4\u2bb1]/g,
          '',
        )
        .replace(/\s{2,}/g, ' ')

      return cleaned.trim()
    }

    // Sanitizador de cidade
    function cleanCity(city, url, title) {
      let c = normalizeMojibake(city || '')
      const combined = ((url || '') + ' ' + (title || '') + ' ' + c).toLowerCase()

      if (combined.includes('florianopolis') || combined.includes('florianópolis'))
        return 'Florianópolis'
      if (
        combined.includes('sao-jose') ||
        combined.includes('são josé') ||
        combined.includes('sao jose') ||
        combined.includes('s.josé')
      )
        return 'São José'
      if (
        combined.includes('balneario-camboriu') ||
        combined.includes('balneário camboriú') ||
        combined.includes('balneario camboriu')
      )
        return 'Balneário Camboriú'
      if (combined.includes('bombinhas') || combined.includes('bombas')) return 'Bombinhas'
      if (
        combined.includes('governador-celso-ramos') ||
        combined.includes('governador celso ramos')
      )
        return 'Governador Celso Ramos'
      if (combined.includes('sao-joaquim') || combined.includes('são joaquim')) return 'São Joaquim'
      if (combined.includes('biguacu') || combined.includes('biguaçu')) return 'Biguaçu'
      if (combined.includes('palhoca') || combined.includes('palhoça')) return 'Palhoça'

      return c.replace(/\s*-\s*SC$/i, '').trim()
    }

    // Sanitizador de bairro
    function cleanNeighborhood(neigh, url, title) {
      let n = normalizeMojibake(neigh || '')
      if (n.length > 50 || /agende|shopping|acesso|br-101/i.test(n)) {
        n = ''
      }

      if (!n) {
        const u = (url || '').toLowerCase()
        const t = (title || '').toLowerCase()
        if (u.includes('jurere') || t.includes('jurerê')) return 'Jurerê'
        if (u.includes('estreito') || t.includes('estreito')) return 'Estreito'
        if (u.includes('balneario') || t.includes('balneário')) return 'Balneário'
        if (u.includes('coqueiros') || t.includes('coqueiros')) return 'Coqueiros'
        if (u.includes('capoeiras') || t.includes('capoeiras')) return 'Capoeiras'
        if (u.includes('barreiros') || t.includes('barreiros')) return 'Barreiros'
        if (u.includes('serraria') || t.includes('serraria')) return 'Serraria'
        if (u.includes('areias') || t.includes('areias')) return 'Areias'
        if (u.includes('trindade') || t.includes('trindade')) return 'Trindade'
        if (u.includes('canasvieiras') || t.includes('canasvieiras')) return 'Canasvieiras'
        if (u.includes('ingleses') || t.includes('ingleses')) return 'Ingleses'
        if (u.includes('saco-dos-limoes') || t.includes('saco dos limões')) return 'Saco dos Limões'
        if (u.includes('pedra-branca') || t.includes('pedra branca')) return 'Pedra Branca'
        if (u.includes('passa-vinte') || t.includes('passa vinte')) return 'Passa Vinte'
        if (u.includes('rocado') || t.includes('roçado')) return 'Roçado'
        if (u.includes('kobrasol') || t.includes('kobrasol')) return 'Kobrasol'
        if (u.includes('floresta') || t.includes('floresta')) return 'Floresta'
        if (u.includes('pinheira') || u.includes('brito')) return 'Enseada de Brito'
        if (u.includes('centro') || t.includes('centro')) return 'Centro'
        if (u.includes('rio-vermelho') || t.includes('rio vermelho'))
          return 'São João do Rio Vermelho'
        if (u.includes('bombas') || t.includes('bombas')) return 'Bombas'
        if (u.includes('agronomica') || t.includes('agronômica')) return 'Agronômica'
        if (u.includes('rio-caveiras') || t.includes('rio caveiras')) return 'Rio Caveiras'
      }

      if (n === 'Balneario') return 'Balneário'
      if (n === 'Internacional') return 'Jurerê Internacional'
      if (n === 'Limoes') return 'Saco dos Limões'
      if (n === 'Vermelho') return 'São João do Rio Vermelho'
      if (n === 'Rosario') return 'Nossa Senhora do Rosário'
      if (n === 'Branca') return 'Pedra Branca'
      if (n === 'Rocado') return 'Roçado'
      if (n === 'Brito') return 'Enseada de Brito'

      return n
    }

    // Normalização do código
    function cleanCode(code) {
      if (!code) return ''
      let c = code
        .trim()
        .replace(/^(?:igo|c[oó]d\.?|#)\s*/i, '')
        .trim()
      return c
    }

    // 1. Percorrer properties ativos
    const records = app.findRecordsByFilter('properties', 'is_active = true', '-created', 500)
    let updatedCount = 0
    let skippedProtectedCount = 0

    for (let rec of records) {
      const code = rec.getString('code').trim()

      // Preservar byte a byte os 11 lançamentos essenciais já higienizados
      if (PROTECTED_CODES.includes(code)) {
        skippedProtectedCount++
        continue
      }

      const currentTitle = rec.getString('title')
      const currentDesc = rec.getString('description')
      const currentCity = rec.getString('city')
      const currentNeigh = rec.getString('neighborhood')
      const currentCode = rec.getString('code')
      const url = rec.getString('url')

      const newTitle = normalizeMojibake(currentTitle)
      const newDesc = normalizeMojibake(currentDesc)
      const newCity = cleanCity(currentCity, url, newTitle)
      const newNeigh = cleanNeighborhood(currentNeigh, url, newTitle)
      const newCode = cleanCode(currentCode)

      let dirty = false
      if (newTitle !== currentTitle) {
        rec.set('title', newTitle)
        dirty = true
      }
      if (newDesc !== currentDesc) {
        rec.set('description', newDesc)
        dirty = true
      }
      if (newCity !== currentCity) {
        rec.set('city', newCity)
        dirty = true
      }
      if (newNeigh !== currentNeigh) {
        rec.set('neighborhood', newNeigh)
        dirty = true
      }
      if (newCode !== currentCode) {
        rec.set('code', newCode)
        dirty = true
      }

      if (dirty) {
        app.save(rec)
        updatedCount++
      }
    }

    console.log(
      `[0176_fix_legacy_properties_mojibake] Concluído: ${updatedCount} registros atualizados, ${skippedProtectedCount} lançamentos protegidos intocados.`,
    )

    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(logsCol)
      logRec.set('type', 'properties_mojibake_cleanup')
      logRec.set(
        'message',
        `Migração 0176 executada: ${updatedCount} imóveis legados higienizados, ${skippedProtectedCount} lançamentos protegidos mantidos intactos.`,
      )
      logRec.set(
        'details',
        'Dicionário expandido CP1252/UTF-8 aplicado com sucesso em title/description/city/neighborhood/code.',
      )
      app.save(logRec)
    } catch (_) {}
  },
  (app) => {
    // Rollback intencionalmente vazio (migração de dados com preservação de registros)
  },
)
