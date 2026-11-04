import { useCallback, useEffect, useState } from 'react'
import {
  CAMPOS_CARTA,
  formatarDataHojeIso,
  type CampoCarta,
  type CamposValores,
} from '@/data/cartas-meta-content'

// Campos únicos das cartas, guardados neste navegador (localStorage).
const STORAGE_KEY = 'cartas_meta_campos_v1'

function valoresVazios(): CamposValores {
  const vazio = {} as CamposValores
  for (const campo of CAMPOS_CARTA) vazio[campo.key] = ''
  // Padrão de data é HOJE (formato ISO YYYY-MM-DD para input date)
  vazio.dataCarta = formatarDataHojeIso()
  return vazio
}

function carregarValores(): CamposValores {
  const base = valoresVazios()
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
