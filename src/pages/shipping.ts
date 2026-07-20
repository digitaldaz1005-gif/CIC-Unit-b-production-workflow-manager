import { Layout } from "../layout/layout"
import { state } from "../services/state"
import { saveShipment, addMovement, upsertStockItem } from "../supabase"
import { showToast } from "../components/toast"
import { refreshData } from "../services/refresh"
import { recordShipment } from "../services/scheduleService"
import { getCurrentUser, promptForUser } from "../services/userService"

// Internal destination — all shipments are for Unit 5 and 6
const INTERNAL_DESTINATION = "Unit 5 and 6"

export function renderShipping(): HTMLElement {
  const content = document.createElement("div")

  const hasShipments = state.shipments.length > 0

  const rows = hasShipments
    ? state.shipments
        .map(
          s => `
      <tr>
        <td><strong>${s.core}</strong></td>
        <td>${s.quantity_shipped}</td>
        <td>${s.remaining_to_ship}</td>
        <td><span class="badge ${s.status === "Complete" ? "badge-success" : s.status === "In Progress" ? "badge-info" : "badge-warning"}">${s.status}</span></td>
      </tr>`
        )
        .join("")
    : ""

  // Build core options from stock
  const coreOptions = state.stock
    .map(s => `<option value="${s.core}">${s.core} — ${s.description} (${s.quantity} in stock)</option>`)
    .join("")

  content.innerHTML = `
    <div class="form-section">

      <form class="form" id="shippingForm">
        <div class="form-header">Ship Stock</div>

        <div class="form-group">
          <label>Core Number</label>
          <select id="core" required>
            <option value="">Select a core...</option>
            ${coreOptions}
          </select>
        </div>

        <div class="form-group">
          <label>Quantity</label>
          <input id="quantity" type="number" min="1" placeholder="0" required>
        </div>

        <button type="submit">Ship Stock</button>
      </form>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Core</th>
              <th>Shipped</th>
              <th>Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${hasShipments
              ? rows
              : `<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted);">No shipments recorded yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>

    </div>
  `

  const form = content.querySelector("#shippingForm") as HTMLFormElement

  form.onsubmit = async e => {
    e.preventDefault()

    const core = (content.querySelector("#core") as HTMLSelectElement).value.trim()
    const quantity = Number((content.querySelector("#quantity") as HTMLInputElement).value)

    if (!core || quantity < 1) {
      showToast("Please select a core and enter a valid quantity.", "error")
      return
    }

    const stock = state.stock.find(s => s.core === core)
    if (!stock) {
      showToast(`Core "${core}" not found in stock.`, "error")
      return
    }
    if (stock.quantity < quantity) {
      showToast(`Not enough stock. Available: ${stock.quantity}`, "error")
      return
    }

    // Ensure user is set
    let user = getCurrentUser()
    if (!user) {
      user = promptForUser()
      if (!user) {
        showToast("Operator name is required.", "error")
        return
      }
    }

    const submitBtn = form.querySelector("button")!
    submitBtn.disabled = true
    submitBtn.textContent = "Processing..."

    try {
      stock.quantity -= quantity
      stock.last_updated = new Date().toLocaleString()
      await upsertStockItem(stock)

      const shipment = {
        week_number: 0,
        core,
        weekly_requirement: quantity,
        quantity_shipped: quantity,
        remaining_to_ship: 0,
        destination: INTERNAL_DESTINATION,
        status: "Complete",
      }

      state.shipments.unshift(shipment)
      await saveShipment(shipment)

      await addMovement({
        type: "OUT",
        core,
        quantity,
        destination: INTERNAL_DESTINATION,
        user,
        date: new Date().toLocaleString(),
      })

      // Auto-decrement schedule with user
      recordShipment(core, quantity, user)

      showToast(`Shipped ${quantity} × ${core} to ${INTERNAL_DESTINATION}.`, "success")
      form.reset()
      await refreshData()
    } catch (err: any) {
      showToast(err?.message ?? "Failed to ship stock.", "error")
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = "Ship Stock"
    }
  }

  return Layout("Shipping", content)
}