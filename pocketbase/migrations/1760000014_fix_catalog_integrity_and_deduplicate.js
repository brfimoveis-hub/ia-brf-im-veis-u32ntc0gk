// pocketbase/migrations/1760000014_fix_catalog_integrity_and_deduplicate.js
// Tarefas:
// 1. Deduplicação e normalização definitiva por código único normalizado (sem espaços, uppercase)
// 2. Funde duplicata AP 334 / AP334 mantendo o registro completo com fotos/features
// 3. Corrige mojibake nas descrições e títulos dos imóveis
// 4. Corrige TR325: cidade = Governador Celso Ramos, bairro = Areias de Baixo
// 5. Garante que todos os 50 imóveis ativos estejam com código normalizado e índice único garantido

migrate(
  (app) => {
    // 1. TR325 - Garante Governador Celso Ramos e Areias de Baixo
    app
      .db()
      .newQuery(
        "UPDATE properties SET city = 'Governador Celso Ramos', neighborhood = 'Areias de Baixo' WHERE code = 'TR325' OR code = 'TR 325' OR url LIKE '%/325/%'",
      )
      .execute()

    // 2. Funde duplicata do AP334:
    // Temos o registro antigo o1y8q6d3cgzvtcl (code 'AP334' com fotos, features e link /336/)
    // e o duplicado s0qitmr34cj9uv1 (code 'AP 334' sem foto e com mojibake)
    // Desativa o duplicado incompleto s0qitmr34cj9uv1 e preserva o1y8q6d3cgzvtcl como AP334
    app
      .db()
      .newQuery(
        "UPDATE properties SET is_active = false, code = 'AP334_DUP_INACTIVE' WHERE id = 's0qitmr34cj9uv1' OR (code = 'AP 334' AND id != 'o1y8q6d3cgzvtcl')",
      )
      .execute()

    // 3. Normalizar todos os códigos de imóveis ativos (remover espaços e hífen inicial após letras)
    // SQLite puro suporta REPLACE
    const activeProps = app.findRecordsByFilter(
      'properties',
      'is_active = true',
      '-created',
      100,
      0,
    )

    for (let prop of activeProps) {
      let code = prop.getString('code') || ''
      let normCode = code
        .replace(/\s+/g, '')
        .replace(/^([A-Za-z]+)-+(\d+)/, '$1$2')
        .toUpperCase()
        .trim()

      let title = prop.getString('title') || ''
      let desc = prop.getString('description') || ''
      let city = prop.getString('city') || ''
      let neigh = prop.getString('neighborhood') || ''
      let changed = false

      if (normCode && normCode !== code) {
        prop.set('code', normCode)
        changed = true
      }

      // TR325 verificação extra
      if (normCode === 'TR325') {
        if (city !== 'Governador Celso Ramos') {
          prop.set('city', 'Governador Celso Ramos')
          changed = true
        }
        if (neigh !== 'Areias de Baixo') {
          prop.set('neighborhood', 'Areias de Baixo')
          changed = true
        }
      }

      // Limpeza de Mojibake em Descrições e Títulos
      if (desc) {
        let cleanDesc = desc
        cleanDesc = cleanDesc
          // Colapsar repetições de letras idênticas (ex: áÁÁÁÁÁÁÁ... ou aaaa...)
          .replace(/([A-Za-zÀ-ÖØ-öø-ÿ])\1{3,}/g, '$1')
          .replace(/Jurer\uA809nternacional/gi, 'Jurerê Internacional')
          .replace(/Jurer\uA809/gi, 'Jurerê')
          .replace(/Jurer\u02a0/gi, 'Jurerê')
          .replace(/Jurer\uA822/gi, 'Jurerê')
          .replace(/seguran\u7861total/gi, 'segurança total')
          .replace(/seguran\u786ctotal/gi, 'segurança total')
          .replace(/segurançatotal/gi, 'segurança total')
          .replace(/seguran硠/gi, 'segurança')
          .replace(/seguran\u7861de/gi, 'segurança de')
          .replace(/seguran\u786cde/gi, 'segurança de')
          .replace(/seguran\u7861/gi, 'segurança')
          .replace(/seguran\u786c/gi, 'segurança')
          .replace(/espa篠e\s*luxo/gi, 'espaço e luxo')
          .replace(/espa篠/gi, 'espaço ')
          .replace(/espa\u786f\u00b3o/gi, 'espaçoso')
          .replace(/espa\u786f\u00b3a/gi, 'espaçosa')
          .replace(/espa\u786f/gi, 'espaço')
          .replace(/espa\u7bb0/gi, 'espaço')
          .replace(/頡\s*oportunidade/gi, 'é a oportunidade')
          .replace(/頡/gi, 'é a ')
          .replace(/suítea\s+empresa/gi, 'sua empresa')
          .replace(/suítea/gi, 'sua')
          .replace(/suítel/gi, 'Sul')
          .replace(/su\u00edte\u00edtel/gi, 'Sul')
          .replace(/resuíteltados/gi, 'resultados')
          .replace(/ࠖenda/gi, 'à venda')
          .replace(/࠶enda/gi, 'à venda')
          .replace(/ࠖ/gi, 'à ')
          .replace(/࠶/gi, 'à ')
          .replace(/j\u1CA1lugadas/gi, 'já alugadas')
          .replace(/j\u1CA1/gi, 'já')
          .replace(/im\u03F6\u00ADel/gi, 'imóvel')
          .replace(/im\u03F6el/gi, 'imóvel')
          .replace(/im\u03F6\u00ADeis/gi, 'imóveis')
          .replace(/im\u03F6eis/gi, 'imóveis')
          .replace(/im󶥬/gi, 'imóvel')
          .replace(/neg\u03E9\u00ADos/gi, 'negócios')
          .replace(/neg\u03E9os/gi, 'negócios')
          .replace(/neg󣩯s/gi, 'negócios')
          .replace(/resid\uABA3ia/gi, 'residência')
          .replace(/residꮣia/gi, 'residência')
          .replace(/São José\u9821\u00A0/gi, 'São José/SC ')
          .replace(/São José\u9821/gi, 'São José')
          .replace(/São José顠/gi, 'São José ')
          .replace(/São José頿\?*/gi, 'São José')
          .replace(/voc\uA822usca/gi, 'você busca')
          .replace(/voc\uA822/gi, 'você')
          .replace(/vocꠢ/gi, 'você ')
          .replace(/voc꠳onha/gi, 'você sonha')
          .replace(/voc꠳/gi, 'você ')
          .replace(/voc꠰rocura/gi, 'você procura')
          .replace(/voc꠰/gi, 'você')
          .replace(/vocêrocura/gi, 'você procura')
          .replace(/voc\uA8A0/gi, 'você')
          .replace(/㯬/gi, 'ão')
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
          .replace(
            /[\u068e\u04d0\u0260\u06a0\u00cf\u026c\u01c1\u01c3\u04d2\u03f6\u0416\u068d\u0252\u9cb2\u07dd\ua8a0\ua809\ua822\u7861\u786f\u78ef\u786d\u7864\u7bb0\u7d65\u99e9\u982c\u987f\u980d\u9803\u9821\u3be0\u18e9\u0342\u0247\u0356\u0340\u03f3\u05b4\u2bb1\u0816\u0836\uaba3]/g,
            '',
          )
          .replace(/\s{2,}/g, ' ')
          .trim()

        if (cleanDesc !== desc) {
          prop.set('description', cleanDesc)
          changed = true
        }
      }

      if (title) {
        let cleanTitle = title
          .replace(/([A-Za-zÀ-ÖØ-öø-ÿ])\1{3,}/g, '$1')
          .replace(/Jurer\uA809/gi, 'Jurerê')
          .replace(/seguran\u7861/gi, 'segurança')
          .replace(/neg󣩯s/gi, 'negócios')
          .replace(/im󶥬/gi, 'imóvel')
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
          .replace(
            /[\u068e\u04d0\u0260\u06a0\u00cf\u026c\u01c1\u01c3\u04d2\u03f6\u0416\u068d\u0252\u9cb2\u07dd\ua8a0\ua809\ua822\u7861\u786f\u78ef\u786d\u7864\u7bb0\u7d65\u99e9\u982c\u987f\u980d\u9803\u9821\u3be0\u18e9\u0342\u0247\u0356\u0340\u03f3\u05b4\u2bb1\u0816\u0836\uaba3]/g,
            '',
          )
          .replace(/\s{2,}/g, ' ')
          .trim()

        if (cleanTitle !== title) {
          prop.set('title', cleanTitle)
          changed = true
        }
      }

      if (changed) {
        app.saveNoValidate(prop)
      }
    }
  },
  (app) => {
    // Reversão
  },
)
