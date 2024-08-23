import { useCallback, useEffect, useRef, useState } from 'react'

export type UseFocusWithinOptions = {
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onChange?: (isFocused: boolean) => void
  eventOnly?: boolean
}

function containsRelatedTarget(event: FocusEvent) {
  if (
    event.currentTarget instanceof HTMLElement &&
    event.relatedTarget instanceof HTMLElement
  ) {
    return event.currentTarget.contains(event.relatedTarget)
  }

  return false
}

export function useFocusWithin<T extends HTMLElement = HTMLElement>(
  options: UseFocusWithinOptions = {}
): {
  ref: React.MutableRefObject<T>
  focused: boolean
} {
  const { onBlur, onFocus, onChange, eventOnly } = options || {}

  const ref = useRef<T>()
  const [focused, _setFocused] = useState(false)
  const focusedRef = useRef(false)
  const setFocused = useCallback(
    (value: boolean) => {
      if (onChange) {
        onChange(value)
      }
      if (!eventOnly) {
        _setFocused(value)
      }
      focusedRef.current = value
    },
    [onChange, eventOnly]
  )

  const handleFocusIn = useCallback(
    (event: FocusEvent) => {
      if (!focusedRef.current) {
        setFocused(true)
        onFocus?.(event)
      }
    },
    [onFocus, setFocused]
  )

  const handleFocusOut = useCallback(
    (event: FocusEvent) => {
      if (focusedRef.current && !containsRelatedTarget(event)) {
        setFocused(false)
        onBlur?.(event)
      }
    },
    [onBlur, setFocused]
  )

  useEffect(() => {
    if (ref.current) {
      const currentRef = ref.current
      currentRef.addEventListener('focusin', handleFocusIn)
      currentRef.addEventListener('focusout', handleFocusOut)

      // Call onChange with initial focus state
      if (onChange) {
        onChange(document.activeElement === currentRef)
      }

      return () => {
        currentRef?.removeEventListener('focusin', handleFocusIn)
        currentRef?.removeEventListener('focusout', handleFocusOut)
      }
    }

    return undefined
  }, [handleFocusIn, handleFocusOut, onChange])

  return { ref: ref as React.MutableRefObject<T>, focused }
}
