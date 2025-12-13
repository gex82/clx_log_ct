import { DemoState, InventoryPosition, Node, SKU, Region, Shipment, Lane } from "../data/schema"
import { forecastDemand } from "./demand"
import { clamp } from "../format"

export type ExceptionType = "STOCKOUT_RISK" | "EXCESS_RISK" | "DC_CAPACITY_RISK" | "LATE_SHIPMENT_RISK" | "LANE_COST_OUTLIER"
export type Exception = {
  id: string
  type: ExceptionType
  title: string
  detail: string
  region?: Region
  nodeId?: string
  skuId?: string
  shipmentId?: string
  laneId?: string
  riskScore: number // 0..100
  estValueAtRisk: number // $ per week
  recommendedActions: { label: string; impact: string; executeHint: string }[]
}

export function computeExceptions(state: DemoState): Exception[] {
  const nodesById = new Map(state.nodes.map(n=>[n.id,n]))
  const skuById = new Map(state.skus.map(s=>[s.id,s]))
  const laneById = new Map(state.lanes.map(l=>[l.id,l]))
  const ex: Exception[] = []

  // Inventory risks at DCs
  for (const inv of state.inventory) {
    const node = nodesById.get(inv.nodeId)
    if (!node || node.type !== "DC") continue
    const sku = skuById.get(inv.skuId)!
    const fc = forecastDemand(state.demandHistory, node.region, inv.skuId)
    const daily = Math.max(1, fc.next7d / 7)
    const doc = (inv.onHand + inv.inTransit) / daily
    const short = inv.targetDaysCover - doc
    const excess = doc - (inv.targetDaysCover + 10)

    const valuePerCase = sku.marginPerCase
    const weeklyDemand = fc.next7d
    const lostSalesRisk = clamp(short / inv.targetDaysCover, 0, 1)
    const excessRisk = clamp(excess / (inv.targetDaysCover+10), 0, 1)

    if (doc < Math.max(6, inv.targetDaysCover*0.55)) {
      const risk = clamp(55 + 45*lostSalesRisk + sku.perishRisk*10, 0, 100)
      const atRisk = Math.round(weeklyDemand * valuePerCase * (0.25 + 0.75*lostSalesRisk))
      ex.push({
        id: `EX_INV_SO_${inv.nodeId}_${inv.skuId}`,
        type: "STOCKOUT_RISK",
        title: `Stockout risk: ${sku.name} @ ${node.name}`,
        detail: `Days-of-cover ${doc.toFixed(1)} vs target ${inv.targetDaysCover}. Forecast next 7d: ${weeklyDemand} cases.`,
        region: node.region,
        nodeId: inv.nodeId,
        skuId: inv.skuId,
        riskScore: Math.round(risk),
        estValueAtRisk: atRisk,
        recommendedActions: [
          { label:"Rebalance from donor DC", impact:"Protect service; reduce lost sales risk", executeHint:"RUN_REBALANCE" },
          { label:"Prioritize inbound & wave protect orders", impact:"Reduce stockout probability", executeHint:"PRIORITIZE_INBOUND" }
        ]
      })
    } else if (doc > inv.targetDaysCover + 16) {
      const risk = clamp(45 + 55*excessRisk, 0, 100)
      const carry = Math.round((doc - inv.targetDaysCover) * daily * (0.7 + sku.perishRisk) * 0.6)
      ex.push({
        id: `EX_INV_EX_${inv.nodeId}_${inv.skuId}`,
        type: "EXCESS_RISK",
        title: `Excess risk: ${sku.name} @ ${node.name}`,
        detail: `Days-of-cover ${doc.toFixed(1)} above target ${inv.targetDaysCover}.`,
        region: node.region,
        nodeId: inv.nodeId,
        skuId: inv.skuId,
        riskScore: Math.round(risk),
        estValueAtRisk: carry,
        recommendedActions: [
          { label:"Rebalance to deficit DC", impact:"Reduce carrying + obsolescence risk", executeHint:"RUN_REBALANCE" },
          { label:"Suggest promotion/shift mix", impact:"Pull demand forward; reduce inventory exposure", executeHint:"PROMO_SUGGEST" }
        ]
      })
    }
  }

  // Late shipments risk
  for (const sh of state.shipments) {
    if (sh.status !== "LATE") continue
    const lane = laneById.get(sh.laneId)!
    const origin = nodesById.get(lane.originId)!
    const dest = nodesById.get(lane.destId)!
    const sku = skuById.get(sh.skuId)!
    const basePenalty = sh.priority === "PROTECT" ? 4200 : 1600
    const risk = clamp(60 + sh.lateByDays*12 + (sh.priority==="PROTECT"?10:0), 0, 100)
    ex.push({
      id: `EX_LATE_${sh.id}`,
      type: "LATE_SHIPMENT_RISK",
      title: `Late shipment: ${sku.name} (${sh.priority})`,
      detail: `${origin.name} → ${dest.name}. Late by ${sh.lateByDays}d. Carrier action recommended.`,
      shipmentId: sh.id,
      laneId: sh.laneId,
      riskScore: Math.round(risk),
      estValueAtRisk: Math.round(basePenalty * sh.lateByDays + sku.marginPerCase * sh.qtyCases * 0.05),
      recommendedActions: [
        { label:"Re-tender to alternate carrier", impact:"Recover service; cap penalties", executeHint:"RETENDER" },
        { label:"Expedite partial (protect orders)", impact:"Reduce OTIF hit", executeHint:"EXPEDITE_PARTIAL" }
      ]
    })
  }

  // Lane cost outliers (simple: high miles * high cost per mile)
  const laneCosts = state.lanes.map(l=>{
    const cost = l.miles * l.baseCostPerMile * state.fuelIndex
    return { lane:l, cost }
  }).sort((a,b)=>b.cost-a.cost)
  for (const {lane, cost} of laneCosts.slice(0, 6)) {
    const o = nodesById.get(lane.originId)!
    const d = nodesById.get(lane.destId)!
    const risk = clamp(35 + (cost / 6000)*25, 0, 100)
    ex.push({
      id: `EX_LANE_${lane.id}`,
      type: "LANE_COST_OUTLIER",
      title: `Lane cost outlier: ${o.name} → ${d.name}`,
      detail: `Mode ${lane.mode}. Estimated cost per move: ~$${Math.round(cost)} (fuel index ${state.fuelIndex.toFixed(2)}).`,
      laneId: lane.id,
      riskScore: Math.round(risk),
      estValueAtRisk: Math.round(cost * 0.12),
      recommendedActions: [
        { label:"Consolidate loads / pooling", impact:"Reduce cost-per-case", executeHint:"CONSOLIDATE" },
        { label:"Shift mode or carrier mix", impact:"Lower expected freight cost", executeHint:"MODE_SHIFT" }
      ]
    })
  }

  // Sort by economic severity then risk
  ex.sort((a,b)=> (b.estValueAtRisk - a.estValueAtRisk) || (b.riskScore - a.riskScore))
  return ex.slice(0, 18)
}
