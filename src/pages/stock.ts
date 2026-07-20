import { Layout } from "../layout/layout"
import { state } from "../services/state"

let searchEl: HTMLInputElement
let lowStockEl: HTMLInputElement
let zeroStockEl: HTMLInputElement
let tbodyEl: HTMLElement
let sortKey: string = "core"
let sortAsc: boolean = true

function getFilteredRows() {
  const search = state.searchTerm.toLowerCase()

  return state.stock.filter(item => {
    if (
      search &&
      !item.core.toLowerCase().includes(search) &&
      !item.description.toLowerCase().includes(search) &&
      !item.location.toLowerCase().includes(search)
    ) {
      return false
    }
    if (state.lowStockOnly && item.quantity > item.minimum_stock) return false
    if (state.zeroStockOnly && item.quantity !== 0) return false
    return true
  })
}

function getSortedRows() {
  const filtered = getFilteredRows()
  return filtered.sort((a, b) => {
    let valA: any, valB: any
    switch (sortKey) {
      case "core": valA = a.core.toLowerCase(); valB = b.core.toLowerCase(); break
      case "description": valA = a.description.toLowerCase(); valB = b.description.toLowerCase(); break
      case "location": valA = a.location.toLowerCase(); valB = b.location.toLowerCase(); break
      case "quantity": valA = a.quantity; valB = b.quantity; break
      case "minimum_stock": valA = a.minimum_stock; valB = b.minimum_stock; break
      default: valA = a.core.toLowerCase(); valB = b.core.toLowerCase()
    }
    if (valA < valB) return sortAsc ? -1 : 1
    if (valA > valB) return sortAsc ? 1 : -1
    return 0
  })
}

function setSort(key: string) {
  if (sortKey === key) {
    sortAsc = !sortAsc
  } else {
    sortKey = key
    sortAsc = true
  }
  renderTable()
}

function renderTable() {
  if (!tbodyEl) return

  const sorted = getSortedRows()

  if (sorted.length === 0) {
    tbodyEl.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">
          ${state.stock.length === 0 ? "No stock items yet." : "No items match your filters."}
        </td>
      </tr>
    `
    return
  }

  tbodyEl.innerHTML = sorted
    .map(item => {
      let qtyClass = "qty-ok"
      if (item.quantity === 0) qtyClass = "qty-zero"
      else if (item.quantity <= item.minimum_stock) qtyClass = "qty-low"

      return `
      <tr>
        <td><strong>${item.core}</strong></td>
        <td>${item.description}</td>
        <td>${item.location}</td>
        <td class="${qtyClass}">${item.quantity}</td>
        <td>${item.minimum_stock}</td>
        <td>${item.last_updated ?? "-"}</td>
      </tr>`
    })
    .join("")
}

function onFilterChange() {
  state.searchTerm = searchEl?.value ?? ""
  state.lowStockOnly = lowStockEl?.checked ?? false
  state.zeroStockOnly = zeroStockEl?.checked ?? false
  renderTable()
}

export function renderStock(): HTMLElement {
  const content = document.createElement("div")

  content.innerHTML = `
    <div class="toolbar">
      <input type="text" id="search" placeholder="Search core, description or location..." value="${state.searchTerm}">

      <label>
        <input type="checkbox" id="lowStock" ${state.lowStockOnly ? "checked" : ""}>
        Low Stock Only
      </label>

      <label>
        <input type="checkbox" id="zeroStock" ${state.zeroStockOnly ? "checked" : ""}>
        Zero Stock Only
      </label>
    </div>

    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th class="sortable" data-sort="core">Core <span class="sort-arrow">${sortKey === "core" ? (sortAsc ? "▲" : "▼") : ""}</span></th>
            <th class="sortable" data-sort="description">Description <span class="sort-arrow">${sortKey === "description" ? (sortAsc ? "▲" : "▼") : ""}</span></th>
            <th class="sortable" data-sort="location">Location <span class="sort-arrow">${sortKey === "location" ? (sortAsc ? "▲" : "▼") : ""}</span></th>
            <th class="sortable" data-sort="quantity">Qty <span class="sort-arrow">${sortKey === "quantity" ? (sortAsc ? "▲" : "▼") : ""}</span></th>
            <th class="sortable" data-sort="minimum_stock">Min <span class="sort-arrow">${sortKey === "minimum_stock" ? (sortAsc ? "▲" : "▼") : ""}</span></th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody id="stockTbody"></tbody>
      </table>
    </div>
  `

  searchEl = content.querySelector("#search") as HTMLInputElement
  lowStockEl = content.querySelector("#lowStock") as HTMLInputElement
  zeroStockEl = content.querySelector("#zeroStock") as HTMLInputElement
  tbodyEl = content.querySelector("#stockTbody") as HTMLElement

  searchEl.oninput = onFilterChange
  lowStockEl.onchange = onFilterChange
  zeroStockEl.onchange = onFilterChange

  // Sort handlers
  content.querySelectorAll(".sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = (th as HTMLElement).getAttribute("data-sort")!
      setSort(key)
    })
  })

  renderTable()

  return Layout("Stock", content)
}