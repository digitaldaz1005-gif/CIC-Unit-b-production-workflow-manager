export type Page =
  | "dashboard"
  | "stock"
  | "goodsIn"
  | "shipping"
  | "rejects"
  | "adjustments"
  | "history"
  | "importSchedule"

let currentPage: Page = "dashboard"

const listeners: Array<(page: Page) => void> = []

export function navigate(page: Page) {
  currentPage = page
  listeners.forEach(listener => listener(page))
}

export function current() {
  return currentPage
}

export function subscribe(listener: (page: Page) => void) {
  listeners.push(listener)
}