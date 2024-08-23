import { useReducer } from 'react'

type ToggleAction<T> = T | ((prev: T) => T)

export function useToggle<T>(initialOptions: readonly T[]) {
  const [options, toggle] = useReducer(
    (state: readonly T[], action: ToggleAction<T>): readonly T[] => {
      if (state.length === 0) return state // Handle empty state case

      const currentValue = state[0]
      let newValue: T

      if (typeof action === 'function') {
        newValue = (action as (prev: T) => T)(currentValue as T)
      } else {
        newValue = action
      }

      const index = state.indexOf(newValue)
      return index >= 0
        ? [...state.slice(index), ...state.slice(0, index)]
        : state
    },
    initialOptions
  )

  return [options[0], toggle] as const
}

// Usage with switcher boolean behavior
export function useSwitcher() {
  return useToggle([false, true])
}
