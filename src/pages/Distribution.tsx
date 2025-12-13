import React, { useMemo } from "react"
import { useDemoStore } from "../lib/store"
import Badge from "../components/Badge"
import { fmtMoney, fmtPct } from "../lib/format"
import { computeKPIs } from "../lib/kpi"

export default function Distribution() {
  const { state } = useDemoStore()
  const kpis = useMemo(()=>computeKPIs(state), [state])

  const dcNodes = useMemo(()=>state.nodes.filter(n=>n.type==="DC"), [state.nodes])
  const invByNode = useMemo(()=>{
    const m = new Map<string, number>()
    for (const inv of state.inventory) m.set(inv.nodeId, (m.get(inv.nodeId) ?? 0) + inv.onHand)
    return m
  }, [state.inventory])

  // Synthetic capacity + utilization
  const util = useMemo(()=>{
    return dcNodes.map(dc=>{
      const baseCap = 9000 + (dc.region==="Northeast"? 1200 : dc.region==="West"? 900 : 0)
      const scenarioHit = state.scenario.dcOutage && dc.region==="Northeast" ? 0.55 : 1.0
      const cap = Math.round(baseCap * scenarioHit)
      const outbound = Math.round((invByNode.get(dc.id) ?? 0) * 0.18)
      const u = Math.min(1.25, outbound / Math.max(1, cap))
      return { dc, cap, outbound, u }
    }).sort((a,b)=>b.u-a.u)
  }, [dcNodes, invByNode, state.scenario.dcOutage])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">See where the network will choke and how to protect flow</div>
        <h1 className="text-2xl font-semibold mt-1">Distribution</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="text-xs uppercase text-slate-500">OTIF</div>
          <div className="text-2xl font-semibold mt-1">{fmtPct(kpis.otif)}</div>
          <div className="text-sm text-slate-600 mt-1">Distribution promise health</div>
        </div>
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="text-xs uppercase text-slate-500">Fill rate</div>
          <div className="text-2xl font-semibold mt-1">{fmtPct(kpis.fillRate)}</div>
          <div className="text-sm text-slate-600 mt-1">DC coverage adequacy</div>
        </div>
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="text-xs uppercase text-slate-500">Backlog risk</div>
          <div className="text-2xl font-semibold mt-1">{fmtPct(Math.min(0.9, util.filter(x=>x.u>0.95).length/Math.max(1, util.length)) )}</div>
          <div className="text-sm text-slate-600 mt-1">DCs near capacity</div>
        </div>
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="text-xs uppercase text-slate-500">Expedite</div>
          <div className="text-2xl font-semibold mt-1">{fmtMoney(kpis.expediteSpend)}</div>
          <div className="text-sm text-slate-600 mt-1">Symptom of constraint</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="font-semibold">DC throughput risk</div>
          <div className="text-sm text-slate-600">Utilization = outbound volume / capacity (proxy).</div>
        </div>

        <div className="p-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left py-2">Distribution Center</th>
                <th className="text-right py-2">Capacity</th>
                <th className="text-right py-2">Outbound</th>
                <th className="text-right py-2">Utilization</th>
                <th className="text-right py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {util.map(x=>(
                <tr key={x.dc.id}>
                  <td className="py-3 font-medium">{x.dc.name}</td>
                  <td className="py-3 text-right">{x.cap.toLocaleString()}</td>
                  <td className="py-3 text-right">{x.outbound.toLocaleString()}</td>
                  <td className="py-3 text-right">{fmtPct(Math.min(1.5, x.u))}</td>
                  <td className="py-3 text-right">
                    {x.u>1.05 ? <Badge tone="red">Over capacity</Badge> : x.u>0.95 ? <Badge tone="amber">At risk</Badge> : <Badge tone="green">Healthy</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
            <span className="font-semibold">What this page helps decide:</span> where to rebalance volume, when to throttle order release, and when to shift flows to protect OTIF.
          </div>
        </div>
      </div>
    </div>
  )
}
