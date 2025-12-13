import React, { useMemo, useState } from "react"
import { useDemoStore } from "../lib/store"
import Badge from "../components/Badge"
import { forecastDemand } from "../lib/analytics/demand"
import { fmtMoney } from "../lib/format"
import { proposeRebalancing } from "../lib/analytics/inventory"
import SmallBar from "../components/charts/SmallBar"

export default function Inventory() {
  const { state, executeRebalance, policy, spendToday, logs } = useDemoStore()
  const dcs = useMemo(() => state.nodes.filter((n) => n.type === "DC"), [state.nodes])
  const [skuId, setSkuId] = useState(state.skus[0]?.id ?? "S1")
  const sku = state.skus.find((s) => s.id === skuId)!

  const nodeById = useMemo(() => new Map(state.nodes.map((n) => [n.id, n])), [state.nodes])

  const heat = useMemo(() => {
    return dcs
      .map((dc) => {
        const inv = state.inventory.find((i) => i.nodeId === dc.id && i.skuId === skuId)!
        const fc = forecastDemand(state.demandHistory, dc.region, skuId)
        const daily = Math.max(1, fc.next7d / 7)
        const doc = (inv.onHand + inv.inTransit) / daily
        return { dc, inv, doc, fc, daily }
      })
      .sort((a, b) => a.doc - b.doc)
  }, [dcs, state.inventory, state.demandHistory, skuId])

  const transfers = useMemo(() => proposeRebalancing(state, 14, skuId), [state, skuId])

  const demandBars = useMemo(() => {
    const byDay = new Map<number, number>()
    for (const d of state.demandHistory) {
      if (d.skuId !== skuId) continue
      byDay.set(d.day, (byDay.get(d.day) ?? 0) + d.demandCases)
    }
    const days = Array.from(byDay.keys()).sort((a, b) => a - b)
    const last = days.slice(-12)
    return last.map((day) => ({ day: `${day}`, cases: byDay.get(day) ?? 0 }))
  }, [state.demandHistory, skuId])

  const spend = useMemo(() => spendToday(), [spendToday, state.today, logs.length])
  const remaining = Math.max(0, policy.dailyActionSpendCap - spend)

  const batch = transfers.slice(0, policy.maxTransfersPerExec)
  const batchCost = batch.reduce((a, b) => a + (b.estTransferCost ?? 0), 0)
  const batchNet = batch.reduce((a, b) => a + (b.netValue ?? b.estValue - b.estTransferCost), 0)
  const wouldBlock = batchCost > remaining
  const needsExtra = batchCost >= policy.requireApprovalOver

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Multi-echelon visibility • days-of-cover • constrained rebalancing</div>
        <h1 className="text-2xl font-semibold mt-1">Inventory</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase text-slate-500">SKU</div>
              <div className="font-semibold mt-1">{sku.name}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone="blue">{sku.family}</Badge>
                <Badge>{fmtMoney(sku.marginPerCase)}/case margin</Badge>
              </div>
            </div>
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white" value={skuId} onChange={(e) => setSkuId(e.target.value)}>
              {state.skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold">Demand pulse (last 12 days)</div>
            <div className="text-sm text-slate-600">Synthetic daily demand signal across regions.</div>
            <SmallBar data={demandBars} xKey="day" yKey="cases" />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="font-semibold">Days-of-cover by DC (service vs. carrying risk)</div>
            <div className="text-sm text-slate-600">DOC = (on-hand + in-transit) / forecasted daily demand.</div>
          </div>

          <div className="p-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left py-2">DC</th>
                  <th className="text-right py-2">On hand</th>
                  <th className="text-right py-2">In transit</th>
                  <th className="text-right py-2">Fcst 7d</th>
                  <th className="text-right py-2">DOC</th>
                  <th className="text-right py-2">Target</th>
                  <th className="text-right py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heat.map((x) => {
                  const status =
                    x.doc < Math.max(6, x.inv.targetDaysCover * 0.55)
                      ? ["Stockout risk", "red"]
                      : x.doc > x.inv.targetDaysCover + 16
                      ? ["Excess risk", "amber"]
                      : ["Healthy", "green"]

                  return (
                    <tr key={x.dc.id}>
                      <td className="py-3 font-medium">{x.dc.name}</td>
                      <td className="py-3 text-right">{x.inv.onHand.toLocaleString()}</td>
                      <td className="py-3 text-right">{x.inv.inTransit.toLocaleString()}</td>
                      <td className="py-3 text-right">{x.fc.next7d.toLocaleString()}</td>
                      <td className="py-3 text-right font-semibold">{x.doc.toFixed(1)}</td>
                      <td className="py-3 text-right">{x.inv.targetDaysCover}</td>
                      <td className="py-3 text-right">
                        <Badge tone={status[1] as any}>{status[0]}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">Recommended transfers (net value)</div>
                    <div className="text-sm text-slate-600">Match surplus DOC → deficit DOC, then rank by net value = benefit − transfer cost.</div>
                  </div>
                  <Badge tone="blue">{transfers.length} candidates</Badge>
                </div>

                <div className="mt-3 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="text-left py-2">From</th>
                        <th className="text-left py-2">To</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-right py-2">Transit</th>
                        <th className="text-right py-2">Cost</th>
                        <th className="text-right py-2">Net value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfers.slice(0, 8).map((t, i) => {
                        const from = nodeById.get(t.fromNodeId)!
                        const to = nodeById.get(t.toNodeId)!
                        return (
                          <tr key={i} title={t.rationale}>
                            <td className="py-3">{from.region}</td>
                            <td className="py-3">{to.region}</td>
                            <td className="py-3 text-right">{t.qtyCases.toLocaleString()}</td>
                            <td className="py-3 text-right">{t.estTransitDays}d</td>
                            <td className="py-3 text-right">{fmtMoney(t.estTransferCost)}</td>
                            <td className="py-3 text-right font-semibold">{fmtMoney(t.netValue)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">
                    Batch: {batch.length} transfers • Cost {fmtMoney(batchCost)} • Net {fmtMoney(batchNet)} • Remaining cap {fmtMoney(remaining)}
                  </div>
                  {needsExtra && <Badge tone="amber">Extra approval</Badge>}
                </div>

                <button
                  className="mt-3 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900"
                  onClick={() => executeRebalance(batch)}
                  disabled={!transfers.length || wouldBlock}
                  title={wouldBlock ? "Blocked by daily spend cap" : "Execute transfer batch"}
                >
                  Approve & execute top transfers
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200">
                <div className="font-semibold">What this helps decide</div>
                <ul className="mt-2 text-sm text-slate-600 list-disc ml-5 space-y-1">
                  <li>Which DCs will stock out first (by SKU)?</li>
                  <li>Where is cover trapped (excess) and costly?</li>
                  <li>Which moves are worth it after transfer cost?</li>
                </ul>
                <div className="mt-3 text-xs text-slate-500">
                  In production, replace heuristic with constrained optimization (transfer capacity, lead times, service tiers, channel allocation rules).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
