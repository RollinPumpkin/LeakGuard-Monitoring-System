'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DeviceWithLatest } from '@/types'
import { HealthCard } from '@/components/HealthCard'
import { loadDevicesWithLatest } from '@/lib/data'
import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export default function DeviceHealthPage() {
  const [devices, setDevices] = useState<DeviceWithLatest[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

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
      .channel('health-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        () => refresh()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refresh])

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Status Alat</h1>
            <p className="text-xs text-gray-500">
              Baterai, WiFi, RTC/Waktu, dan kondisi sistem alat monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {format(lastUpdate, 'EEEE, d MMMM yyyy', { locale: idLocale })}
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
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
            <p className="text-sm text-gray-500 mt-4">Memuat status alat...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-500">Belum ada alat terdaftar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {devices.map((device) => (
              <HealthCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
