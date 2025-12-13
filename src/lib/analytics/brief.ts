import { DemoState, Node } from "../data/schema"
import { computeExceptions } from "./risk"
import { proposeRebalancing, Transfer } from "./inventory"
import { computeShipmentRetenderOptions } from "./transport"

export type BriefAnswer = {
  question: string
  answer: string
  why: string
  actions: { label: string; kind: "REBALANCE" | "RETENDER" | "PLAYBOOK"; payload?: any }[]
}

function dcThroughputRisk(state: DemoState) {
  const dcNodes = state.nodes.filter((n) => n.type === "DC")
  const invByNode = new Map<string, number>()
  for (const inv of state.inventory) invByNode.set(inv.nodeId, (invByNode.get(inv.nodeId) ?? 0) + inv.onHand)

  return dcNodes
    .map((dc) => {
      const baseCap = 9000 + (dc.region === "Northeast" ? 1200 : dc.region === "West" ? 900 : 0)
      const scenarioHit = state.scenario.dcOutage && dc.region === "Northeast" ? 0.55 : 1.0
      const cap = Math.round(baseCap * scenarioHit)
      const outbound = Math.round((invByNode.get(dc.id) ?? 0) * 0.18)
      const u = Math.min(1.25, outbound / Math.max(1, cap))
      return { dc, cap, outbound, u }
    })
    .sort((a, b) => b.u - a.u)
}

export function buildExecutiveBrief(state: DemoState): BriefAnswer[] {
  const ex = computeExceptions(state)
  const topService = ex.find((e) => e.type === "STOCKOUT_RISK" || e.type === "LATE_SHIPMENT_RISK")
  const topLane = ex.find((e) => e.type === "LANE_COST_OUTLIER")

  const dcRisk = dcThroughputRisk(state)
  const worstDC = dcRisk[0]

  const answers: BriefAnswer[] = []

  // 1) Service miss next
  if (topService) {
    if (topService.type === "STOCKOUT_RISK" && topService.skuId && topService.nodeId) {
      const transfers = proposeRebalancing(state, 20, topService.skuId)
      const targeted = transfers.filter((t) => t.toNodeId === topService.nodeId).sort((a, b) => b.netValue - a.netValue)
      const best = targeted[0] ?? transfers[0]
      answers.push({
        question: "Where will we miss service next, and what is the cheapest prevention?",
        answer: `${topService.title} — est. $${Math.round(topService.estValueAtRisk).toLocaleString()}/wk at risk. Recommended: rebalancing${best ? ` (top move net $${best.netValue.toLocaleString()})` : ""}.`,
        why: topService.detail,
        actions: [
          { label: "Run rebalancing (SKU-specific)", kind: "REBALANCE", payload: { skuId: topService.skuId, nodeId: topService.nodeId } },
          { label: "Open playbook: protect inbound / wave priority", kind: "PLAYBOOK" },
        ],
      })
    } else if (topService.type === "LATE_SHIPMENT_RISK" && topService.shipmentId) {
      const opts = computeShipmentRetenderOptions(state, topService.shipmentId).options
      const best = opts[0]
      answers.push({
        question: "Where will we miss service next, and what is the cheapest prevention?",
        answer: `${topService.title} — est. $${Math.round(topService.estValueAtRisk).toLocaleString()}/wk at risk. Recommended: re-tender to ${best ? best.carrierId : "alternate carrier"} (min expected total).`,
        why: topService.detail,
        actions: [
          { label: "Execute re-tender", kind: "RETENDER", payload: { shipmentId: topService.shipmentId, carrierId: best?.carrierId ?? state.carriers[0]?.id } },
          { label: "Open playbook: expedite partial", kind: "PLAYBOOK" },
        ],
      })
    }
  }

  // 2) Inventory positioning
  answers.push({
    question: "What inventory should sit where to avoid expediting and stockouts?",
    answer: "Use the Inventory page to prioritize DOC gaps and execute net-positive transfers (benefit − transfer cost).",
    why: "The demo ranks transfers by net value and transit time to mimic real cost-to-serve tradeoffs.",
    actions: [{ label: "Go to Inventory and execute top transfers", kind: "PLAYBOOK" }],
  })

  // 3) DC constraints
  if (worstDC) {
    const status = worstDC.u > 1.05 ? "over capacity" : worstDC.u > 0.95 ? "at risk" : "healthy"
    answers.push({
      question: "Which DC constraints will break the network next week?",
      answer: `${worstDC.dc.name} is ${status} (utilization ${(Math.min(1.5, worstDC.u) * 100).toFixed(0)}%).`,
      why: "Utilization is a transparent proxy: outbound volume / capacity. Toggle 'DC outage' to stress this further.",
      actions: [{ label: "Open Distribution + see mitigation levers", kind: "PLAYBOOK" }],
    })
  }

  // 4) Lane economics
  if (topLane) {
    answers.push({
      question: "Which lanes/carriers are costing us the most, and what changes pay back fastest?",
      answer: `${topLane.title} — est. $${Math.round(topLane.estValueAtRisk).toLocaleString()}/wk opportunity.`,
      why: topLane.detail,
      actions: [{ label: "Open Transportation and drill into options", kind: "PLAYBOOK" }],
    })
  }

  // 5) Disruption posture
  const active = Object.entries(state.scenario).filter(([_, v]) => v)
  answers.push({
    question: "In a disruption, what is the degraded-mode plan that keeps product moving?",
    answer: active.length
      ? `Active scenarios: ${active.map(([k]) => k).join(", ")}. Use Control Tower to reprioritize exceptions and run playbooks with tighter guardrails.`
      : "Turn on a scenario (e.g., DC outage / carrier disruption) and run live simulation to see cascading impacts and mitigation playbooks.",
    why: "In degraded mode, the app moves to exception-based decisions with explicit approval gates and spend/service caps.",
    actions: [{ label: "Open Scenario Simulator", kind: "PLAYBOOK" }],
  })

  return answers
}

export function topRebalanceTargets(state: DemoState, skuId: string, toNodeId?: string): Transfer[] {
  const transfers = proposeRebalancing(state, 18, skuId)
  return toNodeId ? transfers.filter((t) => t.toNodeId === toNodeId) : transfers
}
