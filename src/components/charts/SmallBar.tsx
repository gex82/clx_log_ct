import React from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts"

export default function SmallBar({
  data,
  xKey,
  yKey,
}: {
  data: any[]
  xKey: string
  yKey: string
}) {
  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={0} />
          <Tooltip />
          <Bar dataKey={yKey} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
