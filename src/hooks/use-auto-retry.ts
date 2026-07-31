import { useEffect, useRef, useState } from 'react'

const MAX_AUTO_RETRIES = 2

export function useAutoRetry(
  error: unknown,
  retryFn: () => void,
  delay: number = 800,
  isLoading?: boolean,
): { isRetrying: boolean } {
  const [isRetrying, setIsRetrying] = useState(false)
  const mountedRef = useRef(false)
  const prevErrorRef = useRef(false)
  const retriedRef = useRef(false)
  const retryCountRef = useRef(0)
  const retryRef = useRef(retryFn)
  retryRef.current = retryFn

  const hasError = !!error

  if (hasError && !prevErrorRef.current && mountedRef.current && isLoading !== true) {
    if (retryCountRef.current < MAX_AUTO_RETRIES) {
      setIsRetrying(true)
    }
  }
  prevErrorRef.current = hasError

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!mountedRef.current) return

    if (!hasError) {
      retryCountRef.current = 0
      retriedRef.current = false
      setIsRetrying(false)
      return
    }

    if (isLoading === true) {
      setIsRetrying(false)
      return
    }

    if (retriedRef.current || retryCountRef.current >= MAX_AUTO_RETRIES) {
      setIsRetrying(false)
      return
    }

    retriedRef.current = true
    retryCountRef.current++
    setIsRetrying(true)

    const timer = setTimeout(() => {
      if (!mountedRef.current) {
        setIsRetrying(false)
        return
      }
      setIsRetrying(false)
      retryRef.current()
    }, delay)

    return () => clearTimeout(timer)
  }, [hasError, delay, isLoading])

  return { isRetrying }
}
