import { navigate, current } from "../router"

const pages: [string, string, string][] = [
  ["dashboard", "Dashboard", "📊"],
  ["stock", "Stock", "📦"],
  ["goodsIn", "Goods In", "📥"],
  ["shipping", "Shipping", "🚚"],
  ["rejects", "Rejects", "❌"],
  ["adjustments", "Adjustments", "⚖️"],
  ["importSchedule", "Import Schedule", "📅"],
  ["history", "History", "📋"],
]

export function Sidebar(): HTMLElement {
  const el = document.createElement("aside")
  el.className = "sidebar"

  // Logo
  const logo = document.createElement("div")
  logo.className = "sidebar-logo"
  logo.style.cursor = "pointer"
  logo.onclick = () => navigate("dashboard" as any)
  logo.innerHTML = `
    <img src="/New logo.webp" alt="CIC Unit B Logo" style="width:100%;height:auto;max-height:80px;object-fit:contain;display:block;">
  `
  el.appendChild(logo)

  // Section label
  const label = document.createElement("div")
  label.className = "sidebar-section-label"
  label.textContent = "Navigation"
  el.appendChild(label)

  // Page buttons
  const currentPage = current()

  pages.forEach(([page, label, icon]) => {
    const btn = document.createElement("button")
    btn.className = "sidebar-btn"
    if (currentPage === page) btn.classList.add("active")

    btn.innerHTML = `<span class="sidebar-btn-icon">${icon}</span> ${label}`
    btn.onclick = () => navigate(page as any)
    el.appendChild(btn)
  })

  // Footer
  const footer = document.createElement("div")
  footer.className = "sidebar-footer"
  footer.innerHTML = `<small>CIC Core Stock v1.0</small>`
  el.appendChild(footer)

  return el
}