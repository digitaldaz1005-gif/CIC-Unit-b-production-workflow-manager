import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null

function readLocal<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export type StockItem = {
  id?: number
  core: string
  description: string
  location: string
  quantity: number
  minimum_stock: number
  last_updated: string
  created_at?: string
}

export type StockMovement = {
  id?: number
  type: 'IN' | 'OUT' | 'REJECT' | 'ADJUSTMENT'
  core: string
  quantity: number
  reason?: string
  user?: string
  destination?: string
  department?: string
  date: string
  created_at?: string
}

export type ShipmentRecord = {
  id?: number
  week_number: number
  core: string
  weekly_requirement: number
  quantity_shipped: number
  remaining_to_ship: number
  destination: string
  status: string
  created_at?: string
}

export type RejectRecord = {
  id?: number
  core: string
  quantity: number
  department: string
  reason: string
  operator: string
  date: string
  created_at?: string
}

export type AdjustmentRecord = {
  id?: number
  core: string
  adjustment_type: 'ADD' | 'REMOVE'
  quantity: number
  reason: string
  operator: string
  date: string
  created_at?: string
}

export async function seedDefaultStock() {
  if (!supabase) {
    const existing = readLocal<StockItem[]>('cicStock', [])
    if (existing.length > 0) return
    const defaults: StockItem[] = [
      { core: 'TR12345', description: 'Core A', location: 'A01', quantity: 250, minimum_stock: 50, last_updated: new Date().toLocaleString() },
      { core: 'TR67890', description: 'Core B', location: 'B04', quantity: 125, minimum_stock: 30, last_updated: new Date().toLocaleString() },
      { core: 'TR24680', description: 'Core C', location: 'C02', quantity: 80, minimum_stock: 20, last_updated: new Date().toLocaleString() }
    ]
    writeLocal('cicStock', defaults)
    return
  }

  const { data, error } = await supabase.from('stock').select('id')
  if (error) throw error
  if ((data || []).length > 0) return

  const defaults: StockItem[] = [
    { core: 'TR12345', description: 'Core A', location: 'A01', quantity: 250, minimum_stock: 50, last_updated: new Date().toLocaleString() },
    { core: 'TR67890', description: 'Core B', location: 'B04', quantity: 125, minimum_stock: 30, last_updated: new Date().toLocaleString() },
    { core: 'TR24680', description: 'Core C', location: 'C02', quantity: 80, minimum_stock: 20, last_updated: new Date().toLocaleString() }
  ]

  const { error: insertError } = await supabase.from('stock').insert(defaults)
  if (insertError) throw insertError
}

export async function loadStock(): Promise<StockItem[]> {
  if (!supabase) {
    return readLocal<StockItem[]>('cicStock', [])
  }

  const { data, error } = await supabase.from('stock').select('*').order('quantity', { ascending: true })
  if (error) throw error
  return (data || []) as StockItem[]
}

export async function saveStockItem(item: StockItem) {
  if (!supabase) {
    const current = readLocal<StockItem[]>('cicStock', [])
    const existingIndex = current.findIndex(existing => existing.core === item.core)
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...item, last_updated: item.last_updated }
    } else {
      current.push(item)
    }
    writeLocal('cicStock', current)
    return item
  }

  if (item.id) {
    const { error } = await supabase.from('stock').update(item).eq('id', item.id)
    if (error) throw error
    return item
  }

  const { data, error } = await supabase.from('stock').insert(item).select().single()
  if (error) throw error
  return data as StockItem
}

export async function upsertStockItem(item: StockItem) {
  if (!supabase) {
    const current = readLocal<StockItem[]>('cicStock', [])
    const existingIndex = current.findIndex(existing => existing.core === item.core)
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...item, last_updated: item.last_updated }
    } else {
      current.push(item)
    }
    writeLocal('cicStock', current)
    return item
  }

  const { data, error } = await supabase.from('stock').upsert(item, { onConflict: 'core' }).select().single()
  if (error) throw error
  return data as StockItem
}

export async function addMovement(movement: StockMovement) {
  if (!supabase) {
    const history = readLocal<StockMovement[]>('cicHistory', [])
    history.unshift(movement)
    writeLocal('cicHistory', history)
    return
  }

  const { error } = await supabase.from('history').insert(movement)
  if (error) throw error
}

export async function loadHistory(): Promise<StockMovement[]> {
  if (!supabase) {
    return readLocal<StockMovement[]>('cicHistory', [])
  }

  const { data, error } = await supabase.from('history').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as StockMovement[]
}

export async function loadShipments(): Promise<ShipmentRecord[]> {
  if (!supabase) {
    return readLocal<ShipmentRecord[]>('cicShipments', [])
  }

  const { data, error } = await supabase.from('shipments').select('*').order('week_number', { ascending: true })
  if (error) throw error
  return (data || []) as ShipmentRecord[]
}

export async function saveShipment(record: ShipmentRecord) {
  if (!supabase) {
    const current = readLocal<ShipmentRecord[]>('cicShipments', [])
    const existingIndex = current.findIndex(existing => existing.core === record.core && existing.destination === record.destination && existing.week_number === record.week_number)
    if (existingIndex >= 0) {
      current[existingIndex] = record
    } else {
      current.push(record)
    }
    writeLocal('cicShipments', current)
    return record
  }

  const { data, error } = await supabase.from('shipments').upsert(record, { onConflict: 'core,week_number,destination' }).select().single()
  if (error) throw error
  return data as ShipmentRecord
}

export async function loadRejects(): Promise<RejectRecord[]> {
  if (!supabase) {
    return readLocal<RejectRecord[]>('cicRejects', [])
  }

  const { data, error } = await supabase.from('rejects').select('*').order('date', { ascending: false })
  if (error) throw error
  return (data || []) as RejectRecord[]
}

export async function saveReject(record: RejectRecord) {
  if (!supabase) {
    const current = readLocal<RejectRecord[]>('cicRejects', [])
    current.unshift(record)
    writeLocal('cicRejects', current)
    return record
  }

  const { data, error } = await supabase.from('rejects').insert(record).select().single()
  if (error) throw error
  return data as RejectRecord
}

export async function loadAdjustments(): Promise<AdjustmentRecord[]> {
  if (!supabase) {
    return readLocal<AdjustmentRecord[]>('cicAdjustments', [])
  }

  const { data, error } = await supabase.from('adjustments').select('*').order('date', { ascending: false })
  if (error) throw error
  return (data || []) as AdjustmentRecord[]
}

export async function saveAdjustment(record: AdjustmentRecord) {
  if (!supabase) {
    const current = readLocal<AdjustmentRecord[]>('cicAdjustments', [])
    current.unshift(record)
    writeLocal('cicAdjustments', current)
    return record
  }

  const { data, error } = await supabase.from('adjustments').insert(record).select().single()
  if (error) throw error
  return data as AdjustmentRecord
}
