import { useEffect, useRef, useState } from 'react'

const MAX_AUTO_RETRIES = 2

export function useAutoRetry(
  error: unknown,
  retryFn: () => void,
  delay: number = 800,
  isLoading?: boolean,
): { isRetrying: boolean } {
  const [isRetrying, setIsRetrying] = useState(false)
  const retryCountRef = useRef(0)
  const retryingRef = useRef(false)
  const retryRef = useRef(retryFn)
  retryRef.current = retryFn
  const hasError = !!error

  useEffect(() => {
    if (!hasError) {
      if (retryingRef.current && isLoading !== true) {
        retryingRef.current = false
        retryCountRef.current = 0
        setIsRetrying(false)
      }
      return
    }

    if (isLoading === true) {
      return
    }

    if (retryCountRef.current >= MAX_AUTO_RETRIES) {
      retryingRef.current = false
      setIsRetrying(false)
      return
    }

    retryCountRef.current++
    retryingRef.current = true
    setIsRetrying(true)

    const timer = setTimeout(() => {
      retryRef.current()
    }, delay)

    return () => clearTimeout(timer)
  }, [hasError, isLoading, delay])

  return { isRetrying }
}
