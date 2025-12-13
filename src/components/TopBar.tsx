import React, { useEffect, useMemo, useState } from "react"
import { useDemoStore } from "../lib/store"
import { Play, Pause, RotateCcw, Download, Settings, Wand2 } from "lucide-react"
import SettingsModal from "./SettingsModal"

function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function TopBar() {
  const { running, setRunning, step, regenerate, state, logs, policy, spendToday, startGuided, guided } = useDemoStore()
  const [openSettings, setOpenSettings] = useState(false)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => step(1), 1200)
    return () => clearInterval(t)
  }, [running, step])

  const spend = useMemo(() => spendToday(), [spendToday, state.today, logs.length])
  const remaining = Math.max(0, policy.dailyActionSpendCap - spend)

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="px-6 py-3 flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Sim Day {state.today}</span>
            <span className="mx-3">•</span>
            Fuel <span className="font-semibold text-slate-900">{state.fuelIndex.toFixed(2)}</span>
            <span className="mx-3">•</span>
            Policy spend today{" "}
            <span className="font-semibold text-slate-900">${spend.toLocaleString()}</span>{" "}
            <span className="text-slate-500">/ ${policy.dailyActionSpendCap.toLocaleString()}</span>{" "}
            <span className="text-slate-500">(remaining ${remaining.toLocaleString()})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              onClick={() => setRunning(!running)}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running ? "Pause live" : "Run live"}
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
              onClick={() => step(1)}
            >
              Step
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
              onClick={() => regenerate()}
              title="Regenerate synthetic dataset"
            >
              <RotateCcw size={16} />
              Regenerate
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
              onClick={() => downloadJson(`autopilot-snapshot-day${state.today}.json`, { state, policy, logs })}
              title="Download current state + policy + executed actions"
            >
              <Download size={16} />
              Snapshot
            </button>

            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-sm font-medium hover:bg-slate-200"
              onClick={() => setOpenSettings(true)}
              title="Policy & demo settings"
            >
              <Settings size={16} />
              Settings
            </button>

            <button
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
                guided.enabled ? "border-slate-900 bg-slate-50 text-slate-900" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
              onClick={() => startGuided()}
              title="Start guided demo overlay"
            >
              <Wand2 size={16} />
              Guided demo
            </button>
          </div>
        </div>
      </header>

      {openSettings && <SettingsModal onClose={() => setOpenSettings(false)} />}
    </>
  )
}
