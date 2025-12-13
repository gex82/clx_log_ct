import { DemoState, InventoryPosition, Node, Lane, Shipment } from "../data/schema"
import { forecastDemand } from "./demand"
import { uid } from "../utils"

export type Transfer = {
  fromNodeId: string
  toNodeId: string
  skuId: string
  qtyCases: number
  rationale: string
  estValue: number // gross benefit ($)
  estTransferCost: number // $ cost to move
  estTransitDays: number
  netValue: number // estValue - estTransferCost
}

function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3958.8 // earth radius miles
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function etaForLane(lane: Lane): number {
  const baseDays = lane.mode === "TRUCK" ? lane.miles / 520 : lane.miles / 430
  return Math.max(1, Math.round(baseDays))
}

export function proposeRebalancing(state: DemoState, maxTransfers = 12, onlySkuId?: string): Transfer[] {
  const nodesById = new Map(state.nodes.map((n) => [n.id, n]))
  const invByKey = new Map<string, InventoryPosition>()
  for (const inv of state.inventory) invByKey.set(`${inv.nodeId}|${inv.skuId}`, inv)

  const laneByPair = new Map<string, Lane>()
  for (const l of state.lanes) laneByPair.set(`${l.originId}|${l.destId}`, l)

  function daysCover(inv: InventoryPosition, node: Node): number {
    const fc = forecastDemand(state.demandHistory, node.region, inv.skuId)
    const daily = Math.max(1, fc.next7d / 7)
    return (inv.onHand + inv.inTransit) / daily
  }

  const dcs = state.nodes.filter((n) => n.type === "DC")
  const transfers: Transfer[] = []

  const skuList = onlySkuId ? state.skus.filter((s) => s.id === onlySkuId) : state.skus

  // For each SKU: build donor/receiver lists
  for (const sku of skuList) {
    const donors: { node: Node; inv: InventoryPosition; doc: number; surplus: number }[] = []
    const recvs: { node: Node; inv: InventoryPosition; doc: number; deficit: number }[] = []

    for (const dc of dcs) {
      const inv = invByKey.get(`${dc.id}|${sku.id}`)
      if (!inv) continue

      const fc = forecastDemand(state.demandHistory, dc.region, sku.id)
      const daily = Math.max(1, fc.next7d / 7)
      const doc = daysCover(inv, dc)
      const target = inv.targetDaysCover

      // buffer bands: allow slack above target before considered "surplus"
      const surplus = Math.max(0, Math.floor((doc - (target + 8)) * daily))
      const deficit = Math.max(0, Math.floor((target - doc) * daily))

      if (surplus > 60) donors.push({ node: dc, inv, doc, surplus })
      if (deficit > 60) recvs.push({ node: dc, inv, doc, deficit })
    }

    donors.sort((a, b) => b.surplus - a.surplus)
    recvs.sort((a, b) => b.deficit - a.deficit)

    let di = 0,
      ri = 0
    while (di < donors.length && ri < recvs.length && transfers.length < maxTransfers) {
      const d = donors[di],
        r = recvs[ri]
      const qty = Math.min(d.surplus, r.deficit, 900)
      if (qty <= 0) break

      const lane = laneByPair.get(`${d.node.id}|${r.node.id}`)
      const miles = lane ? lane.miles : haversineMiles(d.node, r.node)
      const transitDays = lane ? etaForLane(lane) : Math.max(1, Math.round(miles / 520))

      // Transfer cost model:
      // If a lane exists, use lane economics + fuel index; otherwise fallback to $/mile proxy.
      const handling = 180
      const estTransferCost = lane
        ? Math.round(miles * lane.baseCostPerMile * state.fuelIndex + handling)
        : Math.round(miles * 2.25 + handling)

      // Gross benefit: reduce lost sales risk + reduce carrying risk (conservative slice of margin)
      const estValue = Math.round(qty * (sku.marginPerCase * 0.25))
      const netValue = Math.round(estValue - estTransferCost)

      transfers.push({
        fromNodeId: d.node.id,
        toNodeId: r.node.id,
        skuId: sku.id,
        qtyCases: qty,
        estTransitDays: transitDays,
        estTransferCost,
        estValue,
        netValue,
        rationale: `Move surplus cover (donor DOC ${d.doc.toFixed(1)}) to deficit node (receiver DOC ${r.doc.toFixed(1)}).`,
      })

      d.surplus -= qty
      r.deficit -= qty
      if (d.surplus < 60) di++
      if (r.deficit < 60) ri++
    }
  }

  transfers.sort((a, b) => b.netValue - a.netValue)
  return transfers.slice(0, maxTransfers)
}

export function applyTransfers(state: DemoState, transfers: Transfer[]): DemoState {
  const inventory = state.inventory.map((x) => ({ ...x }))
  const invByKey = new Map(inventory.map((i) => [`${i.nodeId}|${i.skuId}`, i] as const))

  const lanes = [...state.lanes]
  const laneByPair = new Map<string, Lane>(lanes.map((l) => [`${l.originId}|${l.destId}`, l] as const))

  const shipments = [...state.shipments]

  for (const t of transfers) {
    const from = invByKey.get(`${t.fromNodeId}|${t.skuId}`)
    const to = invByKey.get(`${t.toNodeId}|${t.skuId}`)
    if (!from || !to) continue

    const qty = Math.min(from.onHand, t.qtyCases)
    if (qty <= 0) continue

    from.onHand -= qty
    to.inTransit += qty

    let lane = laneByPair.get(`${t.fromNodeId}|${t.toNodeId}`)
    if (!lane) {
      // Create a synthetic inter-DC lane on-the-fly (demo convenience).
      const nById = new Map(state.nodes.map((n) => [n.id, n]))
      const a = nById.get(t.fromNodeId)
      const b = nById.get(t.toNodeId)
      if (!a || !b) continue
      const miles = Math.round(haversineMiles(a, b))
      lane = {
        id: uid("L"),
        originId: t.fromNodeId,
        destId: t.toNodeId,
        miles,
        baseCostPerMile: 2.25,
        mode: "TRUCK",
      }
      lanes.push(lane)
      laneByPair.set(`${lane.originId}|${lane.destId}`, lane)
    }

    const eta = t.estTransitDays
    const carrierId =
      lane.mode === "INTERMODAL"
        ? state.carriers.find((c) => c.id === "K4")?.id ?? state.carriers[0].id
        : state.carriers[0].id

    const sh: Shipment = {
      id: uid("SHP"),
      laneId: lane.id,
      carrierId,
      skuId: t.skuId,
      qtyCases: qty,
      shipDay: state.today,
      etaDay: state.today + eta,
      status: "IN_TRANSIT",
      lateByDays: 0,
      priority: "STANDARD",
    }
    shipments.push(sh)
  }

  return { ...state, inventory, lanes, shipments: shipments.slice(-120) }
}
