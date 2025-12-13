import React, { useMemo } from "react"
import { useDemoStore } from "../lib/store"
import Badge from "../components/Badge"
import { computeKPIs } from "../lib/kpi"
import { fmtMoney, fmtPct } from "../lib/format"

export default function Scenarios() {
  const { state, toggleScenario } = useDemoStore()
  const k = useMemo(()=>computeKPIs(state), [state])

  const toggles = [
    { key: "dcOutage", label: "DC outage (Northeast constraint)", hint: "Simulates capacity drop + backlog risk" },
    { key: "carrierDisruption", label: "Carrier disruption", hint: "Raises late probability; worsens OTIF" },
    { key: "demandSpike", label: "Demand spike", hint: "Increases demand ~18%; accelerates stockouts" },
    { key: "cyberDegradedMode", label: "Cyber degraded mode", hint: "Adds coordination frictions (delays)" }
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Stress-test decisions and mitigation playbooks</div>
        <h1 className="text-2xl font-semibold mt-1">Scenario Simulator</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="text-xs uppercase text-slate-500">OTIF</div>
          <div className="text-2xl font-semibold mt-1">{fmtPct(k.otif)}</div>
        </div>
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="text-xs uppercase text-slate-500">Fill rate</div>
          <div className="text-2xl font-semibold mt-1">{fmtPct(k.fillRate)}</div>
        </div>
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="text-xs uppercase text-slate-500">Expedite spend</div>
          <div className="text-2xl font-semibold mt-1">{fmtMoney(k.expediteSpend)}</div>
        </div>
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
          <div className="text-xs uppercase text-slate-500">Service risk</div>
          <div className="text-2xl font-semibold mt-1">{fmtPct(k.serviceRiskIndex)}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="font-semibold">Scenario toggles</div>
          <div className="text-sm text-slate-600">Turn these on/off and run live simulation to see cascading effects.</div>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {toggles.map(t=>(
            <button
              key={t.key}
              className={`p-4 rounded-2xl border text-left hover:bg-slate-50 ${state.scenario[t.key] ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
              onClick={()=>toggleScenario(t.key)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-sm text-slate-600 mt-1">{t.hint}</div>
                </div>
                <div>{state.scenario[t.key] ? <Badge tone="red">ON</Badge> : <Badge>OFF</Badge>}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="text-sm text-slate-700">
            <span className="font-semibold">Tip:</span> toggle a scenario, then click <span className="font-semibold">Run live</span> in the top bar for 30–60 seconds. 
            Watch the Control Tower reprioritize exceptions automatically.
          </div>
        </div>
      </div>
    </div>
  )
}
