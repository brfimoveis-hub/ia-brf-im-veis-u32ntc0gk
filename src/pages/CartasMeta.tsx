import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CARTAS_META } from '@/data/cartas-meta-content'
import { useCartasMetaCampos } from '@/hooks/use-cartas-meta-campos'
import { CartasMetaForm } from '@/components/cartas/CartasMetaForm'
import { APP_VERSION } from '@/lib/version'
import { CartaMetaSheet } from '@/components/cartas/CartaMetaSheet'
import '@/components/cartas/cartas-meta.css'

type ModoImpressao = 'all' | 'one' | null

export default function CartasMeta() {
  const { valores, setCampo } = useCartasMetaCampos()
  // Quais folhas vão para o papel: todas, só uma (pelo id) ou nenhuma (tela normal)
  const [modo, setModo] = useState<ModoImpressao>(null)
  const [cartaAtiva, setCartaAtiva] = useState<string | null>(null)

  // Ao terminar (ou cancelar) a impressão, limpa o estado para voltar à tela normal
  useEffect(() => {
    const limpar = () => {
      setModo(null)
      setCartaAtiva(null)
      document.title = 'BRF IA CRM'
    }
    const antesDeImprimir = () => {
      document.title = ''
    }
    window.addEventListener('afterprint', limpar)
    window.addEventListener('beforeprint', antesDeImprimir)
    return () => {
      window.removeEventListener('afterprint', limpar)
      window.removeEventListener('beforeprint', antesDeImprimir)
    }
  }, [])

  const imprimir = (novoModo: 'all' | 'one', id?: string) => {
    setCartaAtiva(id ?? null)
    setModo(novoModo)
    // Atualiza temporariamente o title da página para evitar que o navegador imprima "BRF IA CRM" no cabeçalho padrão
    const previousTitle = document.title
    document.title = ''
    // Espera o React aplicar a classe de impressão antes de abrir o diálogo
    setTimeout(() => {
      window.print()
      // Restaura o title após o diálogo de impressão fechar
      setTimeout(() => {
        document.title = previousTitle || 'BRF IA CRM'
      }, 500)
    }, 100)
  }

  return (
    <div className={modo ? `space-y-6 printing-${modo}` : 'space-y-6'}>
      <div className="cartas-no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Cartas Meta</h1>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
              {APP_VERSION} ·{' '}
              {typeof window !== 'undefined' &&
              window.location.hostname.includes('brfiacrminteligente.goskip.app')
                ? 'prod'
                : 'prev'}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Preencha os dados abaixo e imprima as cartas em folhas A4 timbradas.
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => imprimir('all')}
        >
          <Printer className="h-5 w-5" />
          Imprimir as 4 cartas
        </Button>
      </div>

      <div className="cartas-no-print">
        <CartasMetaForm valores={valores} onChange={setCampo} />
      </div>

      <div className="cartas-print-root space-y-10">
        {CARTAS_META.map((carta, index) => {
          const ativa = modo === 'one' && cartaAtiva === carta.id
          // Quando imprimindo 1 carta, é página 1 de 1. Quando imprimindo todas (4), é página index+1 de 4.
          const paginaNumero = modo === 'all' ? index + 1 : 1
          const totalPaginas = modo === 'all' ? CARTAS_META.length : 1

          return (
            <div
              key={carta.id}
              className={ativa ? 'cartas-bloco is-ativo space-y-3' : 'cartas-bloco space-y-3'}
            >
              <div className="cartas-no-print flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-800">{carta.titulo}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => imprimir('one', carta.id)}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir esta carta
                </Button>
              </div>
              <CartaMetaSheet
                carta={carta}
                valores={valores}
                ativa={ativa}
                paginaNumero={paginaNumero}
                totalPaginas={totalPaginas}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
