import { current, subscribe } from "./router"

import { renderDashboard } from "./pages/dashboard"
import { renderStock } from "./pages/stock"
import { renderGoodsIn } from "./pages/goodsIn"
import { renderShipping } from "./pages/shipping"
import { renderRejects } from "./pages/rejects"
import { renderAdjustments } from "./pages/adjustments"
import { renderHistory } from "./pages/history"
import { renderImportSchedule } from "./pages/importSchedule"

import { state } from "./services/state"
import { setRender } from "./services/refresh"

import {
  seedDefaultStock,
  loadStock,
  loadHistory,
  loadShipments,
  loadRejects,
  loadAdjustments,
} from "./supabase"
const app = document.querySelector<HTMLDivElement>("#app")!

function showLoading() {
  app.innerHTML = `
    <div class="loading-container" style="min-height:100vh;display:flex;align-items:center;justify-content:center;">
      <div class="spinner"></div>
      <div class="loading-text">Loading stock data...</div>
    </div>
  `
}

function render() {
  switch (current()) {
    case "dashboard":
      app.replaceChildren(renderDashboard())
      break
    case "stock":
      app.replaceChildren(renderStock())
      break
    case "goodsIn":
      app.replaceChildren(renderGoodsIn())
      break
    case "shipping":
      app.replaceChildren(renderShipping())
      break
    case "rejects":
      app.replaceChildren(renderRejects())
      break
    case "adjustments":
      app.replaceChildren(renderAdjustments())
      break
    case "history":
      app.replaceChildren(renderHistory())
      break
    case "importSchedule":
      app.replaceChildren(renderImportSchedule())
      break
  }
}

export async function initApp() {
  showLoading()

  try {
    await seedDefaultStock()

    state.stock = await loadStock()
    state.history = await loadHistory()
    state.shipments = await loadShipments()
    state.rejects = await loadRejects()
    state.adjustments = await loadAdjustments()
    // Schedule is loaded from localStorage on demand
  } catch (err: any) {
    app.innerHTML = `
      <div class="empty-state" style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to Load Data</h3>
        <p>${err?.message ?? "An unexpected error occurred."}</p>
        <button onclick="location.reload()" style="margin-top:16px;width:auto;padding:10px 24px;">Retry</button>
      </div>
    `
    return
  }

  render()
}

setRender(render)
subscribe(render)