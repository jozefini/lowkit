import { ReactNode } from 'react'

export function ForEach<P>({
  items,
  render,
}: {
  items: P[]
  render: (_p: P, _i: number) => ReactNode
}) {
  const elements = []
  const length = items.length

  for (let i = 0; i < length; i++) {
    elements.push(render(items[i] as P, i))
  }

  return elements
}
