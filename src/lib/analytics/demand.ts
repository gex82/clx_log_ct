import { DemandPoint, Region } from "../data/schema"
import { avg } from "../utils"
import { clamp } from "../format"

export type Forecast = { region: Region; skuId: string; next7d: number; next28d: number; alpha: number }

export function forecastDemand(hist: DemandPoint[], region: Region, skuId: string, alpha = 0.35): Forecast {
  const series = hist.filter(d=>d.region===region && d.skuId===skuId).sort((a,b)=>a.day-b.day).map(d=>d.demandCases)
  if (!series.length) return { region, skuId, next7d: 0, next28d: 0, alpha }
  let level = series[0]
  for (let i=1;i<series.length;i++){
    level = alpha*series[i] + (1-alpha)*level
  }
  // Simple weekly seasonality proxy via last 7 days mean
  const last7 = series.slice(-7)
  const weekly = avg(last7) * 7
  const base7 = clamp(weekly, 0, weekly*1.35)
  const next7d = Math.round(base7)
  const next28d = Math.round(base7 * 4)
  return { region, skuId, next7d, next28d, alpha }
}
