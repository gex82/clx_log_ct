import React, { useMemo, useState } from "react"
import KpiCard from "../components/KpiCard"
import Badge from "../components/Badge"
import { computeKPIs } from "../lib/kpi"
import { useDemoStore } from "../lib/store"
import { computeExceptions, Exception } from "../lib/analytics/risk"
import { fmtMoney, fmtPct } from "../lib/format"
import { computeShipmentRetenderOptions } from "../lib/analytics/transport"

function toneFromRisk(r: number): "green" | "amber" | "red" {
  if (r >= 80) return "red"
  if (r >= 60) return "amber"
  return "green"
}

export default function ControlTower() {
  const { state, executeRetender, runRebalance, executeRebalance, logs, policy, spendToday } = useDemoStore()
  const k = useMemo(() => computeKPIs(state), [state])
  const exceptions = useMemo(() => computeExceptions(state), [state])
  const [selected, setSelected] = useState<Exception | null>(exceptions[0] ?? null)

  const spend = useMemo(() => spendToday(), [spendToday, state.today, logs.length])
  const remaining = Math.max(0, policy.dailyActionSpendCap - spend)

  const detail = useMemo(() => {
    if (!selected) return null
    if (selected.type === "LATE_SHIPMENT_RISK" && selected.shipmentId) {
      return computeShipmentRetenderOptions(state, selected.shipmentId)
    }
    return null
  }, [selected, state])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Decision Intelligence • US Network • Transportation / Distribution / Inventory</div>
        <h1 className="text-2xl font-semibold mt-1">Control Tower</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KpiCard label="OTIF" value={fmtPct(k.otif)} sub="Arrived on-time (proxy)" tone={k.otif > 0.92 ? "green" : "amber"} />
        <KpiCard label="Fill rate" value={fmtPct(k.fillRate)} sub="Nodes above min cover" tone={k.fillRate > 0.88 ? "green" : "amber"} />
        <KpiCard label="Inventory turns" value={k.inventoryTurns.toFixed(1)} sub="Annualized proxy" tone={k.inventoryTurns > 9 ? "green" : "blue"} />
        <KpiCard label="Expedite spend" value={fmtMoney(k.expediteSpend)} sub="Late protected loads (proxy)" tone={k.expediteSpend > 40000 ? "amber" : "slate"} />
        <KpiCard label="Service risk" value={fmtPct(k.serviceRiskIndex)} sub="Weighted late + low cover" tone={k.serviceRiskIndex > 0.35 ? "red" : k.serviceRiskIndex > 0.22 ? "amber" : "green"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-semibold">Top exceptions</div>
              <div className="text-sm text-slate-600">Ranked by value-at-risk, then risk score.</div>
            </div>
            <div className="text-xs text-slate-500">{exceptions.length} shown</div>
          </div>

          <div className="divide-y divide-slate-100">
            {exceptions.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className={`w-full text-left p-4 hover:bg-slate-50 ${selected?.id === e.id ? "bg-slate-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-sm text-slate-600 mt-1">{e.detail}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={toneFromRisk(e.riskScore)}>{e.riskScore}/100 risk</Badge>
                      <Badge tone="blue">{fmtMoney(e.estValueAtRisk)}/wk at risk</Badge>
                      {e.region && <Badge>{e.region}</Badge>}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 whitespace-nowrap">View →</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="font-semibold">Decision & execution</div>
            <div className="text-sm text-slate-600">Approve actions; state updates immediately (synthetic “live” behavior).</div>
            <div className="mt-2 text-xs text-slate-500">
              Policy cap remaining today: <span className="font-semibold text-slate-800">{fmtMoney(remaining)}</span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {!selected ? (
              <div className="text-sm text-slate-600">Select an exception.</div>
            ) : (
              <>
                <div className="text-sm text-slate-500">Selected</div>
                <div className="font-semibold">{selected.title}</div>
                <div className="text-sm text-slate-600">{selected.detail}</div>

                <div className="mt-2 space-y-2">
                  {selected.recommendedActions.map((a, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200">
                      <div className="text-sm font-medium">{a.label}</div>
                      <div className="text-sm text-slate-600 mt-1">{a.impact}</div>
                      <div className="text-xs text-slate-500 mt-1">Playbook: {a.executeHint}</div>

                      <div className="mt-3">
                        {a.executeHint === "RUN_REBALANCE" && (
                          <RebalanceButton exception={selected} />
                        )}

                        {a.executeHint === "RETENDER" && selected.shipmentId && (
                          <RetenderPanel shipmentId={selected.shipmentId} />
                        )}

                        {a.executeHint !== "RUN_REBALANCE" && a.executeHint !== "RETENDER" && (
                          <button
                            className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
                            onClick={() => alert("Demo: This playbook would push tasks to TMS/WMS/ERP workflows.")}
                          >
                            Review playbook steps
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {detail?.options?.length ? (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-700">Explainability</div>
                    <div className="text-xs text-slate-600 mt-1">
                      Recommendations are ranked by <span className="font-semibold">expected total cost</span> = freight + (late probability × penalty).
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="p-4 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-700">Recent actions (audit)</div>
            <div className="mt-2 space-y-2 max-h-44 overflow-auto">
              {logs.slice(0, 7).map((l, i) => (
                <div key={i} className="text-xs text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-900">{l.label}</span>
                    <Badge tone={l.status === "EXECUTED" ? "green" : "amber"}>{l.status}</Badge>
                  </div>
                  <div className="text-slate-600">{l.detail}</div>
                  {l.status === "EXECUTED" && (
                    <div className="text-slate-500">
                      Cost {fmtMoney(l.cost)} • Benefit {fmtMoney(l.benefit)} • Net{" "}
                      <span className="font-semibold">{fmtMoney(l.net)}</span>
                    </div>
                  )}
                </div>
              ))}
              {!logs.length && <div className="text-xs text-slate-500">No actions executed yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RebalanceButton({ exception }: { exception: Exception }) {
  const { runRebalance, executeRebalance, policy, spendToday, state, logs } = useDemoStore()
  const spend = useMemo(() => spendToday(), [spendToday, state.today, logs.length])
  const remaining = Math.max(0, policy.dailyActionSpendCap - spend)

  return (
    <button
      className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900"
      onClick={() => {
        const { transfers } = runRebalance(exception?.skuId)
        const filtered = exception?.nodeId && exception?.skuId ? transfers.filter((t) => t.toNodeId === exception.nodeId && t.skuId === exception.skuId) : transfers
        executeRebalance((filtered.length ? filtered : transfers).slice(0, policy.maxTransfersPerExec))
      }}
      disabled={remaining <= 0}
      title={remaining <= 0 ? "Blocked by daily spend cap" : "Execute transfer batch"}
    >
      Approve & execute rebalancing
    </button>
  )
}

function RetenderPanel({ shipmentId }: { shipmentId: string }) {
  const { state, executeRetender, policy, spendToday, logs } = useDemoStore()
  const { options } = useMemo(() => computeShipmentRetenderOptions(state, shipmentId), [state, shipmentId])
  const [carrier, setCarrier] = useState(options[0]?.carrierId ?? "K1")

  const spend = useMemo(() => spendToday(), [spendToday, state.today, logs.length])
  const selected = options.find((o) => o.carrierId === carrier)
  const cost = selected?.expCost ?? 0
  const remaining = Math.max(0, policy.dailyActionSpendCap - spend)
  const wouldBlock = cost > remaining
  const needsExtra = cost >= policy.requireApprovalOver

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-500">Select option</div>
      <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
        {options.map((o) => (
          <option key={o.carrierId} value={o.carrierId}>
            {o.carrierId === "EXPEDITE" ? "Expedite (premium)" : state.carriers.find((c) => c.id === o.carrierId)?.name} — exp total ${o.expTotal}
          </option>
        ))}
      </select>

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Policy check: cost {fmtMoney(cost)} • remaining {fmtMoney(remaining)}
        </div>
        {needsExtra && <Badge tone="amber">Extra approval</Badge>}
      </div>

      <button
        className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 w-full disabled:opacity-40 disabled:hover:bg-slate-900"
        onClick={() => executeRetender(shipmentId, carrier)}
        disabled={wouldBlock}
        title={wouldBlock ? "Blocked by daily spend cap" : "Execute re-tender"}
      >
        Approve & execute re-tender
      </button>
    </div>
  )
}
