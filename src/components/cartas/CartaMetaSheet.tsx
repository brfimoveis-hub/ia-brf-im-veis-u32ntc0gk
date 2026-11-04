import React from 'react'
import {
  CartaMeta,
  CamposValores,
  PLACEHOLDER_CAMPO,
  CampoCarta,
  DADOS_EMPRESA_TIMBRE,
  formatarDataPt,
  formatarDataEn,
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

    const chave = match[1] as string
    let valorFinal: string | undefined

    if (chave === 'dataPt') {
      valorFinal = formatarDataPt(valores.dataCarta)
    } else if (chave === 'dataEn') {
      valorFinal = formatarDataEn(valores.dataCarta)
    } else if (chave in valores) {
      const v = valores[chave as CampoCarta]?.trim()
      if (v) valorFinal = v
    }

    if (valorFinal) {
      partes.push(
        <span key={`${chave}-${match.index}`} className="carta-campo-preenchido">
          {valorFinal}
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

  // Detecta se um parágrafo é um título de seção (ex: "1. QUEM SOU", "3. CRONOLOGIA COMPLETA DO CASO")
  // para aplicar classe com break-after: avoid
  const isTituloSecao = (texto: string) => {
    const trimmed = texto.trim()
    return (
      /^\d+(\.\d+)?\.\s+[A-ZÀ-Ú0-9\s()—–,-]+$/.test(trimmed) ||
      /^Assunto:|^Subject:|^À META PLATFORMS|^TO META PLATFORMS|^À Meta Platforms|^Dear Meta/i.test(
        trimmed,
      )
    )
  }

  const renderTimbreContent = () => (
    <div className="carta-meta-header-inner">
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
    </div>
  )

  const renderRodapeContent = () => (
    <div className="carta-meta-footer-inner">
      <div className="carta-meta-footer-dados">
        <div className="carta-meta-footer-line">{DADOS_EMPRESA_TIMBRE.rodapeLinha1}</div>
        <div className="carta-meta-footer-line">{DADOS_EMPRESA_TIMBRE.rodapeLinha2}</div>
      </div>
      <div className="carta-meta-footer-paginacao">
        Página {paginaNumero} de {totalPaginas}
      </div>
      <div className="carta-meta-footer-paginacao-print">
        Página <span className="paginacao-print-current"></span> de{' '}
        <span className="paginacao-print-total"></span>
      </div>
    </div>
  )

  return (
    <article className="carta-meta-page" data-carta-id={carta.id}>
      {/*
        Estrutura de impressão A4 com repetição nativa de cabeçalho e rodapé em todas as páginas:
        <table> com <thead> (table-header-group) e <tfoot> (table-footer-group).
        O navegador Chromium/Chrome/Edge e Firefox repetem thead e tfoot no topo e base de cada página física cortada,
        garantindo que o tbody quebre respeitando perfeitamente o espaço entre eles.
      */}
      <table className="carta-meta-table">
        <thead className="carta-meta-thead">
          <tr>
            <th className="carta-meta-th">
              <header className="carta-meta-header">{renderTimbreContent()}</header>
            </th>
          </tr>
        </thead>
        <tbody className="carta-meta-tbody">
          <tr>
            <td className="carta-meta-td">
              <main className="carta-meta-body">
                {paragrafos.map((paragrafo, index) => {
                  const heading = isTituloSecao(paragrafo)
                  return (
                    <p
                      key={index}
                      className={
                        heading
                          ? 'carta-meta-paragraph carta-meta-paragraph-heading'
                          : 'carta-meta-paragraph'
                      }
                    >
                      {renderizarTextoComCampos(paragrafo, valores)}
                    </p>
                  )
                })}
              </main>
            </td>
          </tr>
        </tbody>
        <tfoot className="carta-meta-tfoot">
          <tr>
            <td className="carta-meta-td-foot">
              <footer className="carta-meta-footer">{renderRodapeContent()}</footer>
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  )
}

export default CartaMetaSheet
