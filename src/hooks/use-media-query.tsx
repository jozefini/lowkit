import { useEffect, useRef, useState } from 'react'

export type UseMediaQueryOptions = {
  initialValue?: boolean
  onChange?: (matches: boolean) => void
  eventOnly?: boolean
}

type MediaQueryCallback = (event: { matches: boolean; media: string }) => void

/**
 * Older versions of Safari (shipped withCatalina and before) do not support addEventListener on matchMedia
 * https://stackoverflow.com/questions/56466261/matchmedia-addlistener-marked-as-deprecated-addeventlistener-equivalent
 * */
const attachMediaListener = (
  query: MediaQueryList,
  callback: MediaQueryCallback
) => {
  try {
    query.addEventListener('change', callback)
    return () => query.removeEventListener('change', callback)
  } catch (e) {
    query.addListener(callback)
    return () => query.removeListener(callback)
  }
}

const getInitialValue = (query: string, initialValue?: boolean) => {
  if (typeof initialValue === 'boolean') {
    return initialValue
  }

  return getMediaQuery(query)
}

export function getMediaQuery(query: string): boolean {
  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    return window.matchMedia(query).matches
  }
  return false
}

export function useMediaQuery(
  query: string,
  options: UseMediaQueryOptions = {}
) {
  const { initialValue, onChange, eventOnly } = options || {}
  const [matches, setMatches] = useState(
    initialValue !== undefined ? initialValue : getInitialValue(query)
  )
  const queryRef = useRef<MediaQueryList>()

  useEffect(() => {
    if ('matchMedia' in window) {
      const hasOnChange = typeof onChange === 'function'
      queryRef.current = window.matchMedia(query)
      if (hasOnChange) {
        onChange(queryRef.current.matches)
      }
      if (!eventOnly) {
        setMatches(queryRef.current.matches)
      }

      return attachMediaListener(queryRef.current, event => {
        if (hasOnChange) {
          onChange(event.matches)
        }
        if (!eventOnly) {
          setMatches(event.matches)
        }
      })
    }

    return undefined
  }, [query, onChange, eventOnly])

  return matches
}
