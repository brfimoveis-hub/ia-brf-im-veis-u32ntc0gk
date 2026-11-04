import { useCallback, useEffect, useState } from 'react'
import {
  CAMPOS_CARTA,
  formatarDataHojeIso,
  type CampoCarta,
  type CamposValores,
} from '@/data/cartas-meta-content'

// Campos únicos das cartas, guardados neste navegador (localStorage).
const STORAGE_KEY = 'cartas_meta_campos_v1'

// Defaults garantidos para o Mauro preencher instantaneamente as cartas 3 e 4
export const DEFAULTS_MAURO: Partial<CamposValores> = {
  nomeMauro: 'Mauro Fengler',
  cpfMauro: '296.090.209-25',
  enderecoMauro:
    'Rua José Cândido da Silva, 118 – Apto 602 – CEP 88.075-250 – Estreito, Florianópolis SC',
  telefoneMauro: '(48) 99972.8050',
  emailMauro: 'maurofengler@yahoo.com.br',
}

function valoresIniciaisComDefaults(): CamposValores {
  const base = {} as CamposValores
  for (const campo of CAMPOS_CARTA) {
    base[campo.key] = DEFAULTS_MAURO[campo.key] || ''
  }
  // Padrão de data é HOJE (formato ISO YYYY-MM-DD para input date)
  base.dataCarta = formatarDataHojeIso()
  return base
}

function carregarValores(): CamposValores {
  const base = valoresIniciaisComDefaults()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const salvo = JSON.parse(raw) as Record<string, unknown>
      for (const campo of CAMPOS_CARTA) {
        const valor = salvo[campo.key]
        if (typeof valor === 'string' && valor.trim() !== '') {
          base[campo.key] = valor
        }
      }

      // Migração suave da versão anterior (dia + ano) se não houver dataCarta
      if (!salvo.dataCarta && (salvo.dia || salvo.ano)) {
        const d = String(salvo.dia || new Date().getDate()).padStart(2, '0')
        const a = String(salvo.ano || new Date().getFullYear())
        // Novembro = mês 11 na versão anterior
        base.dataCarta = `${a}-11-${d}`
      }
    }
  } catch {
    // Ignora conteúdo inválido no storage
  }

  if (!base.dataCarta) {
    base.dataCarta = formatarDataHojeIso()
  }

  // Se algum campo essencial do Mauro estiver em branco mesmo após carregar do storage
  // (ex: storage salvo antes da inclusão de nomeMauro ou emailMauro), preenche com o default
  for (const [k, v] of Object.entries(DEFAULTS_MAURO)) {
    const key = k as CampoCarta
    if (!base[key] || base[key].trim() === '') {
      base[key] = v!
    }
  }

  return base
}

export function useCartasMetaCampos() {
  const [valores, setValores] = useState<CamposValores>(carregarValores)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valores))
    } catch {
      // Ignora erros de storage
    }
  }, [valores])

  const setCampo = useCallback((key: CampoCarta, value: string) => {
    setValores((prev) => ({ ...prev, [key]: value }))
  }, [])

  return { valores, setCampo }
}
