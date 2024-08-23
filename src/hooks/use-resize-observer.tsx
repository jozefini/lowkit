import { useEffect, useMemo, useRef, useState } from 'react'

type ObserverRect = Omit<DOMRectReadOnly, 'toJSON'>
type UseResizeObserverOptions = {
  onChange?: (rect: ObserverRect) => void
  eventOnly?: boolean
  observerOptions?: ResizeObserverOptions
}

const defaultState: ObserverRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
}

export function useResizeObserver<T extends HTMLElement = any>(
  options?: UseResizeObserverOptions
) {
  const { onChange, eventOnly, observerOptions } = options || {}
  const frameID = useRef(0)
  const ref = useRef<T>(null)

  const [rect, setRect] = useState<ObserverRect>(defaultState)

  const observer = useMemo(() => {
    const hasOnChange = typeof onChange === 'function'
    return typeof window !== 'undefined'
      ? new ResizeObserver((entries: ResizeObserverEntry[]) => {
          const entry = entries[0]

          if (entry) {
            cancelAnimationFrame(frameID.current)

            frameID.current = requestAnimationFrame(() => {
              if (ref.current) {
                const newRect = entry.contentRect
                if (hasOnChange) {
                  onChange?.(newRect)
                }
                if (!eventOnly) {
                  setRect(newRect)
                }
              }
            })
          }
        })
      : null
  }, [onChange, eventOnly])

  useEffect(() => {
    const element = ref.current

    if (element) {
      const hasOnChange = typeof onChange === 'function'
      observer?.observe(element, observerOptions)
      if (hasOnChange) {
        const initialRect = element.getBoundingClientRect()
        onChange(initialRect)
      }
    }

    return () => {
      observer?.disconnect()

      if (frameID.current) {
        cancelAnimationFrame(frameID.current)
      }
    }
  }, [observer, observerOptions, onChange])

  return [ref, rect] as const
}

export function useElementSize<T extends HTMLElement = any>(
  options?: UseResizeObserverOptions
) {
  const [ref, { width, height }] = useResizeObserver<T>(options)
  return { ref, width, height }
}
