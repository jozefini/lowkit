type UnknownArray = unknown[]
type ActionCallback<T extends UnknownArray = UnknownArray> = (
  ...args: T
) => void
type ArgsModifier<T extends UnknownArray = UnknownArray> = (...args: T) => T

type ActionItem<T extends UnknownArray = UnknownArray> = {
  id: string
  hook: string
  callback: ActionCallback<T>
  priority: number
  once: boolean
  args?: ArgsModifier<T>
}

type AddActionFunctionWithId<T extends UnknownArray = UnknownArray> = (
  hookName: string,
  id: string,
  callback: ActionCallback<T>,
  priority?: number
) => void

type AddActionFunctionWithoutId<T extends UnknownArray = UnknownArray> = (
  hookName: string,
  callback: ActionCallback<T>,
  priority?: number
) => void

type AddActionFunction<T extends UnknownArray = UnknownArray> =
  AddActionFunctionWithId<T> & AddActionFunctionWithoutId<T>

type ActionModification<T extends UnknownArray = UnknownArray> = Partial<{
  hook: string
  callback: ActionCallback<T>
  priority: number
  args: ArgsModifier<T>
}>

type ActionsInstance<T extends UnknownArray = UnknownArray> = {
  addAction: AddActionFunction<T>
  addActionOnce: AddActionFunction<T>
  doAction: (hookName: string, ...args: T) => void
  removeAction: (hookName: string, id?: string) => void
  modifyAction: (id: string, modifications: ActionModification<T>) => boolean
  resetAction: (id: string) => boolean
}

export function createActions<
  T extends UnknownArray = UnknownArray,
>(): ActionsInstance<T> {
  const actions = new Map<string, ActionItem<T>[]>()
  const originalActions = new Map<string, ActionItem<T>>()

  function addActionImpl(
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
    originalActions.set(id, { ...action })
  }

  const addAction: AddActionFunction<T> = (
    hookName: string,
    idOrCallback: string | ActionCallback<T>,
    callbackOrPriority?: ActionCallback<T> | number,
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

  const addActionOnce: AddActionFunction<T> = (
    hookName: string,
    idOrCallback: string | ActionCallback<T>,
    callbackOrPriority?: ActionCallback<T> | number,
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

  function doAction(hookName: string, ...args: T): void {
    const hookItems = actions.get(hookName) ?? []
    const itemsToKeep: ActionItem<T>[] = []

    for (const item of hookItems) {
      const modifiedArgs = item.args ? item.args(...args) : args
      item.callback(...modifiedArgs)
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

  const modifyAction = (
    id: string,
    modifications: ActionModification<T>
  ): boolean => {
    for (const [hookName, hookItems] of actions) {
      const actionIndex = hookItems.findIndex((item) => item.id === id)
      if (actionIndex !== -1) {
        const existingAction = hookItems[actionIndex]
        if (existingAction) {
          const updatedAction: ActionItem<T> = {
            id: existingAction.id,
            hook: modifications.hook ?? existingAction.hook,
            callback: modifications.callback ?? existingAction.callback,
            priority: modifications.priority ?? existingAction.priority,
            once: existingAction.once,
            args: modifications.args ?? existingAction.args,
          }
          hookItems[actionIndex] = updatedAction
          actions.set(hookName, hookItems)
          return true
        }
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
