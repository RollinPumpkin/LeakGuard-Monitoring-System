'use client'

import React from 'react'
import { DeviceWithLatest } from '@/types'
import { StatusBadge } from './StatusBadge'
import {
  PHASES,
  phaseColor,
  phaseBg,
  phaseEma,
  phaseEmaAvg,
  formatMA,
  computeAlarmStatus,
} from '@/lib/leak'
import { Zap, ChevronRight, AlertTriangle } from 'lucide-react'
import { useThresholds } from './ThresholdProvider'
import { useLanguage } from '@/contexts/LanguageContext'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'

interface Props {
  device: DeviceWithLatest
  onClick: (device: DeviceWithLatest) => void
}

export function TrafoCard({ device, onClick }: Props) {
  const { thresholds } = useThresholds()
  const { t, language } = useLanguage()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const r = device.latest_reading
  const status = computeAlarmStatus(r, thresholds)
  const timeStr = r?.timestamp || r?.created_at

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <Zap size={16} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">{device.device_id}</p>
            <p className="text-[11px] text-gray-400">
              {device.location || device.description || '—'} 
              {mounted && timeStr ? (
                <span className="ml-1">
                  • {format(parseISO(timeStr), 'dd MMM yyyy HH:mm', { locale: language === 'id' ? idLocale : enUS })}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      {!r ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">
          {t('no_data')}
        </div>
      ) : (
        <div className="p-5 space-y-4">
          {/* EMA per fasa R/S/T (3 sensor) */}
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-gray-400 mb-2">
              EMA R / S / T
            </p>
            <div className="grid grid-cols-3 gap-3">
              {PHASES.map((phase) => (
                <div
                  key={phase}
                  className={`rounded-xl border p-3 ${phaseBg[phase]}`}
                >
                  <p className={`text-xs font-bold mb-2 ${phaseColor[phase]}`}>
                    {t('phase')} {phase} <span className="text-[10px] font-normal text-gray-400">(mA)</span>
                  </p>
                  <div className="space-y-1.5">
                    {phaseEma(r, phase).map((v, i) => {
                      const amp = Number(v)
                      let valColor = 'text-gray-800'
                      let showWarning = false
                      if (amp >= thresholds.critical) {
                        valColor = 'text-red-600 font-bold'
                        showWarning = true
                      } else if (amp >= thresholds.warning) {
                        valColor = 'text-yellow-600 font-bold'
                        showWarning = true
                      }
                      
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-400 flex items-center gap-1">
                            {phase}{i + 1}
                            {showWarning && <AlertTriangle size={10} className={valColor} />}
                          </span>
                          <span className={`font-medium ${valColor}`}>
                            {formatMA(v).replace(' mA', '')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Average EMA R/S/T */}
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-gray-400 mb-2">
              {t('average_ema')}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {PHASES.map((phase) => (
                <div
                  key={phase}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"
                >
                  <p className={`text-xs font-semibold mb-1 ${phaseColor[phase]}`}>
                    {phase}
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatMA(phaseEmaAvg(r, phase))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Prediction (placeholder) + detail */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-gray-400">
              {t('prediction')}:{' '}
              <span className="font-medium text-gray-500">
                {device.latest_prediction?.rf_status ?? t('model_maintenance')}
              </span>
            </div>
            <button
              onClick={() => onClick(device)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {t('detail')}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
