import React, { useMemo } from "react"
import { useDemoStore } from "../lib/store"

function downloadJson(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Data() {
  const { state } = useDemoStore()
  const tables = useMemo(()=>[
    { name:"Nodes", rows: state.nodes },
    { name:"SKUs", rows: state.skus },
    { name:"Carriers", rows: state.carriers },
    { name:"Lanes", rows: state.lanes.slice(0, 30) },
    { name:"Shipments", rows: state.shipments.slice(0, 30) },
    { name:"Inventory", rows: state.inventory.slice(0, 30) },
    { name:"Demand history", rows: state.demandHistory.slice(-40) },
  ], [state])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Transparent synthetic dataset for explainable decisions</div>
        <h1 className="text-2xl font-semibold mt-1">Data Explorer</h1>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Download</div>
            <div className="text-sm text-slate-600">Export the full synthetic state as JSON.</div>
          </div>
          <button
            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
            onClick={()=>downloadJson(`clorox_demo_state_seed_${state.seed}.json`, state)}
          >
            Download JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tables.map(t=>(
          <div key={t.name} className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-slate-500">{t.rows.length} rows shown</div>
            </div>
            <div className="p-4 overflow-auto">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap">{JSON.stringify(t.rows, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
