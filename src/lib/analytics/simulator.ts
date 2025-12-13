import { DemoState, DemandPoint } from "../data/schema"
import { seededRng } from "../utils"
import { clamp } from "../format"

export function stepSimulation(state: DemoState, steps = 1): DemoState {
  // Simple “live” engine:
  // - advance day
  // - realize some shipments delivered / late
  // - consume inventory based on demand
  // - create a few new shipments
  const rng = seededRng(state.seed + state.today * 13 + 7)
  let s: DemoState = { ...state, today: state.today + steps }

  // Scenario modifiers
  const demandMult = s.scenario.demandSpike ? 1.18 : 1.0
  const dcCapMult = s.scenario.dcOutage ? 0.65 : 1.0
  const transitDelayShock = (s.scenario.carrierDisruption ? 0.10 : 0.0) + (s.scenario.cyberDegradedMode ? 0.06 : 0.0)

  // Update shipments status
  const shipments = s.shipments.map(sh=>{
    if (sh.status === "DELIVERED") return sh
    const now = s.today
    const due = sh.etaDay
    const lateProb = clamp(transitDelayShock + (sh.priority==="PROTECT"?0.02:0.0), 0, 0.25)
    if (now >= due) {
      const isLate = rng() < lateProb
      if (isLate) return { ...sh, status:"LATE", lateByDays: Math.max(sh.lateByDays, 1 + Math.floor(rng()*2)) }
      return { ...sh, status:"DELIVERED", lateByDays: 0 }
    }
    return { ...sh, status:"IN_TRANSIT" }
  })

  // Consume inventory at DCs from “today” demand (synthetic daily)
  const demandToday: DemandPoint[] = []
  for (const sku of s.skus) {
    for (const region of ["Northeast","Southeast","Midwest","Southwest","West"] as const) {
      const base = sku.family==="Cleaning"? 200 : sku.family==="Bags"? 150 : sku.family==="Filtration"? 95 : 120
      const regionAdj = region==="Northeast"? 1.07 : region==="West"? 1.02 : region==="Southeast"? 1.00 : region==="Midwest"? 0.98 : 0.96
      const noise = 1 + (rng()-0.5)*0.18
      const d = Math.max(0, Math.round(base*regionAdj*noise*demandMult))
      demandToday.push({ day: s.today, region, skuId: sku.id, demandCases: d })
    }
  }

  const inventory = s.inventory.map(x=>({ ...x }))
  const invByKey = new Map(inventory.map(i=>[`${i.nodeId}|${i.skuId}`, i] as const))
  const dcByRegion = new Map(s.nodes.filter(n=>n.type==="DC").map(dc=>[dc.region, dc]))

  for (const dp of demandToday) {
    const dc = dcByRegion.get(dp.region)
    if (!dc) continue
    const inv = invByKey.get(`${dc.id}|${dp.skuId}`)
    if (!inv) continue
    // Apply DC capacity effect by throttling fulfillment (simulates backlog)
    const fulfilled = Math.round(dp.demandCases * dcCapMult)
    inv.onHand = Math.max(0, inv.onHand - fulfilled)
  }

  // Receive deliveries into inventory
  for (const sh of shipments) {
    if (sh.status !== "DELIVERED") continue
    const lane = s.lanes.find(l=>l.id===sh.laneId)!
    const dest = s.nodes.find(n=>n.id===lane.destId)!
    if (dest.type === "DC") {
      const inv = invByKey.get(`${dest.id}|${sh.skuId}`)
      if (inv) {
        inv.onHand += sh.qtyCases
        inv.inTransit = Math.max(0, inv.inTransit - sh.qtyCases)
      }
    }
  }

  // Append demand history
  const demandHistory = [...s.demandHistory, ...demandToday].slice(-28*5) // keep ~5w

  // Create a few new planned shipments each step
  const newShipments = [...shipments]
  const dcIds = s.nodes.filter(n=>n.type==="DC").map(n=>n.id)
  const plantIds = s.nodes.filter(n=>n.type==="PLANT").map(n=>n.id)
  const custIds = s.nodes.filter(n=>n.type==="CUSTOMER").map(n=>n.id)
  for (let i=0;i<6;i++){
    // 60% DC->customer, 30% plant->DC, 10% inter-DC (pooling / transfer)
    const rPick = rng()
    const kind = rPick < 0.60 ? "DC_TO_CUST" : rPick < 0.90 ? "PLANT_TO_DC" : "DC_TO_DC"

    const sku = s.skus[Math.floor(rng()*s.skus.length)]
    let origin = ""
    let dest = ""

    if (kind === "DC_TO_CUST") {
      origin = dcIds[Math.floor(rng()*dcIds.length)]
      dest = custIds[Math.floor(rng()*custIds.length)]
    } else if (kind === "PLANT_TO_DC") {
      origin = plantIds[Math.floor(rng()*plantIds.length)]
      dest = dcIds[Math.floor(rng()*dcIds.length)]
    } else {
      origin = dcIds[Math.floor(rng()*dcIds.length)]
      dest = dcIds[Math.floor(rng()*dcIds.length)]
      if (dest === origin) dest = dcIds[(dcIds.indexOf(dest)+1) % dcIds.length]
    }

    const lane = s.lanes.find(l=>l.originId===origin && l.destId===dest)
    if (!lane) continue
    const eta = Math.max(1, Math.round((lane.mode==="TRUCK"? lane.miles/550 : lane.miles/450)))
    const pr = rng() < 0.2 ? "PROTECT" : "STANDARD"
    const qty = 120 + Math.floor(rng()*400)
    newShipments.push({
      id: `SHP_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
      laneId: lane.id,
      carrierId: s.carriers[Math.floor(rng()*s.carriers.length)].id,
      skuId: sku.id,
      qtyCases: qty,
      shipDay: s.today,
      etaDay: s.today + eta,
      status: "PLANNED",
      lateByDays: 0,
      priority: pr
    })
  }

  // Fuel index drifts slightly
  const fuelIndex = clamp(s.fuelIndex + (rng()-0.5)*0.02, 0.85, 1.35)

  s = { ...s, shipments: newShipments.slice(-90), inventory, demandHistory, fuelIndex }
  return s
}
