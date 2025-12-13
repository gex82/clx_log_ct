export type GuidedStep = {
  id: string
  title: string
  route: string
  objective: string
  talkTrack: string[]
  primaryAction?: string
}

export const GUIDED_STEPS: GuidedStep[] = [
  {
    id: "exec",
    title: "Executive Brief",
    route: "/executive-brief",
    objective: "Anchor the narrative: top questions → answers → recommended actions.",
    talkTrack: [
      "This is the executive entry point: we translate signals into decisions, prioritized by $ and service risk.",
      "Each card answers a key question (service risk, inventory positioning, transport reliability) and proposes a next best action.",
      "We then drop into the Control Tower to execute one action and show the system learning loop (state changes + audit trail).",
    ],
    primaryAction: "Open Executive Brief",
  },
  {
    id: "tower",
    title: "Control Tower",
    route: "/",
    objective: "Show the ranked exceptions and approve one action with explainability.",
    talkTrack: [
      "Exceptions are ranked by value-at-risk first, then risk score. This is where teams spend their time daily.",
      "Pick a late-shipment risk: options are ranked by expected total cost = freight + (late probability × penalty).",
      "Approve a re-tender or rebalancing action; the state updates immediately (shipments/inventory) and logs the decision.",
    ],
    primaryAction: "Open Control Tower",
  },
  {
    id: "inv",
    title: "Inventory Rebalancing",
    route: "/inventory",
    objective: "Demonstrate days-of-cover, net-value transfers, and policy guardrails.",
    talkTrack: [
      "DOC is computed using demand sensing (next 7 days) and multi-echelon inventory visibility.",
      "Transfer candidates are ranked by net value = benefit − transfer cost (with transit days).",
      "Guardrails are explicit: daily spend cap, max transfers per batch, and extra-approval thresholds.",
    ],
    primaryAction: "Open Inventory",
  },
  {
    id: "trans",
    title: "Transportation Decisions",
    route: "/transportation",
    objective: "Show carrier tradeoffs and retender logic under disruption.",
    talkTrack: [
      "We score carriers by on-time probability and rate adjustment, and recompute late risk under scenarios.",
      "The decision metric is expected total cost, so service and cost are unified in one number.",
      "In production, this is where we’d connect to the TMS to retender and manage appointments.",
    ],
    primaryAction: "Open Transportation",
  },
  {
    id: "scen",
    title: "Scenario Simulator",
    route: "/scenarios",
    objective: "Prove resiliency: disruptions re-rank priorities and trigger playbooks.",
    talkTrack: [
      "Toggle a disruption (DC outage, carrier disruption, demand spike, cyber degraded mode).",
      "Run live and watch exceptions and KPIs shift; the system doesn’t break — it reprioritizes.",
      "This is the backbone for operational resilience: explicit degraded-mode playbooks and recovery actions.",
    ],
    primaryAction: "Open Scenarios",
  },
  {
    id: "net",
    title: "Network View",
    route: "/network",
    objective: "Make it real: show where stress concentrates and the dominant flows.",
    talkTrack: [
      "The network view shows plants/DCs and overlays stress from low cover and disruptions.",
      "Optional flow overlay highlights the most active lanes (including inter-DC pooling moves).",
      "This helps leaders quickly see where to invest capacity and where to rebalance inventory positioning.",
    ],
    primaryAction: "Open Network",
  },
]
