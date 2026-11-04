import React from 'react'
import {
  CartaMeta,
  CamposValores,
  PLACEHOLDER_CAMPO,
  CampoCarta,
  DADOS_EMPRESA_TIMBRE,
} from '@/data/cartas-meta-content'
import logoBrf from '@/assets/logofinalmarcadagua-copia-393ad.png'

interface CartaMetaSheetProps {
  carta: CartaMeta
  valores: CamposValores
  ativa?: boolean
  paginaNumero?: number
  totalPaginas?: number
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

export function CartaMetaSheet({
  carta,
  valores,
  paginaNumero = 1,
  totalPaginas = 1,
}: CartaMetaSheetProps) {
  // Parágrafos do corpo
  const paragrafos = carta.corpo.split('\n\n')

  return (
    <article className="carta-meta-page">
      {/* Timbre institucional: APENAS LOGO À ESQUERDA + BLOCO REDUZIDO (NOME DA EMPRESA E CNPJ) */}
      <header className="carta-meta-header">
        <div className="carta-meta-timbre-row">
          <div className="carta-meta-logo-wrap">
            <img src={logoBrf} alt="BRF Imóveis" className="carta-meta-logo" loading="eager" />
          </div>

          <div className="carta-meta-company-info">
            <div className="carta-meta-company-title">BRF IMÓVEIS LTDA</div>
            <div className="carta-meta-company-cnpj">CNPJ: 22.886.297/0001-77</div>
          </div>
        </div>
        <div className="carta-meta-divider" />
      </header>

      {/* Corpo formal da carta (Formato ABNT: fonte serifada, espaçamento confortável) */}
      <main className="carta-meta-body">
        {paragrafos.map((paragrafo, index) => (
          <p key={index} className="carta-meta-paragraph">
            {renderizarTextoComCampos(paragrafo, valores)}
          </p>
        ))}
      </main>

      {/* Rodapé ABNT: dados da empresa à esquerda + Página X de Y à direita */}
      <footer className="carta-meta-footer">
        <div className="carta-meta-footer-dados">
          <div className="carta-meta-footer-line">{DADOS_EMPRESA_TIMBRE.rodapeLinha1}</div>
          <div className="carta-meta-footer-line">{DADOS_EMPRESA_TIMBRE.rodapeLinha2}</div>
        </div>
        <div className="carta-meta-footer-paginacao">
          Página {paginaNumero} de {totalPaginas}
        </div>
      </footer>
    </article>
  )
}

export default CartaMetaSheet
