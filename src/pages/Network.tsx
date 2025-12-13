import React, { useMemo, useState } from "react"
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ZAxis, CartesianGrid, Customized } from "recharts"
import Badge from "../components/Badge"
import { useDemoStore } from "../lib/store"
import { forecastDemand } from "../lib/analytics/demand"

type Point = {
  id: string
  name: string
  type: "PLANT" | "DC" | "CUSTOMER"
  region: string
  lat: number
  lon: number
  risk: number
  size: number
}

type Flow = {
  laneId: string
  originId: string
  destId: string
  mode: "TRUCK" | "INTERMODAL"
  miles: number
  qty: number
  kind: "PLANT_TO_DC" | "DC_TO_CUST" | "DC_TO_DC"
}

export default function Network() {
  const { state } = useDemoStore()
  const [show, setShow] = useState<{ plants: boolean; dcs: boolean; customers: boolean; flows: boolean; dc2dc: boolean }>({
    plants: true,
    dcs: true,
    customers: false,
    flows: true,
    dc2dc: true,
  })

  const points = useMemo(() => {
    const invByNode = new Map<string, { lowCover: number }>()

    for (const node of state.nodes) {
      if (node.type !== "DC") continue
      let low = 0
      for (const inv of state.inventory) {
        if (inv.nodeId !== node.id) continue
        const fc = forecastDemand(state.demandHistory, node.region, inv.skuId)
        const daily = Math.max(1, fc.next7d / 7)
        const doc = (inv.onHand + inv.inTransit) / daily
        if (doc < Math.max(6, inv.targetDaysCover * 0.55)) low += 1
      }
      invByNode.set(node.id, { lowCover: low })
    }

    const out: Point[] = []
    for (const n of state.nodes) {
      const r = n.type === "DC" ? (invByNode.get(n.id)?.lowCover ?? 0) : 0
      const risk = Math.min(100, r * 12 + (state.scenario.dcOutage && n.region === "Northeast" && n.type === "DC" ? 25 : 0))
      out.push({
        id: n.id,
        name: n.name,
        type: n.type as any,
        region: n.region,
        lat: n.lat,
        lon: n.lon,
        risk,
        size: n.type === "DC" ? 120 + r * 60 : n.type === "PLANT" ? 110 : 55,
      })
    }

    return out
  }, [state])

  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (p.type === "PLANT") return show.plants
      if (p.type === "DC") return show.dcs
      return show.customers
    })
  }, [points, show])

  const flows = useMemo<Flow[]>(() => {
    const nodesById = new Map(state.nodes.map((n) => [n.id, n]))
    const laneById = new Map(state.lanes.map((l) => [l.id, l]))
    const agg = new Map<string, number>()
    for (const sh of state.shipments) {
      agg.set(sh.laneId, (agg.get(sh.laneId) ?? 0) + sh.qtyCases)
    }
    const out: Flow[] = []
    for (const [laneId, qty] of agg.entries()) {
      const lane = laneById.get(laneId)
      if (!lane) continue
      const o = nodesById.get(lane.originId)
      const d = nodesById.get(lane.destId)
      if (!o || !d) continue
      let kind: Flow["kind"] = "DC_TO_CUST"
      if (o.type === "PLANT" && d.type === "DC") kind = "PLANT_TO_DC"
      if (o.type === "DC" && d.type === "DC") kind = "DC_TO_DC"
      out.push({ laneId, originId: o.id, destId: d.id, mode: lane.mode, miles: lane.miles, qty, kind })
    }
    // prioritize big moves and relevant kinds for demo
    out.sort((a, b) => b.qty - a.qty)
    return out.filter((f) => (show.dc2dc ? true : f.kind !== "DC_TO_DC")).slice(0, 22)
  }, [state.nodes, state.lanes, state.shipments, show.dc2dc])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Plants, DCs, and dominant flows (including inter-DC pooling)</div>
        <h1 className="text-2xl font-semibold mt-1">Network</h1>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">US nodes (synthetic geo)</div>
            <div className="text-sm text-slate-600">Bubble size reflects inventory stress; optional overlay shows high-volume lanes.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle label="Plants" on={show.plants} onClick={() => setShow((s) => ({ ...s, plants: !s.plants }))} />
            <Toggle label="DCs" on={show.dcs} onClick={() => setShow((s) => ({ ...s, dcs: !s.dcs }))} />
            <Toggle label="Customers" on={show.customers} onClick={() => setShow((s) => ({ ...s, customers: !s.customers }))} />
            <Toggle label="Flows" on={show.flows} onClick={() => setShow((s) => ({ ...s, flows: !s.flows }))} />
            <Toggle label="Inter-DC" on={show.dc2dc} onClick={() => setShow((s) => ({ ...s, dc2dc: !s.dc2dc }))} />
            <Badge tone={state.scenario.dcOutage ? "red" : "blue"}>{state.scenario.dcOutage ? "DC outage: ON" : "DC outage: OFF"}</Badge>
          </div>
        </div>

        <div className="mt-4 h-[440px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="lon" name="Longitude" domain={[-125, -66]} tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="lat" name="Latitude" domain={[24, 50]} tick={{ fontSize: 11 }} />
              <ZAxis type="number" dataKey="size" range={[55, 360]} />
              <Tooltip content={<NetworkTooltip />} />
              {show.flows && <Customized component={<FlowLayer points={points} flows={flows} />} />}
              <Scatter data={filteredPoints} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 text-sm text-slate-700">
          <span className="font-semibold">What this answers:</span> where stress concentrates, and which lanes dominate (including pooling moves between DCs).
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      className={`px-3 py-2 rounded-xl text-sm font-medium border ${on ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function NetworkTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as Point
  return (
    <div className="bg-white border border-slate-200 shadow-soft rounded-xl px-3 py-2">
      <div className="text-sm font-semibold">{p.name}</div>
      <div className="text-xs text-slate-600">
        {p.type} • {p.region}
      </div>
      {p.type === "DC" && (
        <div className="mt-1 text-xs text-slate-700">
          Stress score: <span className="font-semibold">{Math.round(p.risk)}</span>/100
        </div>
      )}
    </div>
  )
}

function FlowLayer({ points, flows, ...props }: any) {
  // Recharts passes xAxisMap/yAxisMap/offset to Customized component
  const xAxis = props.xAxisMap?.[Object.keys(props.xAxisMap)[0]]
  const yAxis = props.yAxisMap?.[Object.keys(props.yAxisMap)[0]]
  const offset = props.offset ?? { left: 0, top: 0 }

  const xScale = xAxis?.scale
  const yScale = yAxis?.scale

  const pById = new Map<string, Point>(points.map((p) => [p.id, p]))
  if (!xScale || !yScale) return null

  const maxQty = Math.max(1, ...flows.map((f: Flow) => f.qty))

  return (
    <g>
      {flows.map((f: Flow) => {
        const o = pById.get(f.originId)
        const d = pById.get(f.destId)
        if (!o || !d) return null

        const x1 = offset.left + xScale(o.lon)
        const y1 = offset.top + yScale(o.lat)
        const x2 = offset.left + xScale(d.lon)
        const y2 = offset.top + yScale(d.lat)

        const w = 1 + (f.qty / maxQty) * 3.2
        const opacity = f.kind === "DC_TO_DC" ? 0.55 : 0.40
        const dash = f.mode === "INTERMODAL" ? "6 4" : undefined
        const color = f.kind === "PLANT_TO_DC" ? "#0f172a" : f.kind === "DC_TO_DC" ? "#0ea5a4" : "#64748b"

        return <line key={f.laneId} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeOpacity={opacity} strokeDasharray={dash} />
      })}
    </g>
  )
}
