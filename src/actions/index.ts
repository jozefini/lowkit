type UnknownArray = unknown[]
type ActionCallback<T extends UnknownArray = UnknownArray> = (
  ...args: T
) => void
type ActionItem<T extends UnknownArray = UnknownArray> = {
  id: string
  callback: ActionCallback<T>
  priority: number
  once: boolean
}
type AddActionFunction = <T extends UnknownArray = UnknownArray>(
  hookName: string,
  id: string,
  callback: ActionCallback<T>,
  priority?: number
) => void
type ActionsInstance = {
  addAction: AddActionFunction
  addActionOnce: AddActionFunction
  doAction: <T extends UnknownArray = UnknownArray>(
    hookName: string,
    ...args: T
  ) => void
  removeAction: (hookName: string, id?: string) => void
}

export function createActions(): ActionsInstance {
  const actions = new Map<string, ActionItem<UnknownArray>[]>()

  const addActionBase = <T extends UnknownArray>(
    hookName: string,
    id: string,
    callback: ActionCallback<T>,
    priority: number,
    once: boolean
  ): void => {
    const hookItems = actions.get(hookName) ?? []
    hookItems.push({ id, callback, priority, once } as ActionItem<UnknownArray>)
    hookItems.sort((a, b) => a.priority - b.priority)
    actions.set(hookName, hookItems)
  }

  const addAction: AddActionFunction = (
    hookName,
    id,
    callback,
    priority = 10
  ) => addActionBase(hookName, id, callback, priority, false)

  const addActionOnce: AddActionFunction = (
    hookName,
    id,
    callback,
    priority = 10
  ) => addActionBase(hookName, id, callback, priority, true)

  function doAction<T extends UnknownArray>(
    hookName: string,
    ...args: T
  ): void {
    const hookItems = actions.get(hookName)
    if (hookItems) {
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
  }

  function removeAction(hookName: string, id?: string): void {
    if (id) {
      const hookItems = actions.get(hookName)
      if (hookItems) {
        const filteredItems = hookItems.filter((item) => item.id !== id)
        filteredItems.length > 0
          ? actions.set(hookName, filteredItems)
          : actions.delete(hookName)
      }
    } else {
      actions.delete(hookName)
    }
  }

  return { addAction, addActionOnce, doAction, removeAction }
}
