const fs = require('fs');
const p = 'src/services/scheduleService.ts';
let c = fs.readFileSync(p, 'utf8');
// Add import
c = c.replace('import * as XLSX from "xlsu”', 'import * as XLSX from "xlsx"\nimport { upsertStockItem, type StockItem } from "../supabase"');
// Add functions after saveSchedule
const marker = 'export function saveSchedule(items: ScheduleItem[]) {
  writeLocal(items)
}';
const newFns = marker + '\n\nexport function deleteScheduleItem(core: string): boolean {\n  const items = readLocal()\n  const idx = items.findIndex(s => s.core === core)\n  if (idx === -1) return false\n  items.splice(idx, 1)\n  writeLocal(items)\n  return true\n}\n\nexport async function createMissingStockItems(items: ScheduleItem[]): Promise<number> {\n  const raw = localStorage.getItem("cicStock")\n  let stock: StockItem[] = []\n  try { stock = raw ? JSON.parse(raw) : [] } catch { stock = [] }\n  const existingCores = new Set(stock.map(s => s.core))\n  let created = 0\n  for (const item of items) {\n    if (!existingCores.has(item.core)) {\n      const newItem: StockItem = {\n        core: item.core,\n        description: item.description || item.core,\n        location: "",\n        quantity: 0,\n        minimum_stock: 0,\n        last_updated: new Date().toLocaleString(),\n      }\n      await upsertStockItem(newItem)\n      existingCores.add(item.core)\n      created++\n    }\n  }\n  return created\n}';
c = c.replace(marker, newFns);
fs.writeFileSync(p, c, 'utf8');
console.log('deleteScheduleItem:', c.includes('deleteScheduleItem'));
console.log('createMissingStockItems:', c.includes('createMissingStockItems'));
console.log('upsertStockItem:', c.includes('upsertStockItem'));