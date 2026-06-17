'use client'
import React from 'react'
import { DeviceWithLatest } from '@/types'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Activity } from 'lucide-react'

interface Props { device: DeviceWithLatest | null; isLive: boolean }

export function SystemStatusBar({ device, isLive }: Props) {
  const r = device?.latest_reading
  const ts = r?.timestamp
    ? format(parseISO(r.timestamp), 'dd MMM yyyy, HH:mm:ss', { locale: idLocale })
    : 'Belum ada data'

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3
      flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <div className="flex items-center gap-2">
        {isLive ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-green-600 font-semibold text-xs">LIVE</span>
          </>
        ) : (
          <>
            <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            <span className="text-gray-400 text-xs">OFFLINE</span>
          </>
        )}
      </div>
      <div className="h-4 w-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <Activity size={14} className="text-gray-400" />
        <span className="text-gray-500">Device:</span>
        <span className="font-semibold text-gray-800">{device?.device_id ?? '—'}</span>
      </div>
      {device?.location && (
        <><div className="h-4 w-px bg-gray-200" />
        <span className="text-gray-500">Lokasi: <span className="text-gray-800">{device.location}</span></span></>
      )}
      <div className="h-4 w-px bg-gray-200" />
      <span className="text-gray-500">Trend: <span className="text-gray-800 font-medium">{r?.trend ?? '—'}</span></span>
      <span className="text-gray-500">Alarm: <span className={`font-medium ${
        r?.alarm_status === 'Warning' ? 'text-yellow-600' :
        r?.alarm_status === 'Critical' ? 'text-red-600' : 'text-green-600'}`}>
        {r?.alarm_status ?? '—'}
      </span></span>
      <div className="ml-auto text-xs text-gray-400">Update: {ts}</div>
    </div>
  )
}
