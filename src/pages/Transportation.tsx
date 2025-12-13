import React, { useMemo, useState } from "react"
import { useDemoStore } from "../lib/store"
import { fmtMoney, fmtPct } from "../lib/format"
import Badge from "../components/Badge"
import SmallLine from "../components/charts/SmallLine"
import { computeShipmentRetenderOptions } from "../lib/analytics/transport"

export default function Transportation() {
  const { state, executeRetender } = useDemoStore()
  const laneById = useMemo(()=>new Map(state.lanes.map(l=>[l.id,l])), [state.lanes])
  const nodeById = useMemo(()=>new Map(state.nodes.map(n=>[n.id,n])), [state.nodes])

  const shipments = useMemo(()=> state.shipments.filter(s=>s.status==="IN_TRANSIT" || s.status==="LATE").slice(0, 18), [state.shipments])
  const [selected, setSelected] = useState(shipments[0]?.id ?? "")

  const detail = useMemo(()=> selected ? computeShipmentRetenderOptions(state, selected) : null, [state, selected])

  // synthetic trend of fuel index
  const fuelTrend = useMemo(()=>{
    const xs = []
    for (let i=12;i>=0;i--){
      xs.push({ t: `-${i}`, v: Math.round((state.fuelIndex + (i-6)*0.008)*100)/100 })
    }
    return xs
  }, [state.fuelIndex])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Optimize lanes, carriers, and recovery actions</div>
        <h1 className="text-2xl font-semibold mt-1">Transportation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="font-semibold">Fuel index trend (proxy)</div>
          <div className="text-sm text-slate-600">Freight cost sensitivity for lane economics.</div>
          <SmallLine data={fuelTrend} xKey="t" yKey="v" />
        </div>

        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="font-semibold">Carrier scorecard</div>
          <div className="mt-3 space-y-2">
            {state.carriers.map(c=>(
              <div key={c.id} className="flex items-center justify-between">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.baseOnTime>0.94 ? "green" : c.baseOnTime>0.9 ? "amber":"red"}>{fmtPct(c.baseOnTime)} on-time</Badge>
                  <Badge tone="blue">{c.baseRateAdj.toFixed(2)}x rate</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">Used in expected total cost: freight + risk-adjusted penalty.</div>
        </div>

        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="font-semibold">At-risk shipments</div>
          <div className="text-sm text-slate-600">Click one to simulate re-tender decisions.</div>
          <div className="mt-3 space-y-2 max-h-56 overflow-auto">
            {shipments.map(s=>{
              const lane = laneById.get(s.laneId)!
              const o = nodeById.get(lane.originId)!
              const d = nodeById.get(lane.destId)!
              return (
                <button key={s.id} onClick={()=>setSelected(s.id)}
                  className={`w-full text-left p-3 rounded-xl border ${selected===s.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className="text-sm font-medium">{o.region} → {d.region} • {lane.mode}</div>
                  <div className="text-xs text-slate-600">{s.status}{s.status==="LATE" ? ` (+${s.lateByDays}d)` : ""} • {s.priority}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="font-semibold">Re-tender decision (expected total cost)</div>
          <div className="text-sm text-slate-600">This mimics carrier selection logic: minimize cost while protecting OTIF.</div>
        </div>

        <div className="p-4">
          {!detail?.shipment ? (
            <div className="text-sm text-slate-600">Select a shipment.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <div className="text-sm text-slate-500">Shipment</div>
                <div className="font-semibold mt-1">{detail.shipment.id}</div>
                <div className="text-sm text-slate-600 mt-1">Priority: <span className="font-semibold">{detail.shipment.priority}</span></div>
                <div className="text-sm text-slate-600">Status: <span className="font-semibold">{detail.shipment.status}</span></div>
              </div>

              <div className="lg:col-span-2">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="text-left py-2">Option</th>
                        <th className="text-right py-2">Freight</th>
                        <th className="text-right py-2">Late prob</th>
                        <th className="text-right py-2">Penalty</th>
                        <th className="text-right py-2">Expected total</th>
                        <th className="text-right py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.options.map(o=>{
                        const name = o.carrierId==="EXPEDITE" ? "Expedite (premium)" : (state.carriers.find(c=>c.id===o.carrierId)?.name ?? o.carrierId)
                        return (
                          <tr key={o.carrierId}>
                            <td className="py-3">{name}</td>
                            <td className="py-3 text-right">{fmtMoney(o.expCost)}</td>
                            <td className="py-3 text-right">{fmtPct(o.expLateProb)}</td>
                            <td className="py-3 text-right">{fmtMoney(o.expPenalty)}</td>
                            <td className="py-3 text-right font-semibold">{fmtMoney(o.expTotal)}</td>
                            <td className="py-3 text-right">
                              <button
                                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                                onClick={()=>executeRetender(detail.shipment!.id, o.carrierId)}
                              >
                                Execute
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-xs text-slate-500">{detail.options[0]?.rationale}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
