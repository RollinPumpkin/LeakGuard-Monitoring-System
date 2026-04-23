'use client'

import React from 'react'
import type { AlarmStatus } from '@/types'

interface StatusBadgeProps {
  status: AlarmStatus
  size?: 'sm' | 'md'
}

const statusStyles: Record<AlarmStatus, string> = {
  Normal: 'bg-green-100 text-green-700 ring-green-200',
  Warning: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  Critical: 'bg-red-100 text-red-700 ring-red-200',
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-0.5 text-xs'
    : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${sizeClasses} ${statusStyles[status]}`}
    >
      {status}
    </span>
  )
}