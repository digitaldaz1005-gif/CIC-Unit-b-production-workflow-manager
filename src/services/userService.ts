let currentUser = ""

export function getCurrentUser(): string {
  if (!currentUser) {
    currentUser = localStorage.getItem("cicCurrentUser") || ""
  }
  return currentUser
}

export function setCurrentUser(name: string) {
  currentUser = name
  localStorage.setItem("cicCurrentUser", name)
}

export function promptForUser(): string {
  const existing = getCurrentUser()
  const name = prompt("Enter your name / operator:", existing) || existing
  if (name) setCurrentUser(name)
  return getCurrentUser()
}