import React from "react"
import { GUIDED_STEPS } from "../lib/guided"
import { useDemoStore } from "../lib/store"

export default function GuidedDemo() {
  const { startGuided } = useDemoStore()

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">A click-by-click client narrative</div>
        <h1 className="text-2xl font-semibold mt-1">Guided Demo</h1>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold">Recommended flow (5–7 minutes)</div>
            <div className="text-sm text-slate-600 mt-1">
              Start the guided overlay to get a consistent talk track and navigation prompts.
            </div>
          </div>
          <button className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800" onClick={() => startGuided()}>
            Start guided demo
          </button>
        </div>

        <ol className="mt-4 space-y-3">
          {GUIDED_STEPS.map((s, i) => (
            <li key={s.id} className="p-4 rounded-2xl border border-slate-200">
              <div className="text-xs uppercase text-slate-500">Step {i + 1}</div>
              <div className="text-base font-semibold mt-1">{s.title}</div>
              <div className="text-sm text-slate-700 mt-1">{s.objective}</div>
              <ul className="mt-2 text-sm text-slate-600 list-disc ml-5 space-y-1">
                {s.talkTrack.slice(0, 2).map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="mt-4 text-xs text-slate-500">
          Tip: keep it crisp — execute exactly one action (transfer or re-tender) to show closed-loop behavior.
        </div>
      </div>
    </div>
  )
}
