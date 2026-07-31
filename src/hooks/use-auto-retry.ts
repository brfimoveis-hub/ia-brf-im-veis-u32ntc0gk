import { useEffect, useRef, useState } from 'react'

export function useAutoRetry(
  error: unknown,
  retryFn: () => void,
  delay: number = 800,
): { isRetrying: boolean } {
  const [isRetrying, setIsRetrying] = useState(false)
  const retriedRef = useRef(false)
  const retryRef = useRef(retryFn)
  retryRef.current = retryFn

  useEffect(() => {
    const hasError = !!error

    if (!hasError) {
      setIsRetrying((prev) => (prev ? false : prev))
      return
    }

    if (retriedRef.current) {
      setIsRetrying((prev) => (prev ? false : prev))
      return
    }

    retriedRef.current = true
    setIsRetrying(true)
    const timer = setTimeout(() => {
      retryRef.current()
    }, delay)
    return () => clearTimeout(timer)
  }, [error, delay])

  return { isRetrying }
}
