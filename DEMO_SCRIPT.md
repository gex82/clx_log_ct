# Demo Script (5–7 minutes)

This is a **client-ready** talk track + clickpath for the **Supply Chain Autopilot** demo.

## Recommended clickpath

1. **Guided Demo** → click **Start guided demo**
2. **Executive Brief** → highlight “what decisions matter today”
3. **Control Tower** → approve **one** action (re-tender OR inventory transfer)
4. **Inventory** → show DOC and “net-value transfers” (policy guardrails)
5. **Transportation** → show carrier tradeoffs (expected total cost)
6. **Scenario Simulator** → flip one disruption and show re-prioritization
7. **Network** → show dominant flows + inter-DC pooling

Tip: run the sim live for ~15 seconds on 1–2 pages to make it feel “live”.

---

## Step-by-step talk track (verbatim-friendly)

### 1) Guided Demo (30s)
- “This demo is synthetic, but the logic mirrors reality: live signals → decisions → governed execution.”
- “The guided overlay gives a consistent narrative and highlights where we’d connect to TMS/WMS/ERP.”

### 2) Executive Brief (45–60s)
- “This is the exec entry point: we translate noise into a prioritized list of decisions.”
- “We rank by value-at-risk and service risk so leadership sees what *matters now*.”
- “The key is closed loop: every decision becomes an auditable action, and the state changes immediately.”

### 3) Control Tower (90s)
- “These are the day-to-day exceptions ranked by value-at-risk.”
- “Pick a late-shipment risk: the recommendation is ranked by **expected total cost** = freight + (late probability × penalty).”
- “I’ll approve one action and you’ll see inventory/shipments update and an audit log entry created.”

**Do:** Approve **one** re-tender OR rebalancing batch.

### 4) Inventory (60–90s)
- “We show days-of-cover by DC for a single SKU: service risk vs carrying risk.”
- “Recommended transfers are ranked by **net value** = benefit − transfer cost, including transit days.”
- “Guardrails are explicit: daily spend cap, batch-size limits, and extra-approval thresholds.”

### 5) Transportation (45–60s)
- “Here’s the carrier decision logic: on-time probability and rate adjustment.”
- “When disruption hits, we recompute late risk and re-rank decisions immediately.”

### 6) Scenario Simulator (45–60s)
- “Toggle one disruption (DC outage, carrier disruption, demand spike, cyber degraded mode).”
- “Notice how the system doesn’t ‘break’ — it reprioritizes exceptions and changes recommended actions.”

### 7) Network (30–45s)
- “This makes it real: where stress concentrates and which lanes dominate.”
- “Inter-DC flows represent pooling / transfer moves to protect service during volatility.”

---

## What’s “agentic” here (without hype)

- **Sense:** continuously ingests demand/transport signals and re-scores risk.
- **Decide:** selects best action using transparent expected-cost math + constraints.
- **Act (governed):** executes only within policy (spend caps, thresholds) and creates an audit log.
- **Learn:** state updates immediately so the next decision uses the newest reality.

## Policy guardrails (demo)

- Daily action spend cap
- Max transfers per batch
- Extra approval threshold (badge)

In production, these policies would be centrally managed (RBAC + approvals + audit persistence).

