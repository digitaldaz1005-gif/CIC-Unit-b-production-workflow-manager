import { Layout } from "../layout/layout"
import { state } from "../services/state"
import { saveReject, addMovement, upsertStockItem } from "../supabase"
import { showToast } from "../components/toast"
import { refreshData } from "../services/refresh"

export function renderRejects(): HTMLElement {
  const content = document.createElement("div")

  const hasRejects = state.rejects.length > 0

  const rows = hasRejects
    ? state.rejects
        .map(
          r => `
      <tr>
        <td>${r.date}</td>
        <td><strong>${r.core}</strong></td>
        <td>${r.quantity}</td>
        <td>${r.department}</td>
        <td>${r.reason}</td>
        <td>${r.operator}</td>
      </tr>`
        )
        .join("")
    : ""

  content.innerHTML = `
    <div class="form-section">

      <form class="form" id="rejectForm">
        <div class="form-header">Record Reject</div>

        <div class="form-group">
          <label>Core Number</label>
          <input id="core" placeholder="e.g. TR12345" required>
        </div>

        <div class="form-group">
          <label>Quantity</label>
          <input id="quantity" type="number" min="1" placeholder="0" required>
        </div>

        <div class="form-group">
          <label>Department</label>
          <input id="department" placeholder="Department name" required>
        </div>

        <div class="form-group">
          <label>Reason</label>
          <input id="reason" placeholder="Reason for reject" required>
        </div>

        <div class="form-group">
          <label>Operator</label>
          <input id="operator" placeholder="Operator name" required>
        </div>

        <button type="submit">Record Reject</button>
      </form>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Core</th>
              <th>Qty</th>
              <th>Department</th>
              <th>Reason</th>
              <th>Operator</th>
            </tr>
          </thead>
          <tbody>
            ${hasRejects
              ? rows
              : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No rejects recorded yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>

    </div>
  `

  const form = content.querySelector("#rejectForm") as HTMLFormElement

  form.onsubmit = async e => {
    e.preventDefault()

    const core = (document.getElementById("core") as HTMLInputElement).value.trim()
    const quantity = Number((document.getElementById("quantity") as HTMLInputElement).value)
    const department = (document.getElementById("department") as HTMLInputElement).value.trim()
    const reason = (document.getElementById("reason") as HTMLInputElement).value.trim()
    const operator = (document.getElementById("operator") as HTMLInputElement).value.trim()

    if (!core || quantity < 1 || !department || !reason || !operator) {
      showToast("Please fill in all fields.", "error")
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

    const submitBtn = form.querySelector("button")!
    submitBtn.disabled = true
    submitBtn.textContent = "Processing..."

    try {
      stock.quantity -= quantity
      stock.last_updated = new Date().toLocaleString()
      await upsertStockItem(stock)

      const reject = {
        core,
        quantity,
        department,
        reason,
        operator,
        date: new Date().toLocaleString(),
      }

      state.rejects.unshift(reject)
      await saveReject(reject)

      await addMovement({
        type: "REJECT",
        core,
        quantity,
        reason,
        department,
        user: operator,
        date: new Date().toLocaleString(),
      })

      showToast(`Reject recorded: ${quantity} × ${core}.`, "success")
      form.reset()
      await refreshData()
    } catch (err: any) {
      showToast(err?.message ?? "Failed to record reject.", "error")
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = "Record Reject"
    }
  }

  return Layout("Rejects", content)
}