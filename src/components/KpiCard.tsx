import React from "react"
import { cn } from "../lib/tw"

export default function KpiCard({
  label, value, sub, tone="slate"
}: { label: string; value: string; sub?: string; tone?: "slate"|"green"|"amber"|"red"|"blue" }) {
  const ring = {
    slate: "ring-slate-200",
    green: "ring-emerald-200",
    amber: "ring-amber-200",
    red: "ring-rose-200",
    blue: "ring-sky-200"
  }[tone]
  return (
    <div className={cn("rounded-2xl bg-white shadow-soft ring-1 p-4", ring)}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-sm text-slate-600">{sub}</div>}
    </div>
  )
}
