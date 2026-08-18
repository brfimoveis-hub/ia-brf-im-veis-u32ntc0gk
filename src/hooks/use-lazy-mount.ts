import { useEffect, useRef, useState } from 'react'

/**
 * Defers mounting a heavy subtree until its container scrolls into view.
 *
 * Returns a ref to attach to the scroll container and a boolean that tells
 * you whether the subtree should be rendered yet. On mount it sets up an
 * IntersectionObserver; the first time the element intersects the viewport
 * it flips `visible` to true and disconnects. If IntersectionObserver is
 * unavailable (very old browsers / SSR) it falls back to mounting on the
 * next tick so functionality is never lost.
 *
 * The optional `rootMargin` lets you pre-mount slightly before the element
 * is fully visible (default 200px) so there's no visible pop-in.
 */
export function useLazyMount(rootMargin: string = '200px') {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) {
      setVisible(true)
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, visible }
}
