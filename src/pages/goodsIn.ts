import { Layout } from "../layout/layout"
import { state } from "../services/state"
import { upsertStockItem, addMovement } from "../supabase"
import { showToast } from "../components/toast"
import { refreshData } from "../services/refresh"

export function renderGoodsIn(): HTMLElement {
  const content = document.createElement("div")

  content.innerHTML = `
    <div class="form-section">

      <form class="form" id="goodsInForm">
        <div class="form-header">Receive Stock</div>

        <div class="form-group">
          <label>Core Number</label>
          <input id="core" placeholder="e.g. TR12345" required>
        </div>

        <div class="form-group">
          <label>Description</label>
          <input id="description" placeholder="Part description" required>
        </div>

        <div class="form-group">
          <label>Location</label>
          <input id="location" placeholder="e.g. A01" required>
        </div>

        <div class="form-group">
          <label>Quantity</label>
          <input id="quantity" type="number" min="1" placeholder="0" required>
        </div>

        <button type="submit">Receive Stock</button>
      </form>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Core</th>
              <th>Description</th>
              <th>Location</th>
              <th>Qty</th>
              <th>Min</th>
            </tr>
          </thead>
          <tbody>
            ${state.stock.length === 0
              ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">No stock items yet.</td></tr>`
              : state.stock.map(item => `
                <tr>
                  <td><strong>${item.core}</strong></td>
                  <td>${item.description}</td>
                  <td>${item.location}</td>
                  <td>${item.quantity}</td>
                  <td>${item.minimum_stock}</td>
                </tr>
              `).join("")
            }
          </tbody>
        </table>
      </div>

    </div>
  `

  const form = content.querySelector("#goodsInForm") as HTMLFormElement

  form.onsubmit = async (e) => {
    e.preventDefault()

    const core = (document.getElementById("core") as HTMLInputElement).value.trim()
    const description = (document.getElementById("description") as HTMLInputElement).value.trim()
    const location = (document.getElementById("location") as HTMLInputElement).value.trim()
    const quantity = Number((document.getElementById("quantity") as HTMLInputElement).value)

    if (!core || !description || !location || quantity < 1) {
      showToast("Please fill in all fields.", "error")
      return
    }

    const submitBtn = form.querySelector("button")!
    submitBtn.disabled = true
    submitBtn.textContent = "Processing..."

    try {
      const existing = state.stock.find(s => s.core === core)

      if (existing) {
        existing.quantity += quantity
        existing.description = description
        existing.location = location
        existing.last_updated = new Date().toLocaleString()
        existing.minimum_stock ??= 0
        await upsertStockItem(existing)
      } else {
        const item = {
          core,
          description,
          location,
          quantity,
          minimum_stock: 0,
          last_updated: new Date().toLocaleString(),
        }
        state.stock.push(item)
        await upsertStockItem(item)
      }

      await addMovement({
        type: "IN",
        core,
        quantity,
        date: new Date().toLocaleString(),
      })

      showToast(`Received ${quantity} × ${core} successfully.`, "success")
      form.reset()
      await refreshData()
    } catch (err: any) {
      showToast(err?.message ?? "Failed to receive stock.", "error")
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = "Receive Stock"
    }
  }

  return Layout("Goods In", content)
}