import React, { useEffect, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { GUIDED_STEPS } from "../lib/guided"
import { useDemoStore } from "../lib/store"

export default function GuidedOverlay() {
  const nav = useNavigate()
  const loc = useLocation()
  const { guided, stopGuided, nextGuidedStep, prevGuidedStep } = useDemoStore()

  const step = useMemo(() => GUIDED_STEPS[guided.stepIndex], [guided.stepIndex])

  useEffect(() => {
    if (!guided.enabled) return
    // Auto-navigate when starting or when step changes.
    if (!step) {
      stopGuided()
      return
    }
    if (loc.pathname !== step.route) nav(step.route)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guided.enabled, guided.stepIndex])

  if (!guided.enabled || !step) return null

  const isFirst = guided.stepIndex === 0
  const isLast = guided.stepIndex === GUIDED_STEPS.length - 1

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[420px] max-w-[92vw]">
      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase text-slate-500">Guided demo</div>
            <div className="text-base font-semibold mt-1">
              {guided.stepIndex + 1}. {step.title}
            </div>
            <div className="text-sm text-slate-600 mt-1">{step.objective}</div>
          </div>
          <button
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium"
            onClick={() => stopGuided()}
          >
            Exit
          </button>
        </div>

        <div className="p-4">
          <div className="text-xs font-semibold text-slate-700">Talk track (pick 1–2 bullets)</div>
          <ul className="mt-2 text-sm text-slate-700 list-disc ml-5 space-y-1">
            {step.talkTrack.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              className={`px-3 py-2 rounded-xl text-sm font-medium border ${
                isFirst ? "border-slate-200 text-slate-400 cursor-not-allowed" : "border-slate-200 hover:bg-slate-50"
              }`}
              onClick={() => !isFirst && prevGuidedStep()}
              disabled={isFirst}
            >
              Back
            </button>
            <div className="text-xs text-slate-500">
              Step {guided.stepIndex + 1} of {GUIDED_STEPS.length}
            </div>
            <button
              className={`px-3 py-2 rounded-xl text-sm font-medium ${
                isLast ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
              onClick={() => (isLast ? stopGuided() : nextGuidedStep())}
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Tip: Use <span className="font-semibold">Run live</span> + approve one action to make it feel “real”.
          </div>
        </div>
      </div>
    </div>
  )
}
