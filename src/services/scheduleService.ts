import * as XLSX from "xlsx"
import { upsertStockItem, type StockItem } from "../supabase"

export type ScheduleItem = {
  core: string
  description: string
  scheduled_qty: number
  shipped_qty: number
  remaining: number
  carryover: number
  scheduleDate: string
  weekNumber: string
}

export type CarryoverRecord = {
  core: string
  carryover: number
  lastUpdated: string
}

export type IgnoredRow = {
  rowNumber: number
  core: string
  description: string
  quantity: string
  reason: string
}

export type ParseResult = {
  items: ScheduleItem[]
  scheduleDate: string
  weekNumber: string
  sheetName: string
  ignored: IgnoredRow[]
}

function readLocal(): ScheduleItem[] {
  const raw = localStorage.getItem("cicSchedule")
  if (!raw) return []
  try {
    return JSON.parse(raw) as ScheduleItem[]
  } catch {
    return []
  }
}

function writeLocal(items: ScheduleItem[]) {
  localStorage.setItem("cicSchedule", JSON.stringify(items))
}

function readCarryovers(): CarryoverRecord[] {
  const raw = localStorage.getItem("cicCarryovers")
  if (!raw) return []
  try {
    return JSON.parse(raw) as CarryoverRecord[]
  } catch {
    return []
  }
}

function writeCarryovers(items: CarryoverRecord[]) {
  localStorage.setItem("cicCarryovers", JSON.stringify(items))
}

export function loadSchedule(): ScheduleItem[] {
  return readLocal()
}

export function saveSchedule(items: ScheduleItem[]): void {
  writeLocal(items)
}

export function loadCarryovers(): CarryoverRecord[] {
  return readCarryovers()
}



export function deleteScheduleItem(core: string): boolean {
  const items = readLocal()
  const idx = items.findIndex(s => s.core === core)
  if (idx === -1) return false
  items.splice(idx, 1)
  writeLocal(items)
  return true
}

export async function createMissingStockItems(items: ScheduleItem[]): Promise<number> {
  const raw = localStorage.getItem("cicStock")
  let stock: StockItem[] = []
  try { stock = raw ? JSON.parse(raw) : [] } catch { stock = [] }
  const existingCores = new Set(stock.map(s => s.core))
  let created = 0
  for (const item of items) {
    if (!existingCores.has(item.core)) {
      const newItem: StockItem = {
        core: item.core,
        description: item.description || item.core,
        location: "",
        quantity: 0,
        minimum_stock: 0,
        last_updated: new Date().toLocaleString(),
      }
      await upsertStockItem(newItem)
      existingCores.add(item.core)
      created++
    }
  }
  return created
}

/**
 * Read all sheet names from an Excel workbook (.xls, .xlsx, .xlsm).
 */
export function getSheetNames(data: ArrayBuffer): string[] {
  const wb = XLSX.read(data, { type: "array" })
  return wb.SheetNames
}

/**
 * Parse the exact spreadsheet layout:
 *   Cell C2 = Schedule Date / Week Number (free text, keep raw)
 *   Row 20+ (0-indexed 19):
 *     Column C (index 2) = Description
 *     Column D (index 3) = Core Number
 *     Column F (index 5) = Scheduled Order Quantity
 *
 * Import rules:
 *   - Ignore rows where Core Number (col D) is blank.
 *   - Ignore rows where Core Number is exactly "£0".
 *   - Ignore completely empty rows.
 *   - Clean quantity by removing £, $, €, commas, spaces.
 *   - Ignore rows where final quantity is zero or invalid.
 *   - Track every ignored row with a reason.
 */
export function parseScheduleSheet(
  data: ArrayBuffer,
  sheetName: string
): ParseResult {
  const wb = XLSX.read(data, { type: "array" })
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" })

  // Extract cell C2 (row index 1, column index 2)
  let scheduleDate = ""
  let weekNumber = ""
  if (rows.length > 1 && rows[1] && rows[1].length > 2) {
    const raw = String(rows[1][2] || "").trim()
    scheduleDate = raw
    weekNumber = raw
  }

  const items: ScheduleItem[] = []
  const ignored: IgnoredRow[] = []
  const carryovers = readCarryovers()

  // Start from row 20 (0-indexed 19)
  for (let i = 19; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const core = String(row[3] || "").trim() // Column D
    const description = String(row[2] || "").trim() // Column C
    const qtyRaw = String(row[5] || "0") // Column F

    // Check for completely empty row
    const isEmpty = !core && !description && !qtyRaw.trim()
    if (isEmpty) {
      ignored.push({
        rowNumber: i + 1,
        core: "",
        description: "",
        quantity: "",
        reason: "Empty row",
      })
      continue
    }

    // Ignore if core is blank
    if (!core) {
      ignored.push({
        rowNumber: i + 1,
        core: "",
        description,
        quantity: qtyRaw,
        reason: "Core number is blank",
      })
      continue
    }

    // Ignore if core is exactly "£0"
    if (core === "£0") {
      ignored.push({
        rowNumber: i + 1,
        core,
        description,
        quantity: qtyRaw,
        reason: 'Core number is "£0"',
      })
      continue
    }

    // Clean quantity: remove currency symbols, commas, spaces
    const qtyStr = qtyRaw.replace(/[£$€,\s]/g, "").trim()
    const qty = Number(qtyStr)

    if (isNaN(qty) || qty <= 0) {
      ignored.push({
        rowNumber: i + 1,
        core,
        description,
        quantity: qtyRaw,
        reason: `Invalid or zero quantity: "${qtyRaw}"`,
      })
      continue
    }

    // Check for pending carryover for this core
    let carryoverApplied = 0
    const carryIdx = carryovers.findIndex(c => c.core === core)
    if (carryIdx >= 0) {
      carryoverApplied = carryovers[carryIdx].carryover
      carryovers.splice(carryIdx, 1)
    }

    const rawScheduled = Math.floor(qty)
    const effectiveScheduled = rawScheduled + carryoverApplied

    items.push({
      core,
      description,
      scheduled_qty: rawScheduled,
      shipped_qty: 0,
      remaining: effectiveScheduled,
      carryover: carryoverApplied,
      scheduleDate,
      weekNumber,
    })
  }

  // Save updated carryovers (removed applied ones)
  writeCarryovers(carryovers)

  // Replace existing schedule entirely (no customer to filter by)
  writeLocal(items)

  return { items, scheduleDate, weekNumber, sheetName, ignored }
}

/**
 * Record a shipment. Deduct from schedule, handle carryover.
 * If shipped > remaining for a core, excess becomes carryover for that core.
 */
export function recordShipment(
  core: string,
  qty: number,
  loggedUser: string
) {
  const items = readLocal()
  const idx = items.findIndex(s => s.core === core)
  if (idx === -1) return

  const item = items[idx]
  const toShip = Math.min(qty, item.remaining)
  item.shipped_qty += toShip
  item.remaining -= toShip

  // Over-delivery: if shipped qty > remaining before, excess becomes carryover
  if (qty > toShip) {
    const excess = qty - toShip
    item.shipped_qty += excess
    const carryovers = readCarryovers()
    const existingCarry = carryovers.findIndex(c => c.core === core)
    if (existingCarry >= 0) {
      carryovers[existingCarry].carryover += excess
      carryovers[existingCarry].lastUpdated = new Date().toLocaleString()
    } else {
      carryovers.push({
        core,
        carryover: excess,
        lastUpdated: new Date().toLocaleString(),
      })
    }
    writeCarryovers(carryovers)
  }

  writeLocal(items)

  // Also store a movement record
  const movements = readMovements()
  movements.unshift({
    type: "SHIP",
    core,
    quantity: qty,
    user: loggedUser,
    date: new Date().toLocaleString(),
    detail: `Shipped ${qty} to schedule`,
  })
  writeMovements(movements)
}

export type ScheduleMovement = {
  type: "SHIP" | "CARRYOVER_IN" | "CARRYOVER_OUT" | "ADJUST"
  core: string
  quantity: number
  user: string
  date: string
  detail: string
}

function readMovements(): ScheduleMovement[] {
  const raw = localStorage.getItem("cicScheduleMovements")
  if (!raw) return []
  try {
    return JSON.parse(raw) as ScheduleMovement[]
  } catch {
    return []
  }
}

function writeMovements(items: ScheduleMovement[]) {
  localStorage.setItem("cicScheduleMovements", JSON.stringify(items))
}

export function loadScheduleMovements(): ScheduleMovement[] {
  return readMovements()
}

/**
 * Adjust schedule (add or remove scheduled quantity with reason).
 */
export function adjustSchedule(
  core: string,
  adjustmentType: "ADD" | "REMOVE",
  quantity: number,
  reason: string,
  loggedUser: string
) {
  const items = readLocal()
  const idx = items.findIndex(s => s.core === core)
  if (idx === -1) return false

  const item = items[idx]
  if (adjustmentType === "ADD") {
    item.scheduled_qty += quantity
    item.remaining += quantity
  } else {
    if (item.remaining < quantity) return false
    item.scheduled_qty -= quantity
    item.remaining -= quantity
  }

  writeLocal(items)

  const movements = readMovements()
  movements.unshift({
    type: "ADJUST",
    core,
    quantity,
    user: loggedUser,
    date: new Date().toLocaleString(),
    detail: `${adjustmentType} ${quantity} (${reason})`,
  })
  writeMovements(movements)

  return true
}

/**
 * Record a carryover movement (CARRYOVER_IN / CARRYOVER_OUT).
 */
export function recordCarryoverMovement(
  core: string,
  qty: number,
  direction: "CARRYOVER_IN" | "CARRYOVER_OUT",
  loggedUser: string,
  reason: string = ""
) {
  const carryovers = readCarryovers()
  const carryIdx = carryovers.findIndex(c => c.core === core)

  if (direction === "CARRYOVER_IN") {
    if (carryIdx >= 0) {
      carryovers[carryIdx].carryover += qty
      carryovers[carryIdx].lastUpdated = new Date().toLocaleString()
    } else {
      carryovers.push({
        core,
        carryover: qty,
        lastUpdated: new Date().toLocaleString(),
      })
    }
  } else {
    if (carryIdx >= 0) {
      carryovers[carryIdx].carryover -= qty
      carryovers[carryIdx].lastUpdated = new Date().toLocaleString()
      if (carryovers[carryIdx].carryover <= 0) {
        carryovers.splice(carryIdx, 1)
      }
    }
  }
  writeCarryovers(carryovers)

  const movements = readMovements()
  movements.unshift({
    type: direction,
    core,
    quantity: qty,
    user: loggedUser,
    date: new Date().toLocaleString(),
    detail: reason || direction,
  })
  writeMovements(movements)
}