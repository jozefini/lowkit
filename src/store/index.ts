import {
  startTransition,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'

// Constructor
type MapStoreConstructor<TMap> = {
  name?: string // For devtools, if set it will activate the devtools
  initialMap?: Map<keyof TMap, TMap[keyof TMap]>
  fallbackValue?: TMap[keyof TMap]
  devtools?: boolean
  type?: 'map' | 'object'
}
// Nested
type Primitive = string | number | boolean | null | undefined
type LimitedPathImpl<
  T,
  K extends keyof T,
  Depth extends number,
> = K extends string
  ? T[K] extends Primitive
    ? [K]
    : T[K] extends Array<infer U>
      ? Depth extends 0
        ? [K]
        :
            | [K]
            | [K, number]
            | [
                K,
                number,
                ...LimitedPathImpl<U, keyof U, [-1, 0, 1, 2, 3, 4][Depth]>,
              ]
      : Depth extends 0
        ? [K]
        :
            | [K]
            | [
                K,
                ...LimitedPathImpl<
                  T[K],
                  keyof T[K],
                  [-1, 0, 1, 2, 3, 4][Depth]
                >,
              ]
  : never
type LimitedPath<T, Depth extends number> =
  | [keyof T]
  | LimitedPathImpl<T, keyof T, Depth>
// Use LimitedPath with a depth of 5 (adjust as needed)
type Path<T> = LimitedPath<T, 5>
// PathValue remains unchanged
type PathValue<T, P extends Path<T>> = P extends [infer K]
  ? K extends keyof T
    ? T[K]
    : never
  : P extends [infer K, ...infer R]
    ? K extends keyof T
      ? R extends Path<T[K]>
        ? PathValue<T[K], R>
        : never
      : never
    : never

// Devtools
type DevToolsExtension = {
  connect: (options: { name: string }) => DevToolsInstance
}
type DevToolsInstance = {
  init: (state: unknown) => void
  subscribe: (listener: (message: DevToolsMessage) => void) => void
  send: (action: { type: string; payload?: unknown }, state: unknown) => void
}
type DevToolsMessage = {
  type: string
  payload: {
    type: string
  }
  state?: string
}
type WindowWithDevTools = Window & {
  __REDUX_DEVTOOLS_EXTENSION__?: DevToolsExtension
}

export function createStore<TMap>(props?: MapStoreConstructor<TMap>) {
  let map = props?.initialMap || new Map<keyof TMap, TMap[keyof TMap]>()
  const itemSubscribers = new Map<string, Set<() => void>>()
  const sizeSubscribers = new Set<() => void>()
  const keysSubscribers = new Set<() => void>()
  const fallbackValue = props?.fallbackValue
  let devtools: DevToolsInstance | null = null
  const type: 'map' | 'object' = props?.type || 'map'
  const initialState = new Map(map)
  const pathCache = new Map<keyof TMap | Path<TMap>, string[]>()
  const nestedFallbackValueCache = new Map<string, any>()
  const itemSubscriberPaths = new Set<string>()
  const devtoolsStateCache = new Map<keyof TMap, TMap[keyof TMap]>()

  // Helper functions
  function addSubscriber(path: Path<TMap>, callback: () => void) {
    const pathString = pathToString(path)
    if (!itemSubscribers.has(pathString)) {
      itemSubscribers.set(pathString, new Set())
      itemSubscriberPaths.add(pathString)
    }
    itemSubscribers.get(pathString)!.add(callback)
  }

  function removeSubscriber(path: Path<TMap>, callback: () => void) {
    const pathString = pathToString(path)
    const subscribers = itemSubscribers.get(pathString)
    if (subscribers) {
      subscribers.delete(callback)
      if (subscribers.size === 0) {
        itemSubscribers.delete(pathString)
        itemSubscriberPaths.delete(pathString)
      }
    }
  }

  function pathToString(path: keyof TMap | Path<TMap>): string {
    if (Array.isArray(path)) {
      let result = ''
      for (let i = 0; i < path.length; i++) {
        if (i > 0) result += '.'
        result += String(path[i])
      }
      return result
    }
    return String(path)
  }

  function pathToStringArray(path: keyof TMap | Path<TMap>): string[] {
    const cached = pathCache.get(path)
    if (cached) return cached

    let result: string[]
    if (Array.isArray(path)) {
      const length = path.length
      result = new Array(length)
      for (let i = 0; i < length; i++) {
        result[i] = String(path[i])
      }
    } else {
      result = [String(path)]
    }

    pathCache.set(path, result)
    return result
  }

  function getFallbackValue<K extends keyof TMap>(key: K): TMap[K] {
    if (type === 'object' && fallbackValue) {
      return (fallbackValue as any)[key] ?? (fallbackValue as TMap[K])
    }
    return fallbackValue as TMap[K]
  }

  function getNestedFallbackValue<P extends Path<TMap>>(
    path: P
  ): PathValue<TMap, P> {
    const pathString = pathToString(path)
    if (nestedFallbackValueCache.has(pathString)) {
      return nestedFallbackValueCache.get(pathString)
    }

    if (type !== 'object' || !fallbackValue) {
      return undefined as PathValue<TMap, P>
    }

    let fallbackValueResult: any = fallbackValue

    for (let i = 1; i < path.length; i++) {
      if (fallbackValueResult === undefined || fallbackValueResult === null) {
        return undefined as PathValue<TMap, P>
      }

      if (Array.isArray(fallbackValueResult) && typeof path[i] === 'number') {
        fallbackValueResult = fallbackValueResult[path[i] as number]
      } else {
        fallbackValueResult =
          fallbackValueResult[path[i] as keyof typeof fallbackValueResult]
      }
    }

    const result =
      fallbackValueResult !== undefined
        ? fallbackValueResult
        : (undefined as PathValue<TMap, P>)
    nestedFallbackValueCache.set(pathString, result)
    return result
  }

  // Devtools
  function initDevtools(name: string) {
    const extension =
      typeof window !== 'undefined' &&
      (window as WindowWithDevTools).__REDUX_DEVTOOLS_EXTENSION__
    if (extension) {
      devtools = extension.connect({
        name,
      }) as DevToolsInstance
      devtools.init(getMap())
    }
  }

  function sendToDevtools(action: string, args?: unknown, skip = false) {
    if (skip || !devtools) {
      return
    }

    devtoolsStateCache.clear()
    for (const [key, value] of getMap()) {
      devtoolsStateCache.set(key, value)
    }

    devtools.send({ type: action, payload: args }, devtoolsStateCache)
  }

  function handleDevToolsMessage(message: DevToolsMessage) {
    if (message.type === 'DISPATCH') {
      switch (message.payload.type) {
        case 'RESET':
          setMap(new Map(initialState), true, true)
          break
        case 'COMMIT':
          devtools?.init(Object.fromEntries(getMap()))
          break
        case 'ROLLBACK':
        case 'JUMP_TO_STATE':
        case 'JUMP_TO_ACTION':
          if (message.state) {
            try {
              const newState = JSON.parse(message.state)
              setMapFromObject(newState, false)
              syncMap()
            } catch (error) {
              console.error('Failed to parse state from DevTools:', error)
            }
          }
          break
      }
    }
  }

  function setMapFromObject(obj: Record<string, unknown>, notify = true) {
    const newMap = new Map<keyof TMap, TMap[keyof TMap]>()
    for (const [key, value] of Object.entries(obj)) {
      newMap.set(key as keyof TMap, value as TMap[keyof TMap])
    }
    setMap(newMap, notify, true)
  }

  // Sync functions
  function batchedUpdate(callbacks: Set<() => void>) {
    if (callbacks.size > 0) {
      startTransition(() => {
        for (const callback of callbacks) {
          callback()
        }
      })
    }
  }

  function syncKeys() {
    batchedUpdate(keysSubscribers)
  }

  function syncSize() {
    batchedUpdate(sizeSubscribers)
  }

  function syncItem(key: keyof TMap | Path<TMap>) {
    const fullPath = pathToString(key)
    const batch = new Set<() => void>()

    for (const subPath of itemSubscriberPaths) {
      if (subPath === fullPath || subPath.startsWith(fullPath + '.')) {
        const callbacks = itemSubscribers.get(subPath)
        if (callbacks) {
          for (const callback of callbacks) {
            batch.add(callback)
          }
        }
      }
    }

    const pathArray = pathToStringArray(key)
    let currentPath = ''
    for (const segment of pathArray) {
      currentPath += (currentPath ? '.' : '') + segment
      const parentCallbacks = itemSubscribers.get(currentPath)
      if (parentCallbacks) {
        for (const callback of parentCallbacks) {
          batch.add(callback)
        }
      }
    }

    batchedUpdate(batch)
  }

  function syncItems(keys: (keyof TMap | Path<TMap>)[]) {
    const batch = new Set<() => void>()

    for (const key of keys) {
      const pathString = pathToString(key)
      for (const subPath of itemSubscriberPaths) {
        if (subPath === pathString || subPath.startsWith(pathString + '.')) {
          const callbacks = itemSubscribers.get(subPath)
          if (callbacks) {
            for (const callback of callbacks) {
              batch.add(callback)
            }
          }
        }
      }
    }

    batchedUpdate(batch)
  }

  function syncMap() {
    const batch = new Set<() => void>()
    for (const subscribers of itemSubscribers.values()) {
      for (const callback of subscribers) {
        batch.add(callback)
      }
    }
    batchedUpdate(batch)
  }

  // Getters
  function getMap() {
    return map as Map<keyof TMap, TMap[keyof TMap]>
  }

  function get<K extends keyof TMap | Path<TMap>>(
    key: K
  ): K extends keyof TMap
    ? TMap[K]
    : K extends Path<TMap>
      ? PathValue<TMap, K>
      : never {
    if (Array.isArray(key)) {
      return getScoped(key as Path<TMap>) as any
    }
    return (
      map.get(key as keyof TMap) ?? (getFallbackValue(key as keyof TMap) as any)
    )
  }

  function getScoped<P extends Path<TMap>>(path: P): PathValue<TMap, P> {
    let value: any = map.get(path[0] as keyof TMap)

    if (value === undefined) {
      return getNestedFallbackValue(path)
    }

    for (let i = 1; i < path.length; i++) {
      if (value === undefined || value === null) {
        return getNestedFallbackValue(path)
      }
      value = value[path[i] as keyof typeof value]
    }

    return value !== undefined ? value : getNestedFallbackValue(path)
  }

  function getSize() {
    return map.size as number
  }

  function getKeys(filter?: (_: TMap[keyof TMap], i: number) => boolean) {
    if (!filter) {
      return Array.from(map.keys()) as (keyof TMap)[]
    }
    const keys: (keyof TMap)[] = []
    let i = 0
    for (const [key, value] of map) {
      if (filter(value, i++)) {
        keys.push(key)
      }
    }
    return keys
  }

  // Actions
  function set<P extends keyof TMap | Path<TMap>>(
    path: P,
    item: P extends keyof TMap
      ? TMap[P]
      : P extends Path<TMap>
        ? PathValue<TMap, P>
        : never,
    notify = true
  ) {
    const pathArray = Array.isArray(path) ? path : [path]
    const topLevelKey = pathArray[0] as keyof TMap

    if (pathArray.length === 1) {
      map.set(topLevelKey, item as TMap[keyof TMap])
    } else {
      const existingData = map.get(topLevelKey)
      if (existingData === undefined) {
        return
      }

      let current: any = existingData
      for (let i = 1; i < pathArray.length - 1; i++) {
        if (current[pathArray[i]] === undefined) {
          current[pathArray[i]] = {}
        }
        current = current[pathArray[i]]
      }

      current[pathArray[pathArray.length - 1]] = item
      map.set(topLevelKey, existingData)
    }

    sendToDevtools('SET', { path, item })

    if (notify) {
      startTransition(() => {
        syncItem(path)
        if (pathArray.length === 1) {
          syncSize()
          syncKeys()
        }
      })
    }
  }

  function setMap(
    newMap: Map<keyof TMap, TMap[keyof TMap]>,
    notify = true,
    skipSnapshot = false
  ) {
    map = newMap

    sendToDevtools('SET_MAP', { map: Object.fromEntries(newMap) }, skipSnapshot)

    if (notify) {
      itemSubscribers.clear()
      itemSubscriberPaths.clear()
      sizeSubscribers.clear()
      keysSubscribers.clear()

      startTransition(() => {
        syncMap()
        syncSize()
        syncKeys()
      })
    }
  }

  function update<P extends keyof TMap | Path<TMap>>(
    path: P,
    item: P extends keyof TMap
      ? Partial<TMap[P]> | ((prev: TMap[P]) => TMap[P])
      : P extends Path<TMap>
        ?
            | Partial<PathValue<TMap, P>>
            | ((prev: PathValue<TMap, P>) => PathValue<TMap, P>)
        : never,
    notify = true,
    skipSnapshot = false
  ) {
    const pathArray = Array.isArray(path) ? path : [path]
    const topLevelKey = pathArray[0] as keyof TMap

    if (!map.has(topLevelKey)) {
      return
    }

    let data = map.get(topLevelKey) as any
    let updatedItem: any

    if (pathArray.length === 1) {
      if (typeof item === 'function') {
        updatedItem = (item as Function)(data)
      } else if (
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item)
      ) {
        updatedItem = { ...data, ...item }
      } else {
        updatedItem = item
      }
      map.set(topLevelKey, updatedItem)
    } else {
      updatedItem = { ...data }
      let current = updatedItem
      for (let i = 1; i < pathArray.length - 1; i++) {
        current = current[pathArray[i] as keyof typeof current]
        if (current === undefined || current === null) {
          return
        }
      }
      const lastKey = pathArray[pathArray.length - 1] as keyof typeof current
      if (typeof item === 'function') {
        current[lastKey] = (item as Function)(current[lastKey])
      } else if (
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item)
      ) {
        current[lastKey] = { ...current[lastKey], ...item }
      } else {
        current[lastKey] = item
      }
      map.set(topLevelKey, updatedItem)
    }

    sendToDevtools('UPDATE', { path, item: updatedItem }, skipSnapshot)

    if (notify) {
      startTransition(() => {
        syncItem(path)
      })
    }
  }

  function batchUpdate<TMapKey extends keyof TMap>(
    updates: {
      [K in TMapKey]?: Partial<TMap[K]> | ((prev: TMap[K]) => TMap[K])
    },
    notify = true,
    skipSnapshot = false
  ) {
    const updatedKeys = new Set<TMapKey>()
    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        const updateItem = updates[key as TMapKey]
        if (updateItem !== undefined) {
          update(key as keyof TMap, updateItem as any, false)
          updatedKeys.add(key as TMapKey)
        }
      }
    }

    sendToDevtools('BATCH_UPDATE', { updates }, skipSnapshot)

    if (notify) {
      startTransition(() => {
        syncItems(Array.from(updatedKeys))
      })
    }
  }

  function remove(key: keyof TMap, notify = true, skipSnapshot = false) {
    map.delete(key)

    sendToDevtools('REMOVE', { key }, skipSnapshot)

    if (notify) {
      startTransition(() => {
        syncItem(key)
        syncSize()
        syncKeys()
      })
    }
  }

  // Subscribers
  function use<P extends keyof TMap | Path<TMap>>(path: P) {
    type ReturnType = P extends keyof TMap
      ? TMap[P]
      : PathValue<TMap, Extract<P, Path<TMap>>>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const prevItem = useRef<ReturnType>()

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const subscribe = useCallback(
      (callback: () => void) => {
        const typedPath: Path<TMap> = Array.isArray(path)
          ? (path as Path<TMap>)
          : [path as keyof TMap]
        addSubscriber(typedPath, callback)

        return () => {
          removeSubscriber(typedPath, callback)
        }
      },
      [path]
    )

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const getSnapshot = useCallback(() => {
      const currentItem = Array.isArray(path)
        ? getScoped(path as Path<TMap>)
        : get(path as keyof TMap)

      if (!Object.is(currentItem, prevItem.current)) {
        prevItem.current = currentItem as ReturnType
      }
      return prevItem.current
    }, [path])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(
      subscribe,
      getSnapshot,
      getSnapshot
    ) as ReturnType
  }

  function useSize() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const subscribe = useCallback((callback: () => void) => {
      sizeSubscribers.add(callback)
      return () => {
        sizeSubscribers.delete(callback)
      }
    }, [])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const getSnapshot = useCallback(() => {
      return map.size
    }, [])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  }

  function useKeys(filter?: (_: TMap[keyof TMap], i: number) => boolean) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const keysRef = useRef<(keyof TMap)[]>([])
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sizeRef = useRef(0)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const keysStringRef = useRef('')

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const subscribe = useCallback((callback: () => void) => {
      const unsubscribe = () => {
        keysSubscribers.delete(callback)
      }
      keysSubscribers.add(callback)
      return unsubscribe
    }, [])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const getSnapshot = useCallback(() => {
      const currentSize = map.size

      if (currentSize !== sizeRef.current) {
        const currentKeys = Array.from(map.keys())
        const currentKeysString = currentKeys.join(',')
        if (currentKeysString !== keysStringRef.current) {
          keysRef.current = currentKeys
          keysStringRef.current = currentKeysString
          sizeRef.current = currentSize
        }
      }

      return keysRef.current
    }, [])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const allKeys = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const filteredKeys = useMemo(() => {
      if (!filter) return allKeys
      return allKeys.filter((key, i) => filter(map.get(key)!, i))
    }, [allKeys, filter])

    return filteredKeys
  }

  // Initialize devtools if name is provided
  if (props?.name && (props.devtools ?? true)) {
    initDevtools(props.name)

    if (devtools) {
      ;(devtools as DevToolsInstance)?.subscribe(handleDevToolsMessage)
    }
  }

  // Return the public API
  return {
    getMap,
    get,
    getSize,
    getKeys,
    set,
    setMap,
    update,
    batchUpdate,
    remove,
    use,
    useSize,
    useKeys,
    syncKeys,
    syncSize,
    syncItem,
    syncItems,
    syncMap,
  }
}
