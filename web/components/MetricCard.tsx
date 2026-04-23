'use client'

import React from 'react'

interface MetricCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red'
}

const colorStyles: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-600',
  green: 'bg-green-50 border-green-200 text-green-600',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
  red: 'bg-red-50 border-red-200 text-red-600',
}

const colorIconMap: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
}

export function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const bgClass = colorStyles[color] || colorStyles.blue
  const iconClass = colorIconMap[color] || colorIconMap.blue

  return (
    <div className={`${bgClass} rounded-xl border p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`${iconClass} opacity-80`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
