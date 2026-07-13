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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {devices.map((device) => {
              const r = device.latest_reading
              const status = computeAlarmStatus(r, thresholds)
              
              const avgR = r ? (phaseEmaAvg(r, 'R') * 1000).toFixed(1) : '0.0'
              const avgS = r ? (phaseEmaAvg(r, 'S') * 1000).toFixed(1) : '0.0'
              const avgT = r ? (phaseEmaAvg(r, 'T') * 1000).toFixed(1) : '0.0'
              
              const name = device.description || `Trafo ${device.device_id}`
              
              let lastUpdateStr = 'Belum ada data'
              if (r?.timestamp) {
                lastUpdateStr = formatDistanceToNow(parseISO(r.timestamp), { addSuffix: true, locale })
              }

              return (
                <Link key={device.device_id} href={`/?device=${device.device_id}`}>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-600 text-white p-3.5 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                          <Zap size={22} fill="currentColor" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 tracking-wide uppercase">TRAFO-{device.device_id}</h3>
                          <p className="text-sm text-gray-500 font-medium">{name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={status} size="md" />
                        {r?.timestamp && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                            <Clock size={10} />
                            {format(parseISO(r.timestamp), 'dd MMM yyyy, HH:mm:ss', { locale })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* EMA R / S / T Section */}
                    <div className="mb-2">
                      <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-3">EMA R / S / T</p>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Fasa R */}
                        <div className="bg-red-50/50 border border-red-100 rounded-xl p-3">
                          <h4 className="text-sm font-bold text-red-600 mb-2">Fasa R</h4>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">R1</span><span className="font-semibold text-gray-700">{((r?.r1 || 0) * 1000).toFixed(1)} mA</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">R2</span><span className="font-semibold text-gray-700">{((r?.r2 || 0) * 1000).toFixed(1)} mA</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">R3</span><span className="font-semibold text-gray-700">{((r?.r3 || 0) * 1000).toFixed(1)} mA</span></div>
                          </div>
                        </div>
                        {/* Fasa S */}
                        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                          <h4 className="text-sm font-bold text-amber-600 mb-2">Fasa S</h4>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">S1</span><span className="font-semibold text-gray-700">{((r?.s1 || 0) * 1000).toFixed(1)} mA</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">S2</span><span className="font-semibold text-gray-700">{((r?.s2 || 0) * 1000).toFixed(1)} mA</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">S3</span><span className="font-semibold text-gray-700">{((r?.s3 || 0) * 1000).toFixed(1)} mA</span></div>
                          </div>
                        </div>
                        {/* Fasa T */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                          <h4 className="text-sm font-bold text-blue-600 mb-2">Fasa T</h4>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">T1</span><span className="font-semibold text-gray-700">{((r?.t1 || 0) * 1000).toFixed(1)} mA</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">T2</span><span className="font-semibold text-gray-700">{((r?.t2 || 0) * 1000).toFixed(1)} mA</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">T3</span><span className="font-semibold text-gray-700">{((r?.t3 || 0) * 1000).toFixed(1)} mA</span></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AVERAGE EMA Section */}
                    <div className="mb-6 mt-4">
                      <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-3">Average EMA</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white border border-gray-100 shadow-sm rounded-xl py-3 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-red-600 mb-0.5">R</span>
                          <span className="text-base font-black text-gray-800">{avgR} <span className="text-xs font-semibold text-gray-500">mA</span></span>
                        </div>
                        <div className="bg-white border border-gray-100 shadow-sm rounded-xl py-3 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-amber-600 mb-0.5">S</span>
                          <span className="text-base font-black text-gray-800">{avgS} <span className="text-xs font-semibold text-gray-500">mA</span></span>
                        </div>
                        <div className="bg-white border border-gray-100 shadow-sm rounded-xl py-3 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 mb-0.5">T</span>
                          <span className="text-base font-black text-gray-800">{avgT} <span className="text-xs font-semibold text-gray-500">mA</span></span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-gray-500">Prediksi: </span>
                        <span className={`font-semibold ${device.latest_prediction?.rf_status === 'Critical' ? 'text-red-600' : device.latest_prediction?.rf_status === 'Warning' ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {device.latest_prediction?.rf_status || 'Model dalam perbaikan'}
                        </span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
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
