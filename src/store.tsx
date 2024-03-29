import { useCallback, useRef, useSyncExternalStore } from 'react'

type KeyType<K, T, V extends boolean, P extends keyof T> = V extends true
  ? P
  : K
type ValueType<T, V extends boolean, P extends keyof T> = V extends true
  ? T[P]
  : T
type PartialType<T, V extends boolean, P extends keyof T> = V extends true
  ? Partial<T[P]>
  : Partial<T>

export class MapStore<M, V extends boolean> {
  private map = new Map<keyof M, M[keyof M]>()
  private itemSubscribers = new Map<keyof M, Set<() => void>>()
  private sizeSubscribers = new Set<() => void>()
  private keysSubscribers = new Set<() => void>()
  private cachedSize = 0

  // Subscribers
  private syncKeys = () => {
    for (const callback of this.keysSubscribers) {
      callback()
    }
  }
  private syncSize = () => {
    for (const callback of this.sizeSubscribers) {
      callback()
    }
  }
  private syncItem = (key: keyof M | (keyof M)[]) => {
    let keys = !Array.isArray(key) ? [key] : key
    for (const key of keys) {
      const subscribers = this.itemSubscribers.get(key as any)
      if (subscribers) {
        for (const callback of subscribers) {
          callback()
        }
      }
    }
  }
  private syncMap = () => {
    this.itemSubscribers.forEach((callbacks) => {
      for (const callback of callbacks) {
        callback()
      }
    })
  }

  // Getters
  public getMap = () => {
    return this.map as Map<keyof M, M[keyof M]>
  }
  public getItem = (key: keyof M) => {
    return this.map.get(key) as ValueType<M, V, keyof M> | undefined
  }
  public getSize = () => {
    return this.map.size as number
  }
  public getKeys = (filter?: (_: M[keyof M]) => boolean) => {
    if (!filter) {
      return Array.from(this.map.keys()) as (keyof M)[]
    }
    let keys: (keyof M)[] = []
    let mapEntries = this.map.entries()
    for (const [key, value] of mapEntries) {
      if (filter(value)) {
        keys.push(key)
      }
    }
    return keys
  }

  // Setters
  public setItem = (key: keyof M, item: M[keyof M], notify = true) => {
    this.map.set(key, item)

    if (notify) {
      this.syncItem(key)
      this.syncSize()
      this.syncKeys()
    }
  }
  public setMap = (map: Map<keyof M, M[keyof M]>, notify = true) => {
    this.map = map
    if (notify) {
      this.itemSubscribers.clear()
      this.sizeSubscribers.clear()
      this.keysSubscribers.clear()
      this.syncMap()
      this.syncSize()
      this.syncKeys()
    }
  }
  public updateItem = <P extends keyof M>(
    key: KeyType<P, M, V, P>,
    item: (V extends true ? M[P] : Partial<M[P]>) | ((_: M[P]) => M[P]),
    notify = true
  ) => {
    let data: M[P] | undefined = this.map.get(key as any) as M[P]
    if (typeof item === 'function') {
      this.map.set(key as any, (item as Function)(data))
    } else if (
      typeof item === 'object' &&
      item !== null &&
      !Array.isArray(item)
    ) {
      this.map.set(key as any, {
        ...data,
        ...item,
      })
    } else {
      this.map.set(key as any, data)
    }

    if (notify) {
      this.syncItem(key as any)
    }
  }
  public updateMap = <P extends keyof M>(
    map: PartialType<M, V, P>,
    notify = true
  ) => {
    let keys = Object.keys(map) as any[]
    for (const key of keys) {
      this.updateItem(key, (map as any)[key], false)
    }
    if (notify) {
      this.syncItem(keys)
    }
  }
  public removeItem = (key: keyof M, notify = true) => {
    this.map.delete(key)
    if (notify) {
      this.syncItem(key)
      this.syncSize()
      this.syncKeys()
    }
  }

  // Hooks
  private getSizeSnapshot = () => {
    const size = this.map.size
    if (this.cachedSize !== size) {
      this.cachedSize = size
    }
    return size
  }
  private subscribeToSize = (callback: () => void) => {
    this.sizeSubscribers.add(callback)
    return () => {
      this.sizeSubscribers.delete(callback)
    }
  }

  public useItem = <P extends keyof M>(key: KeyType<keyof M, M, V, P>) => {
    const prevItem = useRef<M[keyof M] | undefined>(undefined)
    const subscribe = useCallback(
      (callback: () => void) => {
        let subscribers = this.itemSubscribers.get(key as any)
        if (subscribers) {
          subscribers.add(callback)
        } else {
          subscribers = new Set([callback])
          this.itemSubscribers.set(key as any, subscribers)
        }
        return () => {
          subscribers!.delete(callback)
          if (subscribers!.size === 0) {
            this.itemSubscribers.delete(key as any)
          }
        }
      },
      [key]
    )
    const snapshot = useCallback(() => {
      const currentItem = this.map.get(key as any)
      if (!Object.is(currentItem, prevItem.current)) {
        prevItem.current = currentItem
      }
      return currentItem
    }, [key])

    return useSyncExternalStore(subscribe, snapshot, snapshot)
  }
  public useSize = () => {
    const prevSize = useRef<number>(0)
    const subscribe = useCallback((callback: () => void) => {
      this.sizeSubscribers.add(callback)
      return () => {
        this.sizeSubscribers.delete(callback)
      }
    }, [])
    const snapshot = useCallback(() => {
      const currentSize = this.map.size
      if (currentSize !== prevSize.current) {
        prevSize.current = currentSize
      }
      return currentSize
    }, [])

    return useSyncExternalStore(subscribe, snapshot, snapshot)
  }
  public useKeys = (filter?: (_: M[keyof M]) => boolean) => {
    const prevKeys = useRef<(keyof M)[]>([])
    const subscribe = useCallback((callback: () => void) => {
      this.keysSubscribers.add(callback)
      return () => {
        this.keysSubscribers.delete(callback)
      }
    }, [])
    const snapshot = useCallback(() => {
      const currentKeys = this.getKeys(filter)
      if (
        currentKeys.length !== prevKeys.current.length ||
        !prevKeys.current.every((key, i) => key === currentKeys[i])
      ) {
        prevKeys.current = currentKeys
      }
      return prevKeys.current
    }, [filter])

    return useSyncExternalStore(subscribe, snapshot, snapshot)
  }
}
