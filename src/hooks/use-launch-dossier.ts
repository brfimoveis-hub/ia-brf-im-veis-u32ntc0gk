import { useQuery } from '@tanstack/react-query'
import { getLaunchBySlug, type Launch } from '@/services/launches'

/**
 * Busca o dossiê do lançamento direto do banco (coleção `launches`).
 * Regra do Mauro: dados de lançamento NUNCA vêm hardcoded — vêm do dossiê.
 */
export function useLaunchDossier(slug: string) {
  return useQuery<Launch | null>({
    queryKey: ['launch_dossier', slug],
    queryFn: () => getLaunchBySlug(slug),
    staleTime: 5 * 60 * 1000,
  })
}

export default useLaunchDossier
