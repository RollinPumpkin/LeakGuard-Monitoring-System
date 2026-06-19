'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DeviceWithLatest } from '@/types'
import { MetricCard } from '@/components/MetricCard'
import { TrafoCard } from '@/components/TrafoCard'
import { TrafoDetailModal } from '@/components/TrafoDetailModal'
import { AddTrafoModal } from '@/components/AddTrafoModal'
import { SettingsModal } from '@/components/SettingsModal'
import { useThresholds } from '@/components/ThresholdProvider'
import { loadDevicesWithLatest } from '@/lib/data'
import { computeAlarmStatus } from '@/lib/leak'
import { Zap, CheckCircle, AlertTriangle, XCircle, RefreshCw, Plus, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export default function DashboardPage() {
  const [devices, setDevices] = useState<DeviceWithLatest[]>([])
  const [selected, setSelected] = useState<DeviceWithLatest | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  const { thresholds } = useThresholds()

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
    
    // Auto-cleanup data lama di background
    fetch('/api/cleanup').catch(console.error)
    
    return () => { active = false }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('readings-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        () => refresh()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refresh])

  const statuses = devices.map((d) => computeAlarmStatus(d.latest_reading, thresholds))
  const metrics = {
    total: devices.length,
    normal: statuses.filter((s) => s === 'Normal').length,
    warning: statuses.filter((s) => s === 'Warning').length,
    critical: statuses.filter((s) => s === 'Critical').length,
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Monitoring Arus Bocor
            </h1>
            <p className="text-xs text-gray-500">
              Arus bocor kabel outgoing 20kV fasa R / S / T (EMA)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {format(lastUpdate, 'EEEE, d MMMM yyyy', { locale: idLocale })}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Pengaturan Parameter Alarm"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => refresh(true)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Plus size={15} />
              Tambah Trafo
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Total Trafo" value={metrics.total} icon={<Zap size={18} />} color="blue" />
          <MetricCard title="Normal" value={metrics.normal} icon={<CheckCircle size={18} />} color="green" />
          <MetricCard title="Warning" value={metrics.warning} icon={<AlertTriangle size={18} />} color="yellow" />
          <MetricCard title="Critical" value={metrics.critical} icon={<XCircle size={18} />} color="red" />
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
            <p className="text-sm text-gray-500 mt-4">Memuat data trafo...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-500">Belum ada trafo. Tambahkan trafo untuk mulai monitoring.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {devices.map((device) => (
              <TrafoCard key={device.id} device={device} onClick={setSelected} />
            ))}
          </div>
        )}
      </main>

      {selected && (
        <TrafoDetailModal device={selected} onClose={() => setSelected(null)} />
      )}
      {showAdd && (
        <AddTrafoModal onClose={() => setShowAdd(false)} onAdded={() => refresh(true)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
