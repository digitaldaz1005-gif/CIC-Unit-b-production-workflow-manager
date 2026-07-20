import { Layout } from "../layout/layout"
import {
  parseScheduleSheet,
  getSheetNames,
  loadSchedule,
  saveSchedule,
  loadCarryovers,
  deleteScheduleItem,
  createMissingStockItems,
  type ScheduleItem,
  type IgnoredRow,
} from "../services/scheduleService"
import { showToast } from "../components/toast"

export function renderImportSchedule(): HTMLElement {
  const content = document.createElement("div")
  let scheduleItems = loadSchedule()
  let carryovers = loadCarryovers()
  let previewItems: ScheduleItem[] = []
  let previewDate = ""
  let previewSheet = ""
  let previewIgnored: IgnoredRow[] = []
  let sheetNames: string[] = []
  let selectedSheet = ""
  let lastFile: File | null = null
  let lastData: ArrayBuffer | null = null

  const renderTables = () => {
    scheduleItems = loadSchedule()
    carryovers = loadCarryovers()

    // Schedule table
    const scheduleBody = content.querySelector("#scheduleTbody")
    if (scheduleBody) {
      const hasItems = scheduleItems.length > 0
      if (!hasItems) {
        scheduleBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No schedule imported yet. Upload an Excel file to begin.</td></tr>`
      } else {
        scheduleBody.innerHTML = scheduleItems.map(item => {
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
            <td>
              <button class="delete-schedule-btn" data-core="${item.core}" style="background:#e53935;color:#fff;border:none;border-radius:var(--radius-sm);padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;">Delete</button>
            </td>
          </tr>`
        }).join("")
      }
    }

    // Carryover table
    const carryBody = content.querySelector("#carryoverTbody")
    if (carryBody) {
      const hasCarry = carryovers.length > 0
      if (!hasCarry) {
        carryBody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted);">No pending carryovers.</td></tr>`
      } else {
        carryBody.innerHTML = carryovers.map(c => `
          <tr>
            <td><strong>${c.core}</strong></td>
            <td class="qty-low">+${c.carryover}</td>
            <td>${c.lastUpdated}</td>
          </tr>
        `).join("")
      }
    }

    // Preview table
    const previewBody = content.querySelector("#previewTbody")
    if (previewBody) {
      if (previewItems.length === 0) {
        previewBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Upload a file to see preview.</td></tr>`
      } else {
        previewBody.innerHTML = previewItems.slice(0, 10).map(item => `
          <tr>
            <td><strong>${item.core}</strong></td>
            <td>${item.description}</td>
            <td>${item.scheduled_qty}</td>
            <td>${item.carryover > 0 ? `+${item.carryover}` : "-"}</td>
            <td>${item.remaining}</td>
            <td>${item.scheduleDate || "-"}</td>
          </tr>
        `).join("")
      }
    }

    // Preview summary
    const summaryEl = content.querySelector("#previewSummary")
    if (summaryEl) {
      if (previewItems.length === 0 && previewIgnored.length === 0) {
        summaryEl.innerHTML = `<span style="color:var(--text-muted);">No preview yet.</span>`
      } else {
        summaryEl.innerHTML = `
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div><strong>Schedule Date / Week:</strong> ${previewDate || "N/A"}</div>
            <div><strong>Sheet:</strong> ${previewSheet || "N/A"}</div>
            <div><strong>Imported rows:</strong> ${previewItems.length}</div>
            <div><strong>Ignored rows:</strong> ${previewIgnored.length}</div>
          </div>
        `
      }
    }

    // Ignored rows table
    const ignoredBody = content.querySelector("#ignoredTbody")
    if (ignoredBody) {
      if (previewIgnored.length === 0) {
        ignoredBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">No ignored rows.</td></tr>`
      } else {
        ignoredBody.innerHTML = previewIgnored.slice(0, 50).map(r => `
          <tr>
            <td>${r.rowNumber}</td>
            <td>${r.core || "-"}</td>
            <td>${r.description || "-"}</td>
            <td>${r.quantity || "-"}</td>
            <td>${r.reason}</td>
          </tr>
        `).join("")
        if (previewIgnored.length > 50) {
          ignoredBody.innerHTML += `<tr><td colspan="5" style="text-align:center;padding:12px;color:var(--text-muted);">...and ${previewIgnored.length - 50} more ignored rows</td></tr>`
        }
      }
    }

    // Sheet selector
    const sheetSelect = content.querySelector("#sheetSelect") as HTMLSelectElement | null
    if (sheetSelect) {
      if (sheetNames.length === 0) {
        sheetSelect.innerHTML = `<option value="">No file loaded</option>`
      } else {
        sheetSelect.innerHTML = sheetNames.map(name =>
          `<option value="${name}" ${name === selectedSheet ? "selected" : ""}>${name}</option>`
        ).join("")
      }
    }
  }

  content.innerHTML = `
    <div class="form-section">

      <form class="form" id="importForm">
        <div class="form-header">Import Schedule</div>

        <div class="form-group">
          <label>Upload Excel File</label>
          <input id="excelFile" type="file" accept=".xls,.xlsx,.xlsm" required>
          <p style="color:var(--text-muted);font-size:12px;margin-top:4px;">
            Supports .xls, .xlsx and .xlsm. Expects spreadsheet format: Cell C2 = Schedule Date/Week, Row 20+: Col C=Description, Col D=Core, Col F=Scheduled Qty
          </p>
        </div>

        <div class="form-group" id="sheetGroup" style="display:none;">
          <label>Sheet</label>
          <select id="sheetSelect"></select>
          <p style="color:var(--text-muted);font-size:12px;margin-top:4px;">
            Multiple sheets detected. Choose which sheet to import.
          </p>
        </div>

        <div class="form-group" style="flex-direction:row;gap:12px;">
          <button type="button" id="previewBtn" class="secondary" style="flex:0 0 auto;width:auto;padding:12px 20px;background:var(--bg);border:1px solid var(--border-light);color:var(--text);border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;">Preview</button>
          <button type="submit" style="flex:1;">Import Schedule</button>
          <button type="button" id="clearScheduleBtn" class="secondary" style="flex:0 0 auto;width:auto;padding:12px 20px;background:var(--bg);border:1px solid var(--border-light);color:var(--text);border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;">Clear All</button>
        </div>
      </form>

      <div>
        <!-- Preview Summary -->
        <div class="table-container" style="margin-bottom:20px;">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
            Import Preview
          </div>
          <div id="previewSummary" style="padding:16px;">
            <span style="color:var(--text-muted);">No preview yet.</span>
          </div>
        </div>

        <!-- Preview table (first 10 imported rows) -->
        <div class="table-container" style="margin-bottom:20px;">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
            Preview ${previewDate ? `— ${previewDate}` : ""}
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Core</th>
                <th>Description</th>
                <th>Scheduled</th>
                <th>Carryover</th>
                <th>Effective</th>
                <th>Week</th>
              </tr>
            </thead>
            <tbody id="previewTbody">
              <tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Upload a file to see preview.</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Ignored rows -->
        <div class="table-container" style="margin-bottom:20px;">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
            Ignored Rows
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Core</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody id="ignoredTbody">
              <tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">No ignored rows.</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Current Schedule -->
        <div class="table-container" style="margin-bottom:20px;">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
            Current Schedule
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Core</th>
                <th>Description</th>
                <th>Scheduled</th>
                <th>Shipped</th>
                <th>Remaining</th>
                <th>Carryover</th>
                <th>Progress</th><th>Action</th>
              </tr>
            </thead>
            <tbody id="scheduleTbody"></tbody>
          </table>
        </div>

        <!-- Carryovers -->
        <div class="table-container">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;color:var(--text-secondary);font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
            Pending Carryovers (over-delivery)
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Core</th>
                <th>Carryover</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody id="carryoverTbody"></tbody>
          </table>
        </div>
      </div>

    </div>
  `

  // Render initial tables
  renderTables()

  // Delete schedule row (event delegation)
  content.addEventListener("click", (e: Event) => {
    const target = e.target as HTMLElement
    if (target.classList.contains("delete-schedule-btn")) {
      const core = target.dataset.core
      if (!core) return
      if (!confirm(`Delete schedule item for core "${core}"?`)) return
      const ok = deleteScheduleItem(core)
      if (ok) {
        renderTables()
        showToast(`Deleted schedule item for core "${core}".`, "info")
      } else {
        showToast(`Could not find schedule item for core "${core}".`, "error")
      }
    }
  })

  // File input change -> read sheet names
  const fileInput = content.querySelector("#excelFile") as HTMLInputElement
  fileInput.onchange = async () => {
    if (!fileInput.files || fileInput.files.length === 0) return
    const file = fileInput.files[0]
    lastFile = file
    lastData = await file.arrayBuffer()
    sheetNames = getSheetNames(lastData)
    selectedSheet = sheetNames.length > 0 ? sheetNames[0] : ""
    const sheetGroup = content.querySelector("#sheetGroup") as HTMLElement
    if (sheetNames.length > 1) {
      sheetGroup.style.display = ""
    } else {
      sheetGroup.style.display = "none"
    }
    renderTables()
    showToast(`Loaded ${sheetNames.length} sheet(s) from ${file.name}.`, "info")
  }

  // Sheet select change
  const sheetSelect = content.querySelector("#sheetSelect") as HTMLSelectElement
  sheetSelect.onchange = () => {
    selectedSheet = sheetSelect.value
  }

  // Helper to get data + sheet
  const getDataAndSheet = (): { data: ArrayBuffer; sheet: string } | null => {
    if (!lastData) {
      showToast("Please upload an Excel file first.", "error")
      return null
    }
    if (!selectedSheet) {
      showToast("No sheet selected.", "error")
      return null
    }
    return { data: lastData, sheet: selectedSheet }
  }

  // Preview button
  const previewBtn = content.querySelector("#previewBtn") as HTMLButtonElement
  previewBtn.onclick = () => {
    const ctx = getDataAndSheet()
    if (!ctx) return
    try {
      const result = parseScheduleSheet(ctx.data, ctx.sheet)
      previewItems = result.items
      previewDate = result.scheduleDate
      previewSheet = result.sheetName
      previewIgnored = result.ignored
      renderTables()
      showToast(`Preview: ${previewItems.length} item(s) found, ${previewIgnored.length} ignored.`, "info")
    } catch (err: any) {
      showToast(err?.message ?? "Failed to preview schedule.", "error")
    }
  }

  // Clear button
  const clearBtn = content.querySelector("#clearScheduleBtn") as HTMLButtonElement
  clearBtn.onclick = () => {
    saveSchedule([])
    scheduleItems = []
    carryovers = []
    previewItems = []
    previewIgnored = []
    previewDate = ""
    previewSheet = ""
    sheetNames = []
    selectedSheet = ""
    lastFile = null
    lastData = null
    const sheetGroup = content.querySelector("#sheetGroup") as HTMLElement
    sheetGroup.style.display = "none"
    ;(content.querySelector("#excelFile") as HTMLInputElement).value = ""
    renderTables()
    showToast("Schedule cleared.", "info")
  }

  // Form submit
  const form = content.querySelector("#importForm") as HTMLFormElement
  form.onsubmit = async e => {
    e.preventDefault()

    const ctx = getDataAndSheet()
    if (!ctx) return

    const submitBtn = form.querySelector("button[type=submit]")!

    submitBtn.setAttribute("disabled", "true")
    submitBtn.textContent = "Importing..."

    try {
      const result = parseScheduleSheet(ctx.data, ctx.sheet)
      if (result.items.length === 0) {
        showToast("No valid items found in the selected sheet.", "error")
        submitBtn.removeAttribute("disabled")
        submitBtn.textContent = "Import Schedule"
        return
      }

      previewItems = []
      previewIgnored = []
      previewDate = ""
      previewSheet = ""
      const createdCores = await createMissingStockItems(result.items)
      renderTables()
      if (createdCores > 0) {
        showToast(`Imported ${result.items.length} schedule item(s). Week: ${result.scheduleDate || "N/A"}. Created ${createdCores} new core(s) in stock.`, "success")
      } else {
        showToast(`Imported ${result.items.length} schedule item(s). Week: ${result.scheduleDate || "N/A"}. No new cores created.`, "success")
      }
      if (lastFile) {
        ;(content.querySelector("#excelFile") as HTMLInputElement).value = ""
        lastFile = null
        lastData = null
        sheetNames = []
        selectedSheet = ""
        const sheetGroup = content.querySelector("#sheetGroup") as HTMLElement
        sheetGroup.style.display = "none"
      }
    } catch (err: any) {
      showToast(err?.message ?? "Failed to import schedule.", "error")
    } finally {
      submitBtn.removeAttribute("disabled")
      submitBtn.textContent = "Import Schedule"
    }
  }

  return Layout("Import Schedule", content)
}