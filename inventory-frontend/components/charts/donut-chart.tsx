"use client"

interface DonutChartProps {
  data: Array<{
    label: string
    value: number
    color: string
  }>
  size?: number
}

export function DonutChart({ data, size = 200 }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = size / 2 - 20
  const innerRadius = radius * 0.6
  const centerX = size / 2
  const centerY = size / 2

  let currentAngle = -90 // Start from top

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size}>
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100
            const angle = (item.value / total) * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle

            const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
            const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)

            const x3 = centerX + innerRadius * Math.cos((startAngle * Math.PI) / 180)
            const y3 = centerY + innerRadius * Math.sin((startAngle * Math.PI) / 180)
            const x4 = centerX + innerRadius * Math.cos((endAngle * Math.PI) / 180)
            const y4 = centerY + innerRadius * Math.sin((endAngle * Math.PI) / 180)

            const largeArcFlag = angle > 180 ? 1 : 0

            const pathData = [
              `M ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `L ${x4} ${y4}`,
              `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x3} ${y3}`,
              "Z",
            ].join(" ")

            currentAngle += angle

            return <path key={index} d={pathData} fill={item.color} />
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between min-w-[120px]">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
