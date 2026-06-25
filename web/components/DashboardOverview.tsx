'use client'

import React from 'react'
import Link from 'next/link'
import { DeviceWithLatest } from '@/types'
import { MetricCard } from '@/components/MetricCard'
import { StatusBadge } from '@/components/StatusBadge'
import { computeAlarmStatus, phaseEmaAvg } from '@/lib/leak'
import { useThresholds } from '@/components/ThresholdProvider'
import { Zap, CheckCircle, AlertTriangle, XCircle, Activity, ChevronRight, Clock } from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  devices: DeviceWithLatest[]
  metrics: {
    total: number
    normal: number
    warning: number
    critical: number
  }
}

export function DashboardOverview({ devices, metrics }: Props) {
  const { thresholds } = useThresholds()
  const { t, language } = useLanguage()
  const locale = language === 'id' ? idLocale : enUS

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title={t('total_trafo')} value={metrics.total} icon={<Zap size={18} />} color="blue" />
        <MetricCard title={t('normal')} value={metrics.normal} icon={<CheckCircle size={18} />} color="green" />
        <MetricCard title={t('warning')} value={metrics.warning} icon={<AlertTriangle size={18} />} color="yellow" />
        <MetricCard title={t('critical')} value={metrics.critical} icon={<XCircle size={18} />} color="red" />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          Daftar Perangkat Trafo
        </h2>
        
        {devices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-500">Belum ada trafo. Tambahkan trafo untuk mulai monitoring.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => {
              const r = device.latest_reading
              const status = computeAlarmStatus(r, thresholds)
              const avgRST = r ? ((phaseEmaAvg(r, 'R') + phaseEmaAvg(r, 'S') + phaseEmaAvg(r, 'T')) / 3 * 1000).toFixed(1) : '0'
              const name = device.description || `Trafo ${device.device_id}`
              
              let lastUpdateStr = 'Belum ada data'
              if (r?.timestamp) {
                lastUpdateStr = formatDistanceToNow(parseISO(r.timestamp), { addSuffix: true, locale })
              }

              return (
                <Link key={device.device_id} href={`/?device=${device.device_id}`}>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock size={12} /> {lastUpdateStr}
                        </p>
                      </div>
                      <StatusBadge status={status} size="sm" />
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Avg Arus (RST)</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-gray-900">{avgRST}</span>
                          <span className="text-xs font-medium text-gray-500">mA</span>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
