export type Region = "Northeast" | "Southeast" | "Midwest" | "Southwest" | "West"
export type NodeType = "PLANT" | "DC" | "CUSTOMER"

export type Node = {
  id: string
  name: string
  type: NodeType
  region: Region
  lat: number
  lon: number
}

export type SKUFamily = "Cleaning" | "Bags" | "Filtration" | "Condiments"
export type SKU = {
  id: string
  name: string
  family: SKUFamily
  unit: "case"
  marginPerCase: number
  cubePerCase: number
  perishRisk: number // 0..1 (used only for demo scoring)
}

export type Carrier = {
  id: string
  name: string
  baseOnTime: number // 0..1
  baseRateAdj: number // multiplier
}

export type Lane = {
  id: string
  originId: string
  destId: string
  miles: number
  baseCostPerMile: number
  mode: "TRUCK" | "INTERMODAL"
}

export type Shipment = {
  id: string
  laneId: string
  carrierId: string
  skuId: string
  qtyCases: number
  shipDay: number // simulation day index
  etaDay: number
  status: "PLANNED" | "IN_TRANSIT" | "DELIVERED" | "LATE"
  lateByDays: number
  priority: "STANDARD" | "PROTECT"
}

export type InventoryPosition = {
  nodeId: string
  skuId: string
  onHand: number
  onOrder: number
  inTransit: number
  targetDaysCover: number
}

export type DemandPoint = {
  day: number
  region: Region
  skuId: string
  demandCases: number
}

export type ScenarioToggles = {
  dcOutage: boolean
  carrierDisruption: boolean
  demandSpike: boolean
  cyberDegradedMode: boolean
}

export type DemoState = {
  seed: number
  today: number
  fuelIndex: number // 0.8..1.4 multiplier
  nodes: Node[]
  skus: SKU[]
  carriers: Carrier[]
  lanes: Lane[]
  shipments: Shipment[]
  inventory: InventoryPosition[]
  demandHistory: DemandPoint[]
  scenario: ScenarioToggles
}
