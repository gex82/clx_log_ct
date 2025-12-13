import React, { useMemo, useState } from "react"
import { useDemoStore } from "../lib/store"

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { policy, setPolicy, spendToday, state } = useDemoStore()
  const [dailyCap, setDailyCap] = useState(policy.dailyActionSpendCap)
  const [maxTransfers, setMaxTransfers] = useState(policy.maxTransfersPerExec)
  const [approvalOver, setApprovalOver] = useState(policy.requireApprovalOver)

  const spend = useMemo(() => spendToday(), [spendToday, state.today])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[680px] rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="p-5 border-b border-slate-200 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase text-slate-500">Policy & demo settings</div>
            <div className="text-lg font-semibold mt-1">Guardrails (demo)</div>
            <div className="text-sm text-slate-600 mt-1">
              These settings constrain agentic execution and make the demo feel like a real ops environment.
            </div>
          </div>
          <button className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Daily action spend cap (sim day)"
            help={`Today spent: $${spend.toLocaleString()}`}
          >
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={dailyCap}
              onChange={(e) => setDailyCap(parseInt(e.target.value || "0", 10))}
              min={0}
              step={1000}
            />
          </Field>

          <Field
            label="Max transfers per execution"
            help="Limits batch size to mimic DC capacity / planning constraints."
          >
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={maxTransfers}
              onChange={(e) => setMaxTransfers(parseInt(e.target.value || "0", 10))}
              min={1}
              max={20}
            />
          </Field>

          <Field
            label="Requires extra approval over ($)"
            help="In production: CFO/VP approval threshold; here it surfaces as a warning badge."
          >
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={approvalOver}
              onChange={(e) => setApprovalOver(parseInt(e.target.value || "0", 10))}
              min={0}
              step={1000}
            />
          </Field>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div className="text-sm font-semibold">What this enables</div>
            <ul className="mt-2 text-sm text-slate-600 list-disc ml-5 space-y-1">
              <li>Agent actions get blocked when spend exceeds the cap.</li>
              <li>Large actions show an “extra approval” warning.</li>
              <li>Settings persist locally (demo-friendly).</li>
            </ul>
            <div className="mt-3 text-xs text-slate-500">
              Note: this is a frontend-only demo. In production, these policies would live in a governed policy service with audit logs and role-based approvals.
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-medium"
            onClick={() => {
              setDailyCap(75000)
              setMaxTransfers(6)
              setApprovalOver(50000)
            }}
          >
            Reset defaults
          </button>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium"
              onClick={() => {
                setPolicy({ dailyActionSpendCap: dailyCap, maxTransfersPerExec: maxTransfers, requireApprovalOver: approvalOver })
                onClose()
              }}
            >
              Save settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="text-sm font-semibold">{label}</div>
      {help && <div className="text-xs text-slate-500 mt-1">{help}</div>}
      <div className="mt-3">{children}</div>
    </div>
  )
}
