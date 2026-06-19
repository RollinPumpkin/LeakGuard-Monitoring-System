'use client'

import React from 'react'
import { DeviceWithLatest } from '@/types'
import {
  Battery, Wifi, WifiOff, Clock, HardDrive, Cpu, CircleCheck, CircleX,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  device: DeviceWithLatest
  onClick?: (device: DeviceWithLatest) => void
}

function statusPill(ok: boolean, okText: string, badText: string) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        ok ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {ok ? <CircleCheck size={14} /> : <CircleX size={14} />}
      {ok ? okText : badText}
    </span>
  )
}

export function HealthCard({ device, onClick }: Props) {
  const { t, language } = useLanguage()
  const r = device.latest_reading

  const batt = Number(r?.battery_percent ?? 0)
  const battColor =
    batt >= 60 ? 'text-green-600' : batt >= 25 ? 'text-yellow-600' : 'text-red-600'
  const wifiOk = (r?.wifi_status ?? 0) === 1
  const rtcOk = (r?.rtc_status ?? 0) === 1
  const sdOk = (r?.sd_status ?? 0) === 1
  const sysOk = (r?.system_status ?? 0) === 1

  return (
    <div 
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}`}
      onClick={() => onClick?.(device)}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gray-900 rounded-lg">
            <Cpu size={16} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">{device.device_id}</p>
            <p className="text-[11px] text-gray-400">{device.location || '—'}</p>
          </div>
        </div>
        {statusPill(sysOk, t('system_ok'), t('system_error'))}
      </div>

      {!r ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">
          {t('no_data')}
        </div>
      ) : (
        <div className="p-5 grid grid-cols-2 gap-4">
          {/* Baterai */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Battery size={16} />
              <span className="text-xs font-semibold">{t('battery')}</span>
            </div>
            <p className={`text-2xl font-bold ${battColor}`}>{batt.toFixed(0)}%</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {Number(r.battery_v ?? 0).toFixed(2)} V
            </p>
          </div>

          {/* WiFi */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              {wifiOk ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span className="text-xs font-semibold">WiFi</span>
            </div>
            <div className="mb-1">{statusPill(wifiOk, t('connected'), t('disconnected'))}</div>
            <p className="text-[11px] text-gray-400">
              RSSI: {r.wifi_rssi ?? '—'} dBm
            </p>
          </div>

          {/* RTC / Waktu */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Clock size={16} />
              <span className="text-xs font-semibold">{t('rtc_time')}</span>
            </div>
            <div className="mb-1">{statusPill(rtcOk, 'RTC OK', 'RTC Error')}</div>
            <p className="text-[11px] text-gray-400">
              {format(parseISO(r.timestamp), 'dd MMM yyyy HH:mm:ss', { locale: language === 'id' ? idLocale : enUS })}
            </p>
          </div>

          {/* SD Card */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <HardDrive size={16} />
              <span className="text-xs font-semibold">{t('sd_storage')}</span>
            </div>
            <div className="mb-1">{statusPill(sdOk, 'SD OK', 'SD Error')}</div>
            <p className="text-[11px] text-gray-400">
              Device {(r.device_ready ?? 0) === 1 ? 'Ready' : 'Not Ready'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
