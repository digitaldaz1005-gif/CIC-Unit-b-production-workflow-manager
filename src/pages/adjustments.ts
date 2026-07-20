import { Layout } from "../layout/layout"
import { state } from "../services/state"
import { saveAdjustment, addMovement, upsertStockItem } from "../supabase"
import { showToast } from "../components/toast"
import { refreshData } from "../services/refresh"

export function renderAdjustments(): HTMLElement {
  const content = document.createElement("div")

  const hasAdjustments = state.adjustments.length > 0

  const rows = hasAdjustments
    ? state.adjustments
        .map(
          a => `
      <tr>
        <td>${a.date}</td>
        <td><strong>${a.core}</strong></td>
        <td><span class="badge ${a.adjustment_type === "ADD" ? "badge-success" : "badge-danger"}">${a.adjustment_type}</span></td>
        <td>${a.quantity}</td>
        <td>${a.reason}</td>
        <td>${a.operator}</td>
      </tr>`
        )
        .join("")
    : ""

  content.innerHTML = `
    <div class="form-section">

      <form class="form" id="adjustmentForm">
        <div class="form-header">Stock Adjustment</div>

        <div class="form-group">
          <label>Core Number</label>
          <input id="core" placeholder="e.g. TR12345" required>
        </div>

        <div class="form-group">
          <label>Adjustment Type</label>
          <select id="type">
            <option value="ADD">ADD Stock</option>
            <option value="REMOVE">REMOVE Stock</option>
          </select>
        </div>

        <div class="form-group">
          <label>Quantity</label>
          <input id="quantity" type="number" min="1" placeholder="0" required>
        </div>

        <div class="form-group">
          <label>Reason</label>
          <input id="reason" placeholder="Reason for adjustment" required>
        </div>

        <div class="form-group">
          <label>Operator</label>
          <input id="operator" placeholder="Operator name" required>
        </div>

        <button type="submit">Save Adjustment</button>
      </form>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Core</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Reason</th>
              <th>Operator</th>
            </tr>
          </thead>
          <tbody>
            ${hasAdjustments
              ? rows
              : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No adjustments recorded yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>

    </div>
  `

  const form = content.querySelector("#adjustmentForm") as HTMLFormElement

  form.onsubmit = async e => {
    e.preventDefault()

    const core = (document.getElementById("core") as HTMLInputElement).value.trim()
    const type = (document.getElementById("type") as HTMLSelectElement).value as "ADD" | "REMOVE"
    const quantity = Number((document.getElementById("quantity") as HTMLInputElement).value)
    const reason = (document.getElementById("reason") as HTMLInputElement).value.trim()
    const operator = (document.getElementById("operator") as HTMLInputElement).value.trim()

    if (!core || quantity < 1 || !reason || !operator) {
      showToast("Please fill in all fields.", "error")
      return
    }

    const stock = state.stock.find(s => s.core === core)
    if (!stock) {
      showToast(`Core "${core}" not found in stock.`, "error")
      return
    }
    if (type === "REMOVE" && stock.quantity < quantity) {
      showToast(`Not enough stock. Available: ${stock.quantity}`, "error")
      return
    }

    const submitBtn = form.querySelector("button")!
    submitBtn.disabled = true
    submitBtn.textContent = "Processing..."

    try {
      if (type === "ADD") stock.quantity += quantity
      else stock.quantity -= quantity

      stock.last_updated = new Date().toLocaleString()
      await upsertStockItem(stock)

      const adjustment = {
        core,
        adjustment_type: type,
        quantity,
        reason,
        operator,
        date: new Date().toLocaleString(),
      }

      state.adjustments.unshift(adjustment)
      await saveAdjustment(adjustment)

      await addMovement({
        type: "ADJUSTMENT",
        core,
        quantity: type === "ADD" ? quantity : -quantity,
        reason,
        user: operator,
        date: new Date().toLocaleString(),
      })

      showToast(`Adjustment recorded: ${type} ${quantity} × ${core}.`, "success")
      form.reset()
      await refreshData()
    } catch (err: any) {
      showToast(err?.message ?? "Failed to save adjustment.", "error")
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = "Save Adjustment"
    }
  }

  return Layout("Adjustments", content)
}