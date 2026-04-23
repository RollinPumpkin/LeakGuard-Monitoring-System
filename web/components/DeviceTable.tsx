'use client'

import React from 'react'
import { DeviceWithLatest } from '@/types'
import { StatusBadge } from './StatusBadge'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { ChevronRight } from 'lucide-react'

interface DeviceTableProps {
  devices: DeviceWithLatest[]
  onRowClick: (device: DeviceWithLatest) => void
  isLoading: boolean
}

export function DeviceTable({ devices, onRowClick, isLoading }: DeviceTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
        <p className="text-sm text-gray-500 mt-4">Loading devices...</p>
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No devices found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Device ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Latest Reading (mA)
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Prediction
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Updated
            </th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr
              key={device.id}
              className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => onRowClick(device)}
            >
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                {device.device_id}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {device.device_type}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {device.location || '—'}
              </td>
              <td className="px-6 py-4">
                {device.latest_reading?.alarm_status ? (
                  <StatusBadge status={device.latest_reading.alarm_status} size="sm" />
                ) : (
                  <span className="text-sm text-gray-400">No data</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {device.latest_reading
                  ? `${Number(device.latest_reading.ch1_mA).toFixed(1)}`
                  : '—'}
              </td>
              <td className="px-6 py-4">
                {device.latest_prediction?.rf_status ? (
                  <StatusBadge status={device.latest_prediction.rf_status} size="sm" />
                ) : (
                  <span className="text-sm text-gray-400">Pending</span>
                )}
              </td>
              <td className="px-6 py-4 text-xs text-gray-500">
                {device.latest_reading?.timestamp
                  ? format(parseISO(device.latest_reading.timestamp), 'dd MMM HH:mm', {
                      locale: idLocale,
                    })
                  : '—'}
              </td>
              <td className="px-6 py-4 text-gray-400 hover:text-blue-600">
                <ChevronRight size={18} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
