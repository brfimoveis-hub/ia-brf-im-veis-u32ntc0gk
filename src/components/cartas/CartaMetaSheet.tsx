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

export function CartaMetaSheet({ carta, valores, ativa = false }: Props) {
  const paragrafos = carta.corpo.split('\n\n')

  return (
    <section
      className={cn('cartas-sheet bg-white text-black shadow-md mx-auto', ativa && 'is-only')}
      data-id={carta.id}
      style={{
        width: 'min(210mm, 100%)',
        minHeight: '297mm',
        padding: '25mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12pt',
        lineHeight: 1.45,
      }}
    >
      <header
        style={{
          textAlign: 'center',
          borderBottom: '0.5pt solid #999',
          paddingBottom: '4mm',
          marginBottom: '8mm',
        }}
      >
        <img
          src={logo}
          alt="BRF Imóveis"
          style={{ width: '3.5cm', display: 'block', margin: '0 auto 3mm' }}
        />
        {carta.cabecalho.map((linha, i) => (
          <div
            key={i}
            style={{ fontSize: '10pt', lineHeight: 1.35, fontWeight: i === 0 ? 'bold' : 'normal' }}
          >
            {renderComCampos(linha, valores)}
          </div>
        ))}
      </header>

      {paragrafos.map((par, i) => (
        <p key={i} style={{ margin: '0 0 0.7em', textAlign: 'justify' }}>
          {par.split('\n').map((linha, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {renderComCampos(linha, valores)}
            </Fragment>
          ))}
        </p>
      ))}
    </section>
  )
}
