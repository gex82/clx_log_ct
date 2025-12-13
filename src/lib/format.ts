export function fmtInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}
export function fmt1(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(n)
}
export function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`
}
export function fmtMoney(n: number): string {
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${sign}$${(abs/1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs/1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
