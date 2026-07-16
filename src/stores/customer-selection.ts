import { useSyncExternalStore } from 'react'

let selectedIds = new Set<string>()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const customerSelectionStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot() {
    return selectedIds
  },
  toggle(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds = next
    emit()
  },
  addMany(ids: string[]) {
    const next = new Set(selectedIds)
    for (const id of ids) next.add(id)
    selectedIds = next
    emit()
  },
  removeMany(ids: string[]) {
    const next = new Set(selectedIds)
    for (const id of ids) next.delete(id)
    selectedIds = next
    emit()
  },
  clear() {
    selectedIds = new Set()
    emit()
  },
}

export function useCustomerSelection(): Set<string> {
  return useSyncExternalStore(
    customerSelectionStore.subscribe,
    customerSelectionStore.getSnapshot,
    customerSelectionStore.getSnapshot,
  )
}

export default useCustomerSelection
