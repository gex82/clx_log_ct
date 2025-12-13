import { DemoState } from "./data/schema"
import { forecastDemand } from "./analytics/demand"

export type KPIs = {
  otif: number
  fillRate: number
  inventoryTurns: number
  expediteSpend: number
  serviceRiskIndex: number
}

export function computeKPIs(state: DemoState): KPIs {
  const delivered = state.shipments.filter(s=>s.status==="DELIVERED").length
  const late = state.shipments.filter(s=>s.status==="LATE").length
  const totalArrived = delivered + late
  const otif = totalArrived ? delivered/totalArrived : 0.95

  // Fill rate proxy: percent of DC/SKU with DOC above minimum
  const nodesById = new Map(state.nodes.map(n=>[n.id,n]))
  let ok=0, total=0
  for (const inv of state.inventory) {
    const node = nodesById.get(inv.nodeId)
    if (!node || node.type!=="DC") continue
    const fc = forecastDemand(state.demandHistory, node.region, inv.skuId)
    const daily = Math.max(1, fc.next7d/7)
    const doc = (inv.onHand + inv.inTransit) / daily
    total++
    if (doc >= Math.max(6, inv.targetDaysCover*0.55)) ok++
  }
  const fillRate = total ? ok/total : 0.92

  // Inventory turns proxy
  const totalInv = state.inventory.reduce((a,b)=>a + b.onHand, 0)
  const weeklyDemand = state.nodes.filter(n=>n.type==="CUSTOMER").length
  const estWeekly = state.skus.reduce((acc,sku)=>{
    const regs = ["Northeast","Southeast","Midwest","Southwest","West"] as const
    const sum = regs.reduce((x,r)=> x + forecastDemand(state.demandHistory, r, sku.id).next7d, 0)
    return acc + sum
  }, 0)
  const annual = estWeekly * 52
  const turns = totalInv ? annual / (totalInv*1.0) : 9

  const expediteSpend = state.shipments.filter(s=>s.priority==="PROTECT" && s.status==="LATE").length * 18000

  // Service risk index = weighted late + low DOC
  const lowDoc = total - ok
  const risk = Math.min(100, Math.round( (late*3 + lowDoc*2) / Math.max(1,total) * 100 ))
  const serviceRiskIndex = risk/100

  return {
    otif,
    fillRate,
    inventoryTurns: Math.max(3, Math.min(18, turns)),
    expediteSpend,
    serviceRiskIndex
  }
}
