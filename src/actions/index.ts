type UnknownArray = unknown[]
type ActionCallback<T extends UnknownArray = UnknownArray> = (
  ...args: T
) => void
type ActionItem<T extends UnknownArray = UnknownArray> = {
  id: string
  hook: string
  callback: ActionCallback<T>
  priority: number
  args: number
  once?: boolean
}

type AddActionFunctionWithId = <T extends UnknownArray = UnknownArray>(
  hookName: string,
  id: string,
  callback: ActionCallback<T>,
  priority?: number
) => void

type AddActionFunctionWithoutId = <T extends UnknownArray = UnknownArray>(
  hookName: string,
  callback: ActionCallback<T>,
  priority?: number
) => void

type AddActionFunction = AddActionFunctionWithId & AddActionFunctionWithoutId

type ActionModification<T extends UnknownArray = UnknownArray> = Partial<{
  hook: string
  callback: ActionCallback<T>
  priority: number
  args: number
}>

type ActionsInstance = {
  addAction: AddActionFunction
  addActionOnce: AddActionFunction
  doAction: <T extends UnknownArray = UnknownArray>(
    hookName: string,
    ...args: T
  ) => void
  removeAction: (hookName: string, id?: string) => void
  modifyAction: <T extends UnknownArray = UnknownArray>(
    id: string,
    modifications: ActionModification<T>
  ) => boolean
  resetAction: (id: string) => boolean
}

export function createActions(): ActionsInstance {
  const actions = new Map<string, ActionItem<UnknownArray>[]>()
  const originalActions = new Map<string, ActionItem<UnknownArray>>()

  function addActionImpl<T extends UnknownArray>(
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
      args: 1,
      once,
    }
    const hookItems = actions.get(hookName) ?? []
    hookItems.push(action as ActionItem<UnknownArray>)
    hookItems.sort((a, b) => a.priority - b.priority)
    actions.set(hookName, hookItems)
    originalActions.set(id, { ...action } as ActionItem<UnknownArray>)
  }

  const addAction: AddActionFunction = <T extends UnknownArray = UnknownArray>(
    hookName: string,
    idOrCallback: string | ActionCallback<T>,
    callbackOrPriority?: ActionCallback<T> | number,
    priorityOrUndefined?: number
  ) => {
    addActionImpl<T>(
      hookName,
      idOrCallback,
      callbackOrPriority,
      priorityOrUndefined,
      false
    )
  }

  const addActionOnce: AddActionFunction = <
    T extends UnknownArray = UnknownArray,
  >(
    hookName: string,
    idOrCallback: string | ActionCallback<T>,
    callbackOrPriority?: ActionCallback<T> | number,
    priorityOrUndefined?: number
  ) => {
    addActionImpl<T>(
      hookName,
      idOrCallback,
      callbackOrPriority,
      priorityOrUndefined,
      true
    )
  }

  function doAction<T extends UnknownArray>(
    hookName: string,
    ...args: T
  ): void {
    const hookItems = actions.get(hookName) ?? []
    const itemsToKeep: ActionItem<UnknownArray>[] = []

    for (const item of hookItems) {
      ;(item.callback as ActionCallback<T>)(...args)
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

  const modifyAction = <T extends UnknownArray = UnknownArray>(
    id: string,
    modifications: ActionModification<T>
  ): boolean => {
    for (const [hookName, hookItems] of actions) {
      const actionIndex = hookItems.findIndex((item) => item.id === id)
      if (actionIndex !== -1) {
        const updatedAction = { ...hookItems[actionIndex], ...modifications }
        hookItems[actionIndex] = updatedAction as ActionItem<UnknownArray>
        actions.set(hookName, hookItems)
        return true
      }
    }
    return false
  }

  const resetAction = (id: string): boolean => {
    const originalAction = originalActions.get(id)
    if (!originalAction) return false

    for (const [hookName, hookItems] of actions) {
      const actionIndex = hookItems.findIndex((item) => item.id === id)
      if (actionIndex !== -1) {
        hookItems[actionIndex] = { ...originalAction }
        actions.set(hookName, hookItems)
        return true
      }
    }
    return false
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
