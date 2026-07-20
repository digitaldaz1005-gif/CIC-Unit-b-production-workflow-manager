import { state } from "./state"
import {
  loadStock,
  loadHistory,
  loadShipments,
  loadRejects,
  loadAdjustments,
} from "../supabase"

let renderFn: (() => void) | null = null

export function setRender(fn: () => void) {
  renderFn = fn
}

export async function refreshData() {
  try {
    state.stock = await loadStock()
    state.history = await loadHistory()
    state.shipments = await loadShipments()
    state.rejects = await loadRejects()
    state.adjustments = await loadAdjustments()
  } catch (err: any) {
    console.error("Failed to refresh data:", err)
  }
  if (renderFn) renderFn()
}