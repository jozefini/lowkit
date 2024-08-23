type ExtractKeys<S extends string> =
  S extends `${string}{{${infer K}}}${infer Rest}`
    ? K | ExtractKeys<Rest>
    : never

type ReplacerKeys<S extends string> =
  ExtractKeys<S> extends infer K
    ? K extends string
      ? Record<K, string | number> & Record<string, string | number>
      : never
    : never

export const strReplacer = <S extends string>(
  value: S,
  mappedReplacer: ReplacerKeys<S>
): string => {
  const prefix = '{{'
  const suffix = '}}'
  const shortcodes = Object.keys(mappedReplacer)

  if (shortcodes.length && value.includes(prefix) && value.includes(suffix)) {
    const pattern = new RegExp(
      `${prefix}(${shortcodes.join('|')})${suffix}`,
      'g'
    )
    return value.replace(pattern, (_, key: keyof typeof mappedReplacer) =>
      String(mappedReplacer[key] ?? '')
    )
  }
  return value
}

export const toNumber = (value: unknown, fallbackValue = 0): number => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isNaN(parsedValue) ? fallbackValue : parsedValue
  }
  return fallbackValue
}

export const toAbsNumber = (
  value: unknown,
  fallbackValue: number | undefined = 0
): number => {
  return Math.abs(toNumber(value, fallbackValue))
}

export const objectToMap = <T extends Record<string, unknown>>(
  obj: T
): Map<keyof T, T[keyof T]> => {
  return new Map(Object.entries(obj) as [keyof T, T[keyof T]][])
}
