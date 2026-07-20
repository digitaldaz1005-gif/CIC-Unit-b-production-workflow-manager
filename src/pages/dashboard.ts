import { Layout } from "../layout/layout"
import { navigate } from "../router"
import { state } from "../services/state"
import { loadSchedule, loadCarryovers, loadScheduleMovements } from "../services/scheduleService"

export function renderDashboard(): HTMLElement {
  const content = document.createElement("div")

  const totalRejects = state.rejects.reduce((t, r) => t + r.quantity, 0)

  const recentMovements = state.history.slice(0, 8)

  // Schedule data
  const scheduleItems = loadSchedule()
  const carryovers = loadCarryovers()
  const scheduleMovements = loadScheduleMovements().slice(0, 10)
  const totalScheduled = scheduleItems.reduce((t, s) => t + s.scheduled_qty, 0)
  const totalShipped = scheduleItems.reduce((t, s) => t + s.shipped_qty, 0)
  const totalCarryover = carryovers.reduce((t, c) => t + c.carryover, 0)

  // Dashboard card values
  const totalScheduledCores = scheduleItems.length
  const completedCores = scheduleItems.filter(s => s.remaining <= 0).length
  const schedulePct = totalScheduled > 0 ? Math.min(100, Math.round((totalShipped / totalScheduled) * 100)) : 0
  let schedulePctColor = "var(--success)"
  if (schedulePct > 0 && schedulePct < 50) schedulePctColor = "var(--warning)"
  else if (schedulePct === 0) schedulePctColor = "var(--text-muted)"

  // Get unique schedule info
  const scheduleInfo = scheduleItems.length > 0 ? scheduleItems[0] : null

  content.innerHTML = `
    <div class="cards-grid">

      <div class="card" data-page="importSchedule">
        <h3>Total Scheduled Cores</h3>
        <div class="card-value">${totalScheduledCores}</div>
      </div>

      <div class="card" data-page="importSchedule">
        <h3>Completed Cores</h3>
        <div class="card-value ${completedCores === totalScheduledCores && totalScheduledCores > 0 ? "success" : ""}">${completedCores}</div>
      </div>

      <div class="card" data-page="rejects">
        <h3>Rejects</h3>
        <div class="card-value ${totalRejects > 0 ? "danger" : "success"}">${totalRejects}</div>
      </div>

      <div class="card" data-page="importSchedule">
        <h3>Schedule Progress</h3>
        <div class="card-value" style="color:${schedulePctColor};">${schedulePct}%</div>
        <div class="schedule-progress-bar" style="width:100%;margin-top:8px;">
          <div class="schedule-progress-fill" style="width:${schedulePct}%;background:${schedulePctColor};"></div>
        </div>
      </div>

    </div>

    <div class="quick-actions">
      <h3 class="section-title">Quick Actions</h3>
      <div class="actions-row">
        <button class="action-btn" data-page="goodsIn">
          <span class="action-icon">📥</span>
          <span>Goods In</span>
        </button>
        <button class="action-btn" data-page="shipping">
          <span class="action-icon">🚚</span>
          <span>Shipping</span>
        </button>
        <button class="action-btn" data-page="rejects">
          <span class="action-icon">❌</span>
          <span>Rejects</span>
        </button>
        <button class="action-btn" data-page="adjustments">
          <span class="action-icon">⚖️</span>
          <span>Adjustments</span>
        </button>
        <button class="action-btn" data-page="stock">
          <span class="action-icon">📦</span>
          <span>View Stock</span>
        </button>
        <button class="action-btn" data-page="importSchedule">
          <span class="action-icon">📅</span>
          <span>Import Schedule</span>
        </button>
        <button class="action-btn" data-page="history">
          <span class="action-icon">📋</span>
          <span>History</span>
        </button>
      </div>
    </div>

    ${scheduleItems.length > 0 ? `
    <div class="schedule-section">
      <h3 class="section-title">
        Schedule Progress
        ${scheduleInfo ? `<span style="font-size:12px;font-weight:400;color:var(--text-muted);">${scheduleInfo.scheduleDate || scheduleInfo.weekNumber || ""}</span>` : ""}
        — <span style="font-size:14px;font-weight:600;color:var(--text);">${totalShipped}/${totalScheduled} shipped</span>
        ${totalCarryover > 0 ? `<span style="font-size:12px;font-weight:400;color:var(--warning);"> (${totalCarryover} carryover pending)</span>` : ""}
      </h3>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Core</th>
              <th>Description</th>
              <th>Scheduled</th>
              <th>Shipped</th>
              <th>Remaining</th>
              <th>Carryover</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleItems.map(item => {
              const pct = item.scheduled_qty > 0 ? Math.min(100, Math.round((item.shipped_qty / item.scheduled_qty) * 100)) : 0
              let barColor = "var(--success)"
              if (pct > 0 && pct < 50) barColor = "var(--warning)"
              else if (pct === 0) barColor = "var(--text-muted)"
              return `
                <tr>
                  <td><strong>${item.core}</strong></td>
                  <td>${item.description}</td>
                  <td>${item.scheduled_qty}</td>
                  <td>${item.shipped_qty}</td>
                  <td>${item.remaining}</td>
                  <td>${item.carryover > 0 ? `+${item.carryover}` : "-"}</td>
                  <td>
                    <div class="schedule-progress-bar">
                      <div class="schedule-progress-fill" style="width:${pct}%;background:${barColor};"></div>
                    </div>
                    <span class="schedule-progress-label">${pct}%</span>
                  </td>
                </tr>`
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
    ` : `
    <div class="schedule-section">
      <h3 class="section-title">Schedule</h3>
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <h3>No Schedule Imported</h3>
        <p>Upload a CSV schedule to see progress bars here.</p>
        <button class="action-btn" data-page="importSchedule" style="margin-top:12px;width:auto;padding:10px 24px;">
          <span class="action-icon">📅</span>
          <span>Import Schedule</span>
        </button>
      </div>
    </div>
    `}

    ${carryovers.length > 0 ? `
    <div class="carryover-section">
      <h3 class="section-title">Pending Carryovers</h3>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Core</th>
              <th>Carryover</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${carryovers.map(c => `
              <tr>
                <td><strong></strong></td>
                <td class="qty-low">+${c.carryover}</td>
                <td>${c.lastUpdated}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    ` : ""}

    ${scheduleMovements.length > 0 ? `
    <div class="carryover-section">
      <h3 class="section-title">Schedule Movements</h3>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Core</th>
              <th>Qty</th>
              <th>User</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleMovements.map(m => {
              let badge = "badge-info"
              if (m.type === "SHIP") badge = "badge-success"
              else if (m.type === "CARRYOVER_IN") badge = "badge-warning"
              else if (m.type === "CARRYOVER_OUT") badge = "badge-danger"
              return `
                <tr>
                  <td>${m.date}</td>
                  <td><span class="badge ${badge}">${m.type}</span></td>
                  <td><strong></strong></td>
                  <td>${m.quantity}</td>
                  <td>${m.user}</td>
                  <td>${m.detail}</td>
                </tr>`
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
    ` : ""}

    ${recentMovements.length > 0 ? `
    <div class="recent-section">
      <h3 class="section-title">Recent Stock Activity</h3>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Core</th>
              <th>Qty</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${recentMovements.map(h => {
              let typeBadge = "badge-info"
              if (h.type === "IN") typeBadge = "badge-success"
              else if (h.type === "OUT") typeBadge = "badge-warning"
              else if (h.type === "REJECT") typeBadge = "badge-danger"
              const detail = h.reason || h.destination || h.department || "-"
              return `
                <tr>
                  <td>${h.date}</td>
                  <td><span class="badge ${typeBadge}">${h.type}</span></td>
                  <td><strong>${h.core}</strong></td>
                  <td>${h.quantity > 0 ? "+" : ""}${h.quantity}</td>
                  <td>${detail}</td>
                </tr>`
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
    ` : ""}
  `

  content.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const page = card.getAttribute("data-page")
      if (page) navigate(page as any)
    })
  })

  content.querySelectorAll(".action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.getAttribute("data-page")
      if (page) navigate(page as any)
    })
  })

  if (state.stock.length === 0) {
    content.querySelector(".recent-section")?.remove()
    content.querySelector(".quick-actions")?.remove()
    content.querySelector(".schedule-section")?.remove()
    content.querySelector(".carryover-section")?.remove()
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>No Data Yet</h3>
        <p>Stock data will appear here once items are added.</p>
      </div>
    `
  }

  return Layout("Dashboard", content)
}