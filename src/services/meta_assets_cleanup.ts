import pb from '@/lib/pocketbase/client'

export type AssetType =
  | 'page'
  | 'instagram'
  | 'ad_account'
  | 'waba'
  | 'business'
  | 'pixel_dataset'
  | 'other'

export type AssetStatus = 'pending' | 'cleaned' | 'kept'

export interface MetaAsset {
  id: string
  name: string
  type: AssetType
  category?: string
  username?: string
  is_protected: boolean
  protection_reason?: string
  is_known_duplicate?: boolean
  duplicate_notes?: string
  status: AssetStatus
  notes?: string
  cleaned_at?: string | null
  saved_record_id?: string | null
  direct_url: string
  meta_business_url: string
  details?: Record<string, any>
}

export interface CleanupSummary {
  total: number
  cleaned: number
  kept: number
  pending: number
  protected: number
  cleanable_total: number
  cleanable_pending: number
  progress_percentage: number
}

export interface MetaAssetsScanResponse {
  success: boolean
  assets: MetaAsset[]
  summary: CleanupSummary
  official_rules: {
    official_page_id: string
    official_waba_id: string
    official_phone: string
    official_business_id: string
  }
  token_diagnostics: {
    missing_scopes: string[]
    granted_permissions: string[]
    warnings: string[]
    has_business_management: boolean
  }
}

export interface UpdateAssetStatusPayload {
  asset_id: string
  asset_name?: string
  asset_type?: AssetType
  status: AssetStatus
  notes?: string
}

export interface UpdateAssetStatusResponse {
  success: boolean
  record_id: string
  asset_id: string
  status: AssetStatus
  message: string
}

/**
 * Busca a varredura completa dos ativos Meta e mescla com o checklist salvo no PocketBase
 */
export async function scanMetaAssets(): Promise<MetaAssetsScanResponse> {
  return pb.send('/backend/v1/meta/assets/scan', {
    method: 'GET',
  })
}

/**
 * Atualiza o status de um ativo no checklist (pending, cleaned, kept)
 */
export async function updateAssetCleanupStatus(
  payload: UpdateAssetStatusPayload,
): Promise<UpdateAssetStatusResponse> {
  return pb.send('/backend/v1/meta/assets/status', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
