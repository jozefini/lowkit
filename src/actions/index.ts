type UnknownObject = Record<string, unknown>

type ActionCallback<T extends UnknownObject = UnknownObject> = (args: T) => void
type ArgsModifier<T extends UnknownObject = UnknownObject> = (args: T) => T

interface ActionItem<T extends UnknownObject = UnknownObject> {
  id: string
  hook: string
  callback: ActionCallback<T>
  priority: number
  once: boolean
}

type AddActionFunctionWithId = <T extends UnknownObject = UnknownObject>(
  hookName: string,
  id: string,
  callback: ActionCallback<T>,
  priority?: number
) => void

type AddActionFunctionWithoutId = <T extends UnknownObject = UnknownObject>(
  hookName: string,
  callback: ActionCallback<T>,
  priority?: number
) => void

type AddActionFunction = AddActionFunctionWithId & AddActionFunctionWithoutId

interface ActionModification<T extends UnknownObject = UnknownObject> {
  callback?: ActionCallback<T>
  priority?: number
  args?: T | ArgsModifier<T>
}

interface ActionsInstance {
  addAction: AddActionFunction
  addActionOnce: AddActionFunction
  doAction: <T extends UnknownObject = UnknownObject>(
    hookName: string,
    args?: T
  ) => void
  removeAction: (hookName: string, id?: string) => void
  modifyAction: <T extends UnknownObject = UnknownObject>(
    id: string,
    modifications: ActionModification<T>
  ) => boolean
  resetAction: (id: string) => boolean
}

export function createActions(): ActionsInstance {
  // biome-ignore lint/suspicious/noExplicitAny: <no better type>
  const actions = new Map<string, ActionItem<any>[]>()
  // biome-ignore lint/suspicious/noExplicitAny: <no better type>
  const originalActions = new Map<string, ActionItem<any>>()
  // biome-ignore lint/suspicious/noExplicitAny: <no better type>
  const modifiedArgs = new Map<string, any>()

  function addActionImpl<T extends UnknownObject = UnknownObject>(
    hookName: string,
    idOrCallback: string | ActionCallback<T>,
    callbackOrPriority?: ActionCallback<T> | number,
    priorityOrUndefined?: number,
    once = false
  ): void {
    let id: string
    let callback: ActionCallback<T>
    let priority: number

    if (typeof idOrCallback === 'string') {
      id = idOrCallback
      callback = callbackOrPriority as ActionCallback<T>
      priority = priorityOrUndefined ?? 10
    } else {
      id = hookName
      callback = idOrCallback
      priority = (callbackOrPriority as number) ?? 10
    }

    const action: ActionItem<T> = {
      id,
      hook: hookName,
      callback,
      priority,
      once,
    }
    const hookItems = actions.get(hookName) ?? []
    hookItems.push(action)
    hookItems.sort((a, b) => a.priority - b.priority)
    actions.set(hookName, hookItems)
    if (!originalActions.has(id)) {
      originalActions.set(id, { ...action })
    }
  }

  const addAction: AddActionFunction = (
    hookName: string,
    // biome-ignore lint/suspicious/noExplicitAny: <no better type>
    idOrCallback: string | ActionCallback<any>,
    // biome-ignore lint/suspicious/noExplicitAny: <no better type>
    callbackOrPriority?: ActionCallback<any> | number,
    priorityOrUndefined?: number
  ) => {
    addActionImpl(
      hookName,
      idOrCallback,
      callbackOrPriority,
      priorityOrUndefined,
      false
    )
  }

  const addActionOnce: AddActionFunction = (
    hookName: string,
    // biome-ignore lint/suspicious/noExplicitAny: <no better type>
    idOrCallback: string | ActionCallback<any>,
    // biome-ignore lint/suspicious/noExplicitAny: <no better type>
    callbackOrPriority?: ActionCallback<any> | number,
    priorityOrUndefined?: number
  ) => {
    addActionImpl(
      hookName,
      idOrCallback,
      callbackOrPriority,
      priorityOrUndefined,
      true
    )
  }

  function doAction<T extends UnknownObject = UnknownObject>(
    hookName: string,
    args?: T
  ): void {
    const hookItems = actions.get(hookName) ?? []
    // biome-ignore lint/suspicious/noExplicitAny: <no better type>
    const itemsToKeep: ActionItem<any>[] = []

    for (const item of hookItems) {
      let currentArgs = args
      const modifiedArg = modifiedArgs.get(item.id)
      if (modifiedArg) {
        currentArgs =
          typeof modifiedArg === 'function'
            ? // biome-ignore lint/suspicious/noExplicitAny: <no better type>
              modifiedArg(currentArgs as any)
            : modifiedArg
      }
      item.callback(currentArgs)
      if (!item.once) {
        itemsToKeep.push(item)
      }
    }

    if (itemsToKeep.length !== hookItems.length) {
      actions.set(hookName, itemsToKeep)
    }
  }

  const removeAction = (hookName: string, id?: string): void => {
    if (id) {
      const hookItems = actions.get(hookName)
      if (hookItems) {
        const filteredItems = hookItems.filter((item) => item.id !== id)
        if (filteredItems.length > 0) {
          actions.set(hookName, filteredItems)
        } else {
          actions.delete(hookName)
        }
      }
    } else {
      actions.delete(hookName)
    }
  }

  const modifyAction = <T extends UnknownObject = UnknownObject>(
    id: string,
    modifications: ActionModification<T>
  ): boolean => {
    let modified = false
    for (const [hookName, hookItems] of actions) {
      const updatedItems = hookItems.map((item) => {
        if (item.id === id) {
          modified = true
          return {
            ...item,
            callback: modifications.callback ?? item.callback,
            priority: modifications.priority ?? item.priority,
          }
        }
        return item
      })
      if (modified) {
        if (modifications.args !== undefined) {
          modifiedArgs.set(id, modifications.args)
        }
        updatedItems.sort((a, b) => a.priority - b.priority)
        actions.set(hookName, updatedItems)
      }
    }
    return modified
  }

  const resetAction = (id: string): boolean => {
    const originalAction = originalActions.get(id)
    if (!originalAction) return false

    let reset = false
    for (const [hookName, hookItems] of actions) {
      const updatedItems = hookItems.map((item) => {
        if (item.id === id) {
          reset = true
          return { ...originalAction }
        }
        return item
      })
      if (reset) {
        updatedItems.sort((a, b) => a.priority - b.priority)
        actions.set(hookName, updatedItems)
      }
    }
    if (reset) {
      modifiedArgs.delete(id)
    }
    return reset
  }

  return {
    addAction,
    addActionOnce,
    doAction,
    removeAction,
    modifyAction,
    resetAction,
  }
}
