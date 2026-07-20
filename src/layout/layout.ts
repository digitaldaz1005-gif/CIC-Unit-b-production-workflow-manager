import { Header } from "./header"
import { Sidebar } from "./sidebar"

export function Layout(title: string, content: HTMLElement): HTMLElement {
  const app = document.createElement("div")
  app.className = "app-layout"

  const main = document.createElement("main")
  main.className = "main-content"

  const pageContent = document.createElement("div")
  pageContent.className = "page-content"
  pageContent.appendChild(content)

  main.appendChild(Header(title))
  main.appendChild(pageContent)

  app.appendChild(Sidebar())
  app.appendChild(main)

  return app
}
