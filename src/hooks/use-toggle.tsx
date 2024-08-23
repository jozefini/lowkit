import { useReducer } from 'react'

type ToggleAction<T> = T | ((prev: T) => T)

export function useToggle<T>(initialOptions: readonly T[]) {
  const [options, toggle] = useReducer(
    (state: readonly T[], action: ToggleAction<T>): readonly T[] => {
      const newValue =
        typeof action === 'function'
          ? (action as (prev: T) => T)(state[0])
          : action
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
