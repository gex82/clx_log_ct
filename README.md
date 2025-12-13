# Clorox Supply Chain Autopilot (Client Demo)

A client-ready **single-page decision app** that simulates a Clorox-like US transportation, distribution, and inventory network with **synthetic data** and transparent analytics.

**What you get**
- Control Tower (exceptions + economic prioritization + approve/execute)
- Executive Brief (exec-facing Q&A with recommended actions)
- Network (synthetic US geo view of plants/DCs with risk overlay)
- Transportation (carrier/tender recovery decisions)
- Distribution (DC throughput risk)
- Inventory (days-of-cover + net-value rebalancing)
- Scenario Simulator (disruptions + cascading impacts)
- Playbooks (agentic workflows + guardrails)
- Data Explorer + **Snapshot download**

This repo is **frontend-only** (no backend). All logic runs locally in the browser.

---

## Run locally

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

---

## Deploy on Cloudflare Pages (free)

1. Push this repo to GitHub.
2. In Cloudflare Pages:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. SPA routing is handled via `public/_redirects` (already included):

```
/*    /index.html   200
```

That’s it.

### If you deploy under a sub-path

Cloudflare Pages normally serves the project at the domain root (recommended). If you *do* serve it under a sub-path (rare on Pages, common on GitHub Pages), set a build-time env var:

- `VITE_ROUTER_BASENAME=/your-subpath`

This avoids React Router basename issues and keeps routing stable.

---

## Notes on realism

Synthetic:
- Nodes (plants/DCs), SKUs, carriers, lanes, demand history, inventory positions, shipment events.

Realistic “shape”:
- Multi-echelon topology (plants → DCs → customers)
- Lane economics (base + fuel index) and carrier performance (on-time probability)
- DC throughput constraints (proxy utilization)
- Inventory days-of-cover, service-level risk, and rebalancing flows
- Disruption scenario modifiers (outage/disruption/spike/degraded-mode)

---

## Suggested client demo flow (5–7 minutes)

1. **Executive Brief**: anchor the narrative (top questions → answer → action).
2. **Control Tower**: click into the #1 exception, approve an action, show state changes.
3. **Inventory**: pick a SKU, show DOC gaps, execute net-positive transfers.
4. **Transportation**: show expected total cost tender logic and execute a re-tender.
5. **Scenario Simulator**: toggle a disruption, hit **Run live**, watch reprioritization.

---

## Implementation guardrails (what this would connect to in production)

- TMS/WMS/ERP integration for execution (tenders, transfers, wave planning)
- Policy layer (service tiers, spend caps, customer priority rules)
- Optimization engines (MILP / stochastic) behind the same UI scaffolding
- Agentic orchestration with explicit approval gates + audit trail


---

## Guided demo mode (built-in)

- Open **Guided Demo** in the left nav (or click **Guided demo** in the top bar).
- A small overlay provides a **step-by-step talk track** and automatically navigates through the recommended flow.
- See `DEMO_SCRIPT.md` for a verbatim-friendly narrative.

---

## Policy guardrails (demo)

Open **Settings** (top bar) to configure:
- **Daily action spend cap (per sim day)** — blocks actions that exceed the cap
- **Max transfers per execution** — mimics operational constraints
- **Extra approval threshold** — surfaces “needs approval” badges for large actions

Settings persist locally so the demo feels stable in front of clients.

---

## Optional backend stub for audit persistence

This repo is deployable as a pure SPA, but includes an **optional** Cloudflare Pages Function stub at:

- `functions/api/events.ts`

Today it returns “stub (no persistence)”. In production, wire it to **D1 / KV / Durable Objects** plus auth + RBAC to persist:
- executed actions
- approvals
- user/session context
- policy checks
