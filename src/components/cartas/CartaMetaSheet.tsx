import React from 'react'
import { CartaMeta, CamposValores, PLACEHOLDER_CAMPO, CampoCarta } from '@/data/cartas-meta-content'

interface CartaMetaSheetProps {
  carta: CartaMeta
  valores: CamposValores
  ativa?: boolean
}

// Substitui {chave} pelos valores digitados ou por um aviso destacado caso vazio
function renderizarTextoComCampos(texto: string, valores: CamposValores): React.ReactNode[] {
  const partes: React.ReactNode[] = []
  const regex = /\{([a-zA-Z0-9]+)\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      partes.push(texto.substring(lastIndex, match.index))
    }

    const chave = match[1] as CampoCarta
    const valor = valores[chave]?.trim()

    if (valor) {
      partes.push(
        <span key={`${chave}-${match.index}`} className="carta-campo-preenchido">
          {valor}
        </span>,
      )
    } else {
      const nomeLegivel = PLACEHOLDER_CAMPO[chave] || chave
      partes.push(
        <span
          key={`${chave}-${match.index}`}
          className="carta-campo-vazio"
          title={`Preencha o campo "${nomeLegivel}" no formulário acima`}
        >
          [{nomeLegivel}]
        </span>,
      )
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < texto.length) {
    partes.push(texto.substring(lastIndex))
  }

  return partes
}

export function CartaMetaSheet({ carta, valores }: CartaMetaSheetProps) {
  // Parágrafos do corpo
  const paragrafos = carta.corpo.split('\n\n')

  // Dados do timbre configurados conforme DOCX da imobiliária
  const endereco =
    valores.enderecoEmpresa?.trim() ||
    'Rua Fúlvio Aducci, 1358 - Estreito, Florianópolis - SC, 88075-000'
  const telefone = valores.telefoneEmpresa?.trim() || '(48) 3034-7000'
  const emailBernadete = 'bernadeterhoden@yahoo.com.br'
  const siteEmpresa = 'www.brfimoveis.com.br'

  const isCartaBernadete = carta.id.startsWith('bernadete')

  return (
    <article className="carta-meta-page">
      {/* Timbre institucional: LOGO no topo (na frente) + cabeçalho elegante */}
      <header className="carta-meta-header">
        <div className="carta-meta-logo-wrap">
          <img
            src="/icon.svg"
            alt="BRF Imóveis"
            className="carta-meta-logo"
            onError={(e) => {
              // Fallback gracioso se svg não renderizar
              const target = e.currentTarget
              target.style.display = 'none'
            }}
          />
        </div>

        <div className="carta-meta-company-info">
          {isCartaBernadete ? (
            <>
              <div className="carta-meta-company-title">BRF IMÓVEIS LTDA</div>
              <div className="carta-meta-company-line">{endereco}</div>
              <div className="carta-meta-company-line">
                Telefone: <strong>{telefone}</strong> · E-mail: <strong>{emailBernadete}</strong>
              </div>
              <div className="carta-meta-company-line">
                Website: <strong>{siteEmpresa}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="carta-meta-company-title">
                {valores.linkMauro ? 'MAURO FENGLER — SÓCIO-ADMINISTRADOR' : 'MAURO FENGLER'}
              </div>
              <div className="carta-meta-company-line">
                {valores.enderecoMauro?.trim() || endereco}
              </div>
              <div className="carta-meta-company-line">
                Telefone: <strong>{valores.telefoneMauro?.trim() || telefone}</strong> · E-mail:{' '}
                <strong>{valores.emailMauro?.trim() || emailBernadete}</strong>
              </div>
              <div className="carta-meta-company-line">
                BRF Imóveis LTDA · <strong>{siteEmpresa}</strong>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Corpo formal da carta */}
      <main className="carta-meta-body">
        {paragrafos.map((paragrafo, index) => (
          <p key={index} className="carta-meta-paragraph">
            {renderizarTextoComCampos(paragrafo, valores)}
          </p>
        ))}
      </main>

      {/* Rodapé institucional */}
      <footer className="carta-meta-footer">
        <span>BRF Imóveis LTDA — Documento Oficial</span>
        <span>{siteEmpresa}</span>
      </footer>
    </article>
  )
}

export default CartaMetaSheet
