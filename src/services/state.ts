import type {
  StockItem,
  StockMovement,
  ShipmentRecord,
  RejectRecord,
  AdjustmentRecord,
} from "../supabase"

export type WeeklyTarget = {
  id: string
  core: string
  required: number
  shipped: number
  destination: string
  weekNumber: number
  status: "Complete" | "In Progress" | "Behind"
}

export const state = {
  stock: [] as StockItem[],
  history: [] as StockMovement[],
  shipments: [] as ShipmentRecord[],
  rejects: [] as RejectRecord[],
  adjustments: [] as AdjustmentRecord[],
  weeklyTargets: [] as WeeklyTarget[],
  searchTerm: "",
  lowStockOnly: false,
  zeroStockOnly: false,
}