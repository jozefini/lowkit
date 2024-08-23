import { useMediaQuery, type UseMediaQueryOptions } from './use-media-query'

export function useColorScheme(
  initialValue?: 'dark' | 'light',
  options?: Omit<UseMediaQueryOptions, 'initialValue'>
) {
  return useMediaQuery('(prefers-color-scheme: dark)', {
    ...options,
    initialValue: initialValue ? initialValue === 'dark' : undefined,
  })
    ? 'dark'
    : 'light'
}
