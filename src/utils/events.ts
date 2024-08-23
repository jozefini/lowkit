type EventEl = MediaQueryList | Element

export type TElementEvent = (
  el: EventEl,
  event: string,
  handler: EventListener
) => void

export const on: TElementEvent = (el, event, handler) => {
  return el?.addEventListener(event, handler)
}

export const off: TElementEvent = (el, event, handler) => {
  return el?.removeEventListener(event, handler)
}

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let lastRun = 0
  let timeoutId: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>): void {
    const now = Date.now()
    if (now - lastRun >= limit) {
      lastRun = now
      func.apply(this, args)
    } else if (!timeoutId) {
      timeoutId = setTimeout(
        () => {
          lastRun = Date.now()
          timeoutId = null
          func.apply(this, args)
        },
        limit - (now - lastRun)
      )
    }
  } as T
}
