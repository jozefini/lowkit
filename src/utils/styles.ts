export type StylesConstant = {
  variants?: Record<string, string>
  sizes?: Record<string, string>
  shape?: Record<string, string>
  defaults?: {
    variant?: keyof StylesConstant['variants'] | string
    size?: keyof StylesConstant['sizes'] | string
    shape?: keyof StylesConstant['shape'] | string
  }
} & {
  [key: string]: string | Record<string, string> | undefined
}

export type StylesVariant<T extends StylesConstant> = {
  variant?: keyof T['variants']
  size?: keyof T['sizes']
  shape?: keyof T['shapes']
}

export const getStyleVariant = <T extends StylesConstant>(
  css: T,
  userChoice: StylesVariant<T>
) => {
  const variantKey = (userChoice.variant ??
    Object.keys(css.variants ?? {})[0]) as keyof (T['variants'] | undefined)
  const sizeKey = (userChoice.size ??
    Object.keys(css.sizes ?? {})[0]) as keyof (T['sizes'] | undefined)
  const shapeKey = (userChoice.shape ??
    Object.keys(css.shapes ?? {})[0]) as keyof (T['shapes'] | undefined)

  return cn(
    css.variants?.[variantKey],
    css.sizes?.[sizeKey],
    css.shapes?.[shapeKey]
  )
}

export const cn = (...inputs: (string | undefined | false | null)[]) => {
  return inputs.filter(Boolean).join(' ')
}

export const findTruthy = <T>(...inputs: T[]): T | undefined => {
  return inputs.find(Boolean)
}
