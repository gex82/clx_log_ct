export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function pick<T>(arr: T[], r = Math.random()): T {
  return arr[Math.floor(r * arr.length)]
}

export function sum(arr: number[]): number { return arr.reduce((a,b)=>a+b, 0) }

export function avg(arr: number[]): number { return arr.length ? sum(arr)/arr.length : 0 }

export function seededRng(seed: number): () => number {
  // Mulberry32
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
