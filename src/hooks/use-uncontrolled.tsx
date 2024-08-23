import { useState } from 'react'

type UseUncontrolledInputOptions<T, P extends unknown[]> = {
  // Value for controlled state
  value?: T
  // Initial value for uncontrolled state
  defaultValue?: T
  // Final value for uncontrolled state when value and defaultValue are not provided
  finalValue?: T
  // Controlled state onChange handler
  onChange?: (value: T, ...payload: P) => void
}

export function useUncontrolled<T, P extends unknown[]>(
  options: UseUncontrolledInputOptions<T, P>
): [T, (value: T, ...payload: P) => void, boolean] {
  const { value, defaultValue, finalValue, onChange = () => {} } = options || {}
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(
    defaultValue !== undefined ? defaultValue : (finalValue as T)
  )

  const handleUncontrolledChange = (val: T, ...payload: P) => {
    setUncontrolledValue(val)
    onChange?.(val, ...payload)
  }

  if (value !== undefined) {
    return [value, onChange, true]
  }

  return [uncontrolledValue, handleUncontrolledChange, false]
}
