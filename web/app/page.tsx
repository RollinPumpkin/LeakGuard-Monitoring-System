'use client'
import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DeviceWithLatest } from '@/types'
import { MetricCard } from '@/components/MetricCard'
import { SingleTrafoDashboard } from '@/components/SingleTrafoDashboard'
import { AddTrafoModal } from '@/components/AddTrafoModal'
import { SettingsModal } from '@/components/SettingsModal'
import { useThresholds } from '@/components/ThresholdProvider'
import { loadDevicesWithLatest } from '@/lib/data'
import { computeAlarmStatus } from '@/lib/leak'
import { Zap, CheckCircle, AlertTriangle, XCircle, RefreshCw, Plus, Settings, Menu, X as XIcon } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { Sidebar } from '@/components/Sidebar'
import { useLanguage } from '@/contexts/LanguageContext'

function DashboardContent() {
  const searchParams = useSearchParams()
  const [devices, setDevices] = useState<DeviceWithLatest[]>([])
  const [selected, setSelected] = useState<DeviceWithLatest | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const { thresholds } = useThresholds()
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
    
    // Auto-cleanup data lama di background
    fetch('/api/cleanup').catch(console.error)
    
    return () => { active = false }
  }, [])

  useEffect(() => {
    const deviceQuery = searchParams.get('device')
    if (devices.length > 0) {
      if (deviceQuery) {
        const found = devices.find(d => d.device_id === deviceQuery)
        if (found) {
          setSelected(found)
        } else {
          setSelected(devices[0])
        }
      } else {
        setSelected(devices[0])
      }
    } else {
      setSelected(null)
    }
  }, [searchParams, devices])

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
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 md:px-6 h-auto py-4 md:h-20 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
              {t('leak_monitoring')}
            </h1>
            <p className="text-[10px] md:text-sm text-gray-500 mt-0.5">
              {t('leak_desc')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <span className="text-xs text-gray-400 hidden lg:inline-block mr-2">
              {format(lastUpdate, 'EEEE, d MMMM yyyy', { locale: language === 'id' ? idLocale : enUS })}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('settings')}
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => refresh(true)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={t('refresh')}
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{t('add_trafo')}</span>
            </button>
        </div>
      </header>

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 bg-white h-full flex flex-col shadow-xl animate-in slide-in-from-left">
            <button 
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 z-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <XIcon size={18} />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <MetricCard title={t('total_trafo')} value={metrics.total} icon={<Zap size={18} />} color="blue" />
          <MetricCard title={t('normal')} value={metrics.normal} icon={<CheckCircle size={18} />} color="green" />
          <MetricCard title={t('warning')} value={metrics.warning} icon={<AlertTriangle size={18} />} color="yellow" />
          <MetricCard title={t('critical')} value={metrics.critical} icon={<XCircle size={18} />} color="red" />
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
        ) : selected ? (
          <SingleTrafoDashboard 
            device={selected} 
            onDeleted={() => {
              setSelected(null)
              if (searchParams.has('device')) {
                window.history.replaceState(null, '', '/')
              }
              refresh(true)
            }} 
          />
        ) : null}
      </main>

      {showAdd && (
        <AddTrafoModal onClose={() => setShowAdd(false)} onAdded={() => refresh(true)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
