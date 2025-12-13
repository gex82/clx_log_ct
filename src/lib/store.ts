import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DemoState, ScenarioToggles } from "./data/schema"
import { generateDemoState } from "./data/generator"
import { stepSimulation } from "./analytics/simulator"
import { proposeRebalancing, applyTransfers, Transfer } from "./analytics/inventory"
import { applyRetender, computeShipmentRetenderOptions } from "./analytics/transport"

export type Policy = {
  dailyActionSpendCap: number
  maxTransfersPerExec: number
  requireApprovalOver: number
  allowAutoExecute: boolean
}

export type GuidedState = { enabled: boolean; stepIndex: number }

export type ActionLog = {
  ts: number
  simDay: number
  label: string
  detail: string
  benefit: number
  cost: number
  net: number
  status: "EXECUTED" | "BLOCKED"
}

type StoreState = {
  state: DemoState
  running: boolean
  logs: ActionLog[]
  policy: Policy
  guided: GuidedState
  regenerate: (seed?: number) => void
  toggleScenario: (k: keyof ScenarioToggles) => void
  step: (n?: number) => void
  setRunning: (r: boolean) => void
  setPolicy: (p: Partial<Policy>) => void
  startGuided: () => void
  stopGuided: () => void
  nextGuidedStep: () => void
  prevGuidedStep: () => void
  runRebalance: (onlySkuId?: string) => { transfers: Transfer[] }
  executeRebalance: (transfers: Transfer[]) => { ok: boolean; reason?: string }
  executeRetender: (shipmentId: string, carrierId: string) => { ok: boolean; reason?: string }
  spendToday: () => number
}

const DEFAULT_POLICY: Policy = {
  dailyActionSpendCap: 75000,
  maxTransfersPerExec: 6,
  requireApprovalOver: 50000,
  allowAutoExecute: false,
}

export const useDemoStore = create<StoreState>()(
  persist(
    (set, get) => ({
      state: generateDemoState(42),
      running: false,
      logs: [],
      policy: DEFAULT_POLICY,
      guided: { enabled: false, stepIndex: 0 },

      regenerate: (seed) => {
        const s = seed ?? Math.floor(Math.random() * 10_000)
        set({ state: generateDemoState(s), logs: [], running: false, guided: { enabled: false, stepIndex: 0 } })
      },

      toggleScenario: (k) => {
        const cur = get().state
        set({ state: { ...cur, scenario: { ...cur.scenario, [k]: !cur.scenario[k] } } })
      },

      step: (n = 1) => {
        const cur = get().state
        set({ state: stepSimulation(cur, n) })
      },

      setRunning: (r) => set({ running: r }),

      setPolicy: (p) => set({ policy: { ...get().policy, ...p } }),

      startGuided: () => set({ guided: { enabled: true, stepIndex: 0 } }),
      stopGuided: () => set({ guided: { enabled: false, stepIndex: 0 } }),
      nextGuidedStep: () => set({ guided: { ...get().guided, stepIndex: get().guided.stepIndex + 1 } }),
      prevGuidedStep: () => set({ guided: { ...get().guided, stepIndex: Math.max(0, get().guided.stepIndex - 1) } }),

      spendToday: () => {
        const day = get().state.today
        return get()
          .logs.filter((l) => l.status === "EXECUTED" && l.simDay === day)
          .reduce((a, b) => a + b.cost, 0)
      },

      runRebalance: (onlySkuId) => {
        const cur = get().state
        const transfers = proposeRebalancing(cur, 18, onlySkuId)
        return { transfers }
      },

      executeRebalance: (transfers) => {
        const cur = get().state
        const pol = get().policy
        const useTransfers = transfers.slice(0, pol.maxTransfersPerExec)
        const cost = useTransfers.reduce((a, b) => a + (b.estTransferCost ?? 0), 0)
        const benefit = useTransfers.reduce((a, b) => a + (b.estValue ?? 0), 0)
        const net = useTransfers.reduce((a, b) => a + (b.netValue ?? b.estValue - b.estTransferCost), 0)
        const spend = get().spendToday()

        if (spend + cost > pol.dailyActionSpendCap) {
          set({
            logs: [
              {
                ts: Date.now(),
                simDay: cur.today,
                label: "Blocked: rebalancing (policy cap)",
                detail: `Would spend ${fmt(cost)} (cap remaining ${fmt(pol.dailyActionSpendCap - spend)})`,
                benefit: 0,
                cost: 0,
                net: 0,
                status: "BLOCKED",
              },
              ...get().logs,
            ],
          })
          return { ok: false, reason: "Daily spend cap exceeded" }
        }

        const next = applyTransfers(cur, useTransfers)
        set({
          state: next,
          logs: [
            {
              ts: Date.now(),
              simDay: cur.today,
              label: "Executed rebalancing transfers",
              detail: `${useTransfers.length} transfers`,
              benefit,
              cost,
              net,
              status: "EXECUTED",
            },
            ...get().logs,
          ],
        })
        return { ok: true }
      },

      executeRetender: (shipmentId, carrierId) => {
        const cur = get().state
        const pol = get().policy
        const spend = get().spendToday()

        const { options } = computeShipmentRetenderOptions(cur, shipmentId)
        const selected = options.find((o) => o.carrierId === carrierId)
        const cost = selected?.expCost ?? 12000
        const bestPenalty = Math.min(...options.map((o) => o.expPenalty))
        const benefit = Math.max(0, (selected?.expPenalty ?? bestPenalty) - bestPenalty)
        const net = benefit - cost

        if (spend + cost > pol.dailyActionSpendCap) {
          set({
            logs: [
              {
                ts: Date.now(),
                simDay: cur.today,
                label: "Blocked: re-tender (policy cap)",
                detail: `Would spend ${fmt(cost)} (cap remaining ${fmt(pol.dailyActionSpendCap - spend)})`,
                benefit: 0,
                cost: 0,
                net: 0,
                status: "BLOCKED",
              },
              ...get().logs,
            ],
          })
          return { ok: false, reason: "Daily spend cap exceeded" }
        }

        const next = applyRetender(cur, shipmentId, carrierId)
        set({
          state: next,
          logs: [
            {
              ts: Date.now(),
              simDay: cur.today,
              label: "Executed re-tender",
              detail: `Shipment ${shipmentId} → ${carrierId}`,
              benefit,
              cost,
              net,
              status: "EXECUTED",
            },
            ...get().logs,
          ],
        })
        return { ok: true }
      },
    }),
    { name: "clorox-autopilot-demo-v3" }
  )
)

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}
