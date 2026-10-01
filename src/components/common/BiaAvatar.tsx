import React from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import defaultBiaImg from '@/assets/generatedimage1788622004059-32a1b.png'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

export { defaultBiaImg }

interface BiaAvatarProps {
  className?: string
  imageClassName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showStatusIndicator?: boolean
  alt?: string
}

const SIZE_MAP = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-24 h-24', // 96px
}

export function getBiaAvatarUrl(userRecord?: any): string {
  if (userRecord && userRecord.ai_avatar) {
    try {
      return pb.files.getUrl(userRecord, userRecord.ai_avatar)
    } catch {
      return defaultBiaImg
    }
  }
  return defaultBiaImg
}

export const BiaAvatar: React.FC<BiaAvatarProps> = ({
  className,
  imageClassName,
  size = 'md',
  showStatusIndicator = false,
  alt = 'Bia - Inteligência Artificial da BRF Imóveis',
}) => {
  const { user } = useAuth()
  const avatarUrl = getBiaAvatarUrl(user)

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
      <img
        src={avatarUrl}
        alt={alt}
        onError={(e) => {
          // Fallback se a imagem do PB falhar
          const target = e.currentTarget
          if (target.src !== defaultBiaImg) {
            target.src = defaultBiaImg
          }
        }}
        className={cn(
          'rounded-full object-cover shadow-sm border border-amber-500/30',
          SIZE_MAP[size],
          imageClassName,
        )}
      />
      {showStatusIndicator && (
        <span
          className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
          title="Bia ativa"
        />
      )}
    </div>
  )
}

export default BiaAvatar
