import { useCallback, useRef, useState } from 'react'

export function useIntersection<T extends HTMLElement>(
  options?: ConstructorParameters<typeof IntersectionObserver>[1]
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)

  const ref = useCallback(
    (element: T | null) => {
      if (observer.current) {
        observer.current.disconnect()
        observer.current = null
      }

      if (element === null) {
        setEntry(null)
        return
      }

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]) setEntry(entries[0])
      }, options)

      observer.current.observe(element)
    },
    [options]
  )

  return { ref, entry }
}
