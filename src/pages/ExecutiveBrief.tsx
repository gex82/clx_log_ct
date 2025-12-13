import React, { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Badge from "../components/Badge"
import { useDemoStore } from "../lib/store"
import { buildExecutiveBrief } from "../lib/analytics/brief"
import { fmtMoney } from "../lib/format"

export default function ExecutiveBrief() {
  const nav = useNavigate()
  const { state, runRebalance, executeRebalance, executeRetender } = useDemoStore()
  const items = useMemo(() => buildExecutiveBrief(state), [state])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">A ready-to-read, exec-facing view of what matters right now</div>
        <h1 className="text-2xl font-semibold mt-1">Executive Brief</h1>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-semibold">Top questions and decisions</div>
            <div className="text-sm text-slate-600">Each card contains the current answer, the why, and the next-best action.</div>
          </div>
          <Badge tone="blue">Sim Day {state.today}</Badge>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((it, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="text-xs uppercase text-slate-500">Question</div>
              <div className="font-semibold mt-1">{it.question}</div>

              <div className="mt-3">
                <div className="text-xs uppercase text-slate-500">Current answer</div>
                <div className="text-sm text-slate-800 mt-1">{it.answer}</div>
              </div>

              <div className="mt-3">
                <div className="text-xs uppercase text-slate-500">Why</div>
                <div className="text-sm text-slate-600 mt-1">{it.why}</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {it.actions.map((a, j) => (
                  <button
                    key={j}
                    className={`px-3 py-2 rounded-xl text-sm font-medium ${
                      a.kind === "PLAYBOOK"
                        ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                    onClick={() => {
                      if (a.kind === "PLAYBOOK") {
                        // lightweight navigation shortcuts
                        if (a.label.includes("Inventory")) nav("/inventory")
                        else if (a.label.includes("Transportation")) nav("/transportation")
                        else if (a.label.includes("Distribution")) nav("/distribution")
                        else if (a.label.includes("Scenario")) nav("/scenarios")
                        else nav("/")
                        return
                      }

                      if (a.kind === "RETENDER") {
                        const shipmentId = a.payload?.shipmentId as string
                        const carrierId = a.payload?.carrierId as string
                        if (shipmentId && carrierId) executeRetender(shipmentId, carrierId)
                        nav("/")
                        return
                      }

                      if (a.kind === "REBALANCE") {
                        const skuId = a.payload?.skuId as string
                        const nodeId = a.payload?.nodeId as string | undefined
                        const { transfers } = runRebalance(skuId)
                        const targeted = nodeId ? transfers.filter((t) => t.toNodeId === nodeId) : transfers
                        executeRebalance((targeted.length ? targeted : transfers).slice(0, 6))
                        nav("/")
                      }
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {it.actions.some((x) => x.kind === "REBALANCE") && (
                <div className="mt-3 text-xs text-slate-500">
                  Rebalancing actions are ranked by <span className="font-semibold">net value</span> (benefit − transfer cost).
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
        <div className="font-semibold">How to use this in the meeting</div>
        <div className="text-sm text-slate-600 mt-1">
          Start here to anchor the narrative. Then jump into Control Tower for the click-through and “Approve & execute” moments.
        </div>
        <div className="mt-3 text-sm text-slate-700">
          <span className="font-semibold">Suggested flow:</span> Executive Brief → Control Tower → Inventory → Transportation → Scenario Simulator.
        </div>
      </div>
    </div>
  )
}
