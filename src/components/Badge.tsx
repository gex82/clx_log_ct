import React from "react"
import { cn } from "../lib/tw"

export default function Badge({ children, tone="slate" }: { children: React.ReactNode; tone?: "slate"|"green"|"amber"|"red"|"blue" }) {
  const cls = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700"
  }[tone]
  return <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold", cls)}>{children}</span>
}
