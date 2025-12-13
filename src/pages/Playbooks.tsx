import React from "react"
import Badge from "../components/Badge"

const playbooks = [
  {
    name: "Stockout risk (DC/SKU)",
    steps: [
      "Confirm days-of-cover vs target and inbound ETAs.",
      "Identify donor DCs with surplus (safe donors).",
      "Evaluate transfer cost vs value-at-risk (lost sales + expedite avoidance).",
      "Approve transfer + update allocation rules for protected customers."
    ],
    guardrails: ["Do not create a secondary stockout at donor", "Cap transfers per day per DC", "Protect priority customers/SKUs"]
  },
  {
    name: "Late shipment recovery",
    steps: [
      "Estimate recovery options: retender, partial expedite, appointment change.",
      "Rank by expected total cost: freight + late probability × penalty.",
      "Execute retender to best carrier; notify customer if ETA changes.",
      "Track carrier performance; escalate if repeat offenders."
    ],
    guardrails: ["Human approval for PROTECT shipments", "Daily expedite budget", "Do not violate customer delivery windows"]
  },
  {
    name: "DC capacity choke",
    steps: [
      "Detect utilization > threshold (dock/labor/space).",
      "Throttle order release; resequence waves by service criticality.",
      "Shift flow paths to alternate DCs (ship-from rules).",
      "Open surge capacity play: temp labor, 3PL overflow, cross-dock."
    ],
    guardrails: ["Never violate safety/quality rules", "Maintain cold chain where relevant", "Avoid whipsawing flows without scenario check"]
  }
]

export default function Playbooks() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Standardized “exception → decision → execution” workflows</div>
        <h1 className="text-2xl font-semibold mt-1">Playbooks</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {playbooks.map((p)=>(
          <div key={p.name} className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{p.name}</div>
              <Badge tone="blue">Agent-ready</Badge>
            </div>

            <div className="mt-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-800">Steps</div>
              <ol className="list-decimal ml-5 mt-1 space-y-1">
                {p.steps.map((s,i)=><li key={i}>{s}</li>)}
              </ol>
            </div>

            <div className="mt-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-800">Guardrails</div>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                {p.guardrails.map((g,i)=><li key={i}>{g}</li>)}
              </ul>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              In production: these become policy-encoded agent workflows with approval thresholds and audit logging.
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
