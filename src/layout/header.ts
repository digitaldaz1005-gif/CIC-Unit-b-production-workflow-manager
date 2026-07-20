export function Header(title: string): HTMLElement {
  const header = document.createElement("header")
  header.className = "header"

  const titleEl = document.createElement("h1")
  titleEl.textContent = title

  const timeEl = document.createElement("div")
  timeEl.className = "header-time"

  function updateTime() {
    timeEl.textContent = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  updateTime()
  setInterval(updateTime, 1000)

  header.appendChild(titleEl)
  header.appendChild(timeEl)

  return header
}