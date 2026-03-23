"use client"

interface BarChartProps {
  data: Array<{
    day: string
    sales: number
    purchases: number
  }>
  height?: number
}

export function BarChart({ data, height = 300 }: BarChartProps) {
  if (!data || data.length === 0) {
    return <div>No data available</div>
  }

  /* old max value calculation
  const maxValue = Math.max(...data.flatMap((d) => [d.sales, d.purchases]))
  const yAxisMax = Math.ceil(maxValue / 500) * 500
  const maxValue = Math.max(...data.flatMap((d) => [d.sales, d.purchases])) * 1.2;
  const yAxisMax = Math.ceil(maxValue / 100) * 100; // Rounds to nearest 100
  */
  // Calculate max value with buffer (20% higher than actual max for headroom)
  const maxValue = Math.max(...data.flatMap((d) => [d.sales, d.purchases]))
  const yAxisMax = maxValue * 1.1 // Add 10% padding above highest value

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox="0 0 500 300" className="overflow-visible">
        {/* Y-axis */}
        {Array.from({ length: 5 }).map((_, i) => {
          const value = Math.round((yAxisMax / 4) * i)
          return (
            <g key={value}>
              <text
                x="30"
                y={280 - (value / yAxisMax) * 240}
                className="text-xs fill-gray-500"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {value}
              </text>
              <line
                x1="40"
                y1={280 - (value / yAxisMax) * 240}
                x2="480"
                y2={280 - (value / yAxisMax) * 240}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            </g>
          )
        })}
        {/* Bars */}
        {data.map((item, index) => {
          const x = 60 + index * 60
          //const salesHeight = (item.sales / 2800) * 240
          //const purchasesHeight = (item.purchases / 2800) * 240
          const salesHeight = (item.sales / yAxisMax) * 240
          const purchasesHeight = (item.purchases / yAxisMax) * 240

          return (
            <g key={item.day}>
              {/* Sales bar (green) */}
              <rect x={x} y={280 - salesHeight} width="20" height={salesHeight} fill="#10b981" rx="2" />
              {/* Purchases bar (purple) */}
              <rect x={x + 25} y={280 - purchasesHeight} width="20" height={purchasesHeight} fill="#8b5cf6" rx="2" />
              {/* X-axis label */}
              <text x={x + 22.5} y={295} className="text-xs fill-gray-600" textAnchor="middle">
                {item.day}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center mt-4 space-x-6">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
          <span className="text-sm text-gray-600">Sales</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
          <span className="text-sm text-gray-600">Purchases</span>
        </div>
      </div>
    </div>
  )
}
