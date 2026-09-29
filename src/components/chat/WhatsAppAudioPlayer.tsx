import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WhatsAppAudioPlayerProps {
  text?: string
  sender?: 'ai' | 'agent' | 'customer' | 'system'
  audioUrl?: string
}

export function WhatsAppAudioPlayer({ text, sender = 'ai', audioUrl }: WhatsAppAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState<number>(() => {
    // Estimativa visual de duração baseada na quantidade de caracteres transcritos se não houver áudio real
    if (text) {
      const words = text.split(/\s+/).length
      // ~2.5 palavras por segundo de fala natural
      return Math.max(3, Math.min(60, Math.round(words / 2.5)))
    }
    return 12
  })
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<any>(null)

  const isSentByMe = sender === 'ai' || sender === 'agent'

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onloadedmetadata = () => {
        if (audio.duration && !Number.isNaN(audio.duration) && audio.duration !== Infinity) {
          setDuration(Math.round(audio.duration))
        }
      }

      audio.ontimeupdate = () => {
        setCurrentTime(Math.round(audio.currentTime))
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100)
        }
      }

      audio.onended = () => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
      }

      return () => {
        audio.pause()
        audioRef.current = null
      }
    }
  }, [audioUrl])

  const togglePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false))
      }
      return
    }

    // Fallback: player simulado se mensagem for transcrição de áudio sem link binário direto
    if (isPlaying) {
      clearInterval(timerRef.current)
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      const step = 0.5
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + step
          if (next >= duration) {
            clearInterval(timerRef.current)
            setIsPlaying(false)
            setProgress(0)
            return 0
          }
          setProgress((next / duration) * 100)
          return next
        })
      }, 500)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex flex-col gap-1.5 w-full min-w-[200px] max-w-[280px]">
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          size="icon"
          onClick={togglePlay}
          className={`h-9 w-9 rounded-full shrink-0 shadow-sm ${
            isSentByMe
              ? 'bg-[#128c7e] hover:bg-[#075e54] text-white'
              : 'bg-[#00a884] hover:bg-[#008f6f] text-white'
          }`}
          title={isPlaying ? 'Pausar áudio' : 'Ouvir mensagem de voz'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </Button>

        {/* Linha de onda de voz estilizada do WhatsApp */}
        <div
          className="flex-1 flex flex-col justify-center gap-1 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="h-4 flex items-center gap-[2.5px] w-full px-0.5">
            {[24, 40, 75, 30, 90, 60, 45, 80, 50, 95, 70, 35, 60, 85, 40, 70, 50, 30].map(
              (h, i) => {
                const barPercent = (i / 18) * 100
                const active = progress >= barPercent
                return (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-[3px] rounded-full transition-all duration-200 ${
                      active
                        ? isSentByMe
                          ? 'bg-[#128c7e] dark:bg-emerald-400'
                          : 'bg-[#00a884] dark:bg-emerald-400'
                        : isSentByMe
                          ? 'bg-emerald-700/30 dark:bg-emerald-300/30'
                          : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                )
              },
            )}
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono px-0.5">
            <span>{isPlaying ? formatTimer(currentTime) : formatTimer(duration)}</span>
            <span className="flex items-center gap-0.5 opacity-70">
              <Volume2 className="w-3 h-3" />
              Voz
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
