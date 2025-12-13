// Cloudflare Pages Function stub (optional)
// This keeps the repo deployable as a pure SPA, while showing how we'd add audit persistence later.
// In production: wire to Durable Objects / D1 / KV + auth + RBAC.

export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ ok: true, note: "stub (no persistence)", events: [] }), {
    headers: { "content-type": "application/json" },
  })
}

export const onRequestPost: PagesFunction = async ({ request }) => {
  const body = await request.json().catch(() => ({}))
  return new Response(JSON.stringify({ ok: true, note: "stub (no persistence)", received: body }), {
    headers: { "content-type": "application/json" },
  })
}
