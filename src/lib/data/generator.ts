import { DemoState, Node, SKU, Carrier, Lane, Shipment, InventoryPosition, DemandPoint, Region } from "./schema"
import { seededRng, pick } from "../utils"
import { uid } from "../utils"

const REGIONS: Region[] = ["Northeast","Southeast","Midwest","Southwest","West"]

function randn(rng: ()=>number): number {
  // Box-Muller
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0*Math.PI*v)
}

export function generateDemoState(seed = 42): DemoState {
  const rng = seededRng(seed)
  const today = 0

  const nodes: Node[] = [
    { id:"P1", name:"Plant — Midwest", type:"PLANT", region:"Midwest", lat:41.9, lon:-87.6 },
    { id:"P2", name:"Plant — Southeast", type:"PLANT", region:"Southeast", lat:33.7, lon:-84.4 },
    { id:"D1", name:"DC — Northeast", type:"DC", region:"Northeast", lat:40.7, lon:-74.0 },
    { id:"D2", name:"DC — Southeast", type:"DC", region:"Southeast", lat:33.7, lon:-84.4 },
    { id:"D3", name:"DC — Midwest", type:"DC", region:"Midwest", lat:41.9, lon:-87.6 },
    { id:"D4", name:"DC — Southwest", type:"DC", region:"Southwest", lat:32.8, lon:-96.8 },
    { id:"D5", name:"DC — West", type:"DC", region:"West", lat:34.0, lon:-118.2 },
    // Customer regions (represent aggregated demand centers)
    ...REGIONS.map((r, i)=>({
      id:`C${i+1}`, name:`Customers — ${r}`, type:"CUSTOMER" as const, region:r,
      lat: 37 + (rng()-0.5)*6, lon: -95 + (rng()-0.5)*18
    }))
  ]

  const skus: SKU[] = [
    { id:"S1", name:"Disinfecting Wipes (Case)", family:"Cleaning", unit:"case", marginPerCase: 14, cubePerCase: 0.6, perishRisk: 0.05 },
    { id:"S2", name:"Bleach (Case)", family:"Cleaning", unit:"case", marginPerCase: 10, cubePerCase: 0.9, perishRisk: 0.02 },
    { id:"S3", name:"Trash Bags (Case)", family:"Bags", unit:"case", marginPerCase: 9, cubePerCase: 1.1, perishRisk: 0.01 },
    { id:"S4", name:"Water Filters (Case)", family:"Filtration", unit:"case", marginPerCase: 18, cubePerCase: 0.4, perishRisk: 0.03 },
    { id:"S5", name:"Salad Dressing (Case)", family:"Condiments", unit:"case", marginPerCase: 7, cubePerCase: 0.7, perishRisk: 0.12 }
  ]

  const carriers: Carrier[] = [
    { id:"K1", name:"National Trucking Co.", baseOnTime: 0.93, baseRateAdj: 1.00 },
    { id:"K2", name:"Value Freight", baseOnTime: 0.88, baseRateAdj: 0.92 },
    { id:"K3", name:"Premium Express", baseOnTime: 0.96, baseRateAdj: 1.12 },
    { id:"K4", name:"Intermodal Partner", baseOnTime: 0.90, baseRateAdj: 0.86 }
  ]

  // Lanes: Plants -> DCs, DCs -> Customer regions
  const lanes: Lane[] = []
  function addLane(o: string, d: string, miles: number, mode: "TRUCK"|"INTERMODAL") {
    lanes.push({
      id: uid("L"),
      originId: o,
      destId: d,
      miles,
      baseCostPerMile: mode === "TRUCK" ? 2.4 + rng()*0.5 : 1.6 + rng()*0.4,
      mode
    })
  }

  const plantIds = nodes.filter(n=>n.type==="PLANT").map(n=>n.id)
  const dcIds = nodes.filter(n=>n.type==="DC").map(n=>n.id)
  const custIds = nodes.filter(n=>n.type==="CUSTOMER").map(n=>n.id)

  for (const p of plantIds) {
    for (const d of dcIds) {
      const miles = 350 + Math.floor(rng()*1500)
      addLane(p, d, miles, rng() < 0.25 ? "INTERMODAL" : "TRUCK")
    }
  }
  for (const d of dcIds) {
    for (const c of custIds) {
      const miles = 120 + Math.floor(rng()*1100)
      addLane(d, c, miles, rng() < 0.12 ? "INTERMODAL" : "TRUCK")
    }
  }

  // Inter-DC pooling / transfer lanes (to mimic rebalancing moves)
  const dcPairs: Array<[string, string]> = [
    ["D1","D3"], // Northeast ↔ Midwest
    ["D2","D3"], // Southeast ↔ Midwest
    ["D3","D4"], // Midwest ↔ Southwest
    ["D4","D5"], // Southwest ↔ West
    ["D2","D4"], // Southeast ↔ Southwest
    ["D1","D2"], // Northeast ↔ Southeast
  ]
  for (const [a,b] of dcPairs) {
    const miles = 260 + Math.floor(rng()*1400)
    const mode = rng() < 0.18 ? "INTERMODAL" : "TRUCK"
    addLane(a, b, miles, mode)
    addLane(b, a, miles + Math.floor(rng()*90), mode)
  }


  const fuelIndex = 0.95 + rng()*0.35

  // Demand history (last 28 days)
  const demandHistory: DemandPoint[] = []
  for (let day = -28; day <= -1; day++) {
    for (const r of REGIONS) {
      for (const sku of skus) {
        const base = sku.family === "Cleaning" ? 180 : sku.family === "Bags" ? 140 : sku.family === "Filtration" ? 90 : 110
        const regionAdj = r === "Northeast" ? 1.08 : r === "West" ? 1.02 : r === "Southeast" ? 1.00 : r === "Midwest" ? 0.98 : 0.95
        const dow = ((day % 7)+7)%7
        const weekly = dow === 0 ? 1.18 : dow === 5 ? 0.92 : 1.00
        const noise = 0.12 * randn(rng)
        const demand = Math.max(0, Math.round(base * regionAdj * weekly * (1 + noise)))
        demandHistory.push({ day, region: r, skuId: sku.id, demandCases: demand })
      }
    }
  }

  // Inventory positions at DCs (multi-echelon)
  const inventory: InventoryPosition[] = []
  const dcNodes = nodes.filter(n=>n.type==="DC")
  for (const dc of dcNodes) {
    for (const sku of skus) {
      const avg = avgDemand(demandHistory, dc.region, sku.id)
      const targetDaysCover = sku.family === "Cleaning" ? 16 : sku.family === "Bags" ? 14 : sku.family === "Filtration" ? 18 : 12
      const onHand = Math.max(0, Math.round(avg * (targetDaysCover/7) * (0.6 + rng()*1.1)))
      const onOrder = Math.round(avg * (0.3 + rng()*0.7))
      inventory.push({
        nodeId: dc.id, skuId: sku.id,
        onHand, onOrder, inTransit: 0,
        targetDaysCover
      })
    }
  }

  // Shipments in transit (create 50 shipments)
  const shipments: Shipment[] = []
  const laneById = new Map(lanes.map(l=>[l.id,l]))
  function etaForLane(lane: Lane): number {
    const baseDays = lane.mode === "TRUCK" ? lane.miles/550 : lane.miles/450
    return Math.max(1, Math.round(baseDays))
  }

  for (let i=0; i<50; i++) {
    const tier = rng() < 0.22 ? "PROTECT" : "STANDARD"
    const sku = pick(skus, rng())
    // 55% DC->customer, 35% plant->DC, 10% inter-DC pooling
    const rPick = rng()
    const desired =
      rPick < 0.55 ? "DC_TO_CUST" :
      rPick < 0.90 ? "PLANT_TO_DC" :
      "DC_TO_DC"

    const lanePool = lanes.filter(l=>{
      const o = nodes.find(n=>n.id===l.originId)!
      const d = nodes.find(n=>n.id===l.destId)!
      if (desired === "DC_TO_CUST") return o.type==="DC" && d.type==="CUSTOMER"
      if (desired === "PLANT_TO_DC") return o.type==="PLANT" && d.type==="DC"
      return o.type==="DC" && d.type==="DC"
    })
    const lane = pick((lanePool.length ? lanePool : lanes), rng)
    const carrier = pick(carriers, rng())
    const shipDay = -Math.floor(rng()*3) // last 0..2 days
    const eta = etaForLane(lane)
    const etaDay = shipDay + eta
    const lateShock = rng() < (0.08 + (tier==="PROTECT"?0.03:0)) ? 1 : 0
    const lateBy = lateShock ? 1 + Math.floor(rng()*2) : 0
    const status = etaDay + lateBy < today ? "DELIVERED" : shipDay < today ? (lateBy>0 && etaDay < today ? "LATE" : "IN_TRANSIT") : "PLANNED"
    shipments.push({
      id: uid("SHP"),
      laneId: lane.id,
      carrierId: carrier.id,
      skuId: sku.id,
      qtyCases: 120 + Math.floor(rng()*420),
      shipDay, etaDay,
      status,
      lateByDays: lateBy,
      priority: tier
    })
  }

  // Update inventory inTransit counts by DC node destinations
  for (const sh of shipments) {
    const lane = laneById.get(sh.laneId)!
    const dest = nodes.find(n=>n.id===lane.destId)!
    if (dest.type === "DC" && (sh.status === "IN_TRANSIT" || sh.status === "LATE")) {
      const inv = inventory.find(x=>x.nodeId===dest.id && x.skuId===sh.skuId)
      if (inv) inv.inTransit += sh.qtyCases
    }
  }

  return {
    seed,
    today,
    fuelIndex,
    nodes,
    skus,
    carriers,
    lanes,
    shipments,
    inventory,
    demandHistory,
    scenario: { dcOutage:false, carrierDisruption:false, demandSpike:false, cyberDegradedMode:false }
  }
}

function avgDemand(hist: DemandPoint[], region: Region, skuId: string): number {
  const xs = hist.filter(d=>d.region===region && d.skuId===skuId).map(d=>d.demandCases)
  const mean = xs.reduce((a,b)=>a+b,0) / Math.max(1, xs.length)
  // average per week
  return mean * 7
}
