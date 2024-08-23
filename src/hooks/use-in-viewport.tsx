import { useEffect, useMemo, useRef, useState } from 'react'

export function useInViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inViewport, setInViewport] = useState(false)

  const observer = useMemo(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return null
    }
    return new IntersectionObserver((entries) =>
      setInViewport(entries[0]?.isIntersecting ?? false)
    )
  }, [])

  useEffect(() => {
    if (ref.current && observer) {
      observer.observe(ref.current)
      return () => observer.disconnect()
    }
    return () => null
  }, [observer])

  return { ref, inViewport }
}
