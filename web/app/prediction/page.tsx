'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DeviceWithLatest } from '@/types'
import { loadDevicesWithLatest } from '@/lib/data'
import { RefreshCw, Zap, AlertTriangle, ShieldCheck, Activity } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import PredictionDetails from '@/components/PredictionDetails'

export default function PredictionPage() {
  const [devices, setDevices] = useState<DeviceWithLatest[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { t, language } = useLanguage()

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const data = await loadDevicesWithLatest()
      setDevices(data)
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      const data = await loadDevicesWithLatest()
      if (!active) return
      setDevices(data)
      setLastUpdate(new Date())
      setLoading(false)
    })()
    
    return () => { active = false }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('prediction-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'predictions' },
        () => refresh()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refresh])

  return (
    <div className="min-h-screen bg-gray-50/30">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Prediction Behavior</h1>
            <p className="text-xs text-gray-500">
              Analisis cerdas pola kebocoran arus menggunakan Random Forest
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {format(lastUpdate, 'EEEE, d MMMM yyyy', { locale: language === 'id' ? idLocale : enUS })}
            </span>
            <button
              onClick={() => refresh(true)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
            <p className="text-sm text-gray-500 mt-4">{t('loading')}</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <p className="text-sm text-gray-500">{t('no_data')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {devices.map((device) => {
              const pred = device.latest_prediction
              const isNormal = !pred?.rf_status || pred.rf_status === 'Normal'
              const isWarning = pred?.rf_status === 'Warning'
              
              return (
                <div key={device.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  {/* Card Header */}
                  <div className={`px-5 py-4 border-b ${isNormal ? 'bg-green-50/50 border-green-100' : isWarning ? 'bg-yellow-50/50 border-yellow-100' : 'bg-red-50/50 border-red-100'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isNormal ? 'bg-green-100 text-green-600' : isWarning ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                        {isNormal ? <ShieldCheck size={20} /> : isWarning ? <AlertTriangle size={20} /> : <Zap size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{device.device_id}</h3>
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5">{device.location || 'Lokasi tidak diset'}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${isNormal ? 'bg-green-50 text-green-700 border-green-200' : isWarning ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {pred?.rf_status || 'Normal'}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Diagnosis Sistem</p>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        {pred?.action || 'Sistem beroperasi normal. Tidak ada anomali atau tren kebocoran berbahaya yang terdeteksi oleh model.'}
                      </p>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Confidence Score</p>
                        <p className="text-sm font-bold text-gray-900">
                          {pred?.confidence ? `${(pred.confidence).toFixed(1)}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Update Terakhir</p>
                        <p className="text-sm font-bold text-gray-900">
                          {pred?.timestamp ? format(parseISO(pred.timestamp), 'HH:mm:ss') : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable / Attached Chart and Logs */}
                  <PredictionDetails deviceId={device.device_id} />
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
