import { DemoState, Shipment, Lane, Carrier } from "../data/schema"
import { clamp } from "../format"

export type RetenderOption = {
  carrierId: string
  expCost: number
  expLateProb: number
  expPenalty: number
  expTotal: number
  rationale: string
}

export function computeShipmentRetenderOptions(state: DemoState, shipmentId: string): { shipment?: Shipment; lane?: Lane; options: RetenderOption[] } {
  const sh = state.shipments.find(s=>s.id===shipmentId)
  if (!sh) return { options: [] }
  const lane = state.lanes.find(l=>l.id===sh.laneId)
  if (!lane) return { shipment: sh, options: [] }
  const sku = state.skus.find(s=>s.id===sh.skuId)!

  const baseCost = lane.miles * lane.baseCostPerMile * state.fuelIndex
  const priorityPenaltyPerDay = sh.priority === "PROTECT" ? 4200 : 1600
  const estDaysLateIfLate = sh.priority === "PROTECT" ? 1.3 : 1.1

  function lateProb(car: Carrier): number {
    let p = 1 - car.baseOnTime
    if (state.scenario.carrierDisruption) p += 0.08
    if (lane.mode === "INTERMODAL") p += 0.03
    if (sh.priority === "PROTECT") p += 0.01
    return clamp(p, 0.03, 0.35)
  }

  const opts: RetenderOption[] = state.carriers.map(c=>{
    const lp = lateProb(c)
    const cost = baseCost * c.baseRateAdj
    const penalty = lp * priorityPenaltyPerDay * estDaysLateIfLate
    const total = cost + penalty
    return {
      carrierId: c.id,
      expCost: Math.round(cost),
      expLateProb: lp,
      expPenalty: Math.round(penalty),
      expTotal: Math.round(total),
      rationale: `Expected total = freight (${Math.round(cost)}) + risk-adjusted penalty (${Math.round(penalty)}).`
    }
  }).sort((a,b)=>a.expTotal-b.expTotal)

  // Add a “partial expedite” option (synthetic)
  opts.push({
    carrierId: "EXPEDITE",
    expCost: Math.round(baseCost * 1.55),
    expLateProb: 0.05,
    expPenalty: Math.round(0.05 * priorityPenaltyPerDay),
    expTotal: Math.round(baseCost * 1.55 + 0.05 * priorityPenaltyPerDay),
    rationale: "Use premium expedite for a protected subset; caps OTIF risk at higher freight cost."
  })

  return { shipment: sh, lane, options: opts.slice(0, 5) }
}

export function applyRetender(state: DemoState, shipmentId: string, newCarrierId: string): DemoState {
  const shipments = state.shipments.map(s=>{
    if (s.id !== shipmentId) return s
    if (newCarrierId === "EXPEDITE") return { ...s, carrierId: "K3", lateByDays: 0, status: "IN_TRANSIT" }
    return { ...s, carrierId: newCarrierId, lateByDays: 0, status: "IN_TRANSIT" }
  })
  return { ...state, shipments }
}
