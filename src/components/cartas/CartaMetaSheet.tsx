import { Fragment } from 'react'
import logo from '@/assets/logofinalmarcadagua-copia-393ad.png'
import {
  PLACEHOLDER_CAMPO,
  type CampoCarta,
  type CamposValores,
  type CartaMeta,
} from '@/data/cartas-meta-content'
import { cn } from '@/lib/utils'

type Props = {
  carta: CartaMeta
  valores: CamposValores
  ativa?: boolean
}

// Troca {campo} pelo valor preenchido; campo vazio vira [texto] destacado em cinza.
function renderComCampos(texto: string, valores: CamposValores) {
  return texto.split(/(\{\w+\})/).map((parte, i) => {
    const m = parte.match(/^\{(\w+)\}$/)
    if (!m) return <span key={i}>{parte}</span>
    const key = m[1] as CampoCarta
    const valor = (valores[key] ?? '').trim()
    if (valor) return <span key={i}>{valor}</span>
    return (
      <span key={i} className="cartas-placeholder">
        [{PLACEHOLDER_CAMPO[key] ?? key}]
      </span>
    )
  })
}

// Identifica o bloco de local/data ("Florianópolis, {dia} de novembro de 2026")
// para alinhá-lo à direita, como no timbre da carta original do Mauro.
function isLinhaLocalData(linha: string) {
  return /,\s*\{dia\}\s+de\s+novembro/i.test(linha) || /\bde\s+novembro\s+de\s+\d{4}/i.test(linha)
}

export function CartaMetaSheet({ carta, valores, ativa = false }: Props) {
  const paragrafos = carta.corpo.split('\n\n')

  // O primeiro bloco do corpo é a linha "Cidade, dia de novembro de 2026".
  const primeiroBloco = paragrafos[0] ?? ''
  const primeiraLinhaUnica =
    primeiroBloco.split('\n').length === 1 && isLinhaLocalData(primeiroBloco)
  const corpoSemData = primeiraLinhaUnica ? paragrafos.slice(1) : paragrafos

  return (
    <section
      className={cn('cartas-sheet bg-white text-black shadow-md mx-auto', ativa && 'is-ativo')}
      data-id={carta.id}
      style={{
        width: 'min(210mm, 100%)',
        minHeight: '297mm',
        padding: '18mm 22mm 20mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '12pt',
        lineHeight: 1.5,
      }}
    >
      {/* TIMBRE: logo centralizada + bloco de identificação da empresa */}
      <header className="cartas-timbre">
        <img
          src={logo}
          alt="BRF Imóveis"
          className="cartas-logo"
          style={{ width: '4.6cm', display: 'block', margin: '0 auto 4mm' }}
        />
        <p className="cartas-empresa">BRF IMÓVEIS LTDA</p>
        {carta.cabecalho.map((linha, i) => (
          <p key={i} className="cartas-linha">
            {renderComCampos(linha, valores)}
          </p>
        ))}
        <div className="cartas-filete" aria-hidden="true">
          <span />
          <span />
        </div>
      </header>

      <div className="cartas-corpo">
        {primeiraLinhaUnica && (
          <p className="cartas-local-data">{renderComCampos(primeiroBloco, valores)}</p>
        )}

        {corpoSemData.map((par, i) => (
          <p key={i} className="cartas-paragrafo">
            {par.split('\n').map((linha, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderComCampos(linha, valores)}
              </Fragment>
            ))}
          </p>
        ))}
      </div>

      <footer className="cartas-pe">
        <div className="cartas-filete-pe" aria-hidden="true" />
        <p>BRF Imóveis · www.brfimoveis.com.br</p>
      </footer>
    </section>
  )
}
