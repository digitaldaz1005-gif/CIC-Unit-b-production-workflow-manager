import { Layout } from "../layout/layout"
import { state } from "../services/state"

export function renderHistory(): HTMLElement {
  const content = document.createElement("div")

  const hasHistory = state.history.length > 0

  const rows = hasHistory
    ? state.history
        .map(
          h => {
            let typeBadge = "badge-info"
            if (h.type === "IN") typeBadge = "badge-success"
            else if (h.type === "OUT") typeBadge = "badge-warning"
            else if (h.type === "REJECT") typeBadge = "badge-danger"

            return `
      <tr>
        <td>${h.date}</td>
        <td><span class="badge ${typeBadge}">${h.type}</span></td>
        <td><strong>${h.core}</strong></td>
        <td>${h.quantity}</td>
        <td>${h.reason ?? "-"}</td>
        <td>${h.destination ?? "-"}</td>
        <td>${h.department ?? "-"}</td>
        <td>${h.user ?? "-"}</td>
      </tr>`
          }
        )
        .join("")
    : ""

  content.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Core</th>
            <th>Qty</th>
            <th>Reason</th>
            <th>Destination</th>
            <th>Department</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          ${hasHistory
            ? rows
            : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No movements recorded yet.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `

  return Layout("History", content)
}