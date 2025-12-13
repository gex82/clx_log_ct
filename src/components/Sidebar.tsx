import React from "react"
import { NavLink } from "react-router-dom"
import { Activity, Truck, Warehouse, Boxes, FlaskConical, BookOpen, Database, BarChart3, Map, Sparkles } from "lucide-react"
import { cn } from "../lib/tw"

const Item = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium",
        isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      )
    }
  >
    <Icon size={18} />
    {label}
  </NavLink>
)

export default function Sidebar() {
  return (
    <aside className="w-[270px] bg-white/90 backdrop-blur border-r border-slate-200 p-4 hidden md:block">
      <div className="flex items-center gap-3 px-2 py-2">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} className="w-9 h-9" alt="Autopilot logo" />
        <div>
          <div className="font-semibold">Supply Chain Autopilot</div>
          <div className="text-xs text-slate-500">Client Demo • Synthetic data</div>
        </div>
      </div>

      <div className="mt-6 space-y-1">
        <Item to="/guided" icon={Sparkles} label="Guided Demo" />
        <div className="h-px bg-slate-200 my-2" />
        <Item to="/" icon={Activity} label="Control Tower" />
        <Item to="/executive-brief" icon={BarChart3} label="Executive Brief" />
        <Item to="/network" icon={Map} label="Network" />
        <Item to="/transportation" icon={Truck} label="Transportation" />
        <Item to="/distribution" icon={Warehouse} label="Distribution" />
        <Item to="/inventory" icon={Boxes} label="Inventory" />
        <Item to="/scenarios" icon={FlaskConical} label="Scenario Simulator" />
        <Item to="/playbooks" icon={BookOpen} label="Playbooks" />
        <Item to="/data" icon={Database} label="Data Explorer" />
      </div>

      <div className="mt-8 p-3 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="text-xs font-semibold text-slate-700">Demo note</div>
        <div className="mt-1 text-xs text-slate-600">
          Analytics are intentionally transparent (forecasting + heuristics) so the logic is explainable and fast to iterate.
        </div>
      </div>
    </aside>
  )
}
