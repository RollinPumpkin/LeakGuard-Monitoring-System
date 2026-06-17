'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DeviceWithLatest } from '@/types'
import { MetricCard } from '@/components/MetricCard'
import { DeviceTable } from '@/components/DeviceTable'
import { DeviceModal } from '@/components/DeviceModal'
import { Zap, CheckCircle, AlertTriangle, XCircle, Search, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export default function DashboardPage() {
  const [devices, setDevices]         = useState<DeviceWithLatest[]>([])
  const [filtered, setFiltered]       = useState<DeviceWithLatest[]>([])
  const [selected, setSelected]       = useState<DeviceWithLatest | null>(null)
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [lastUpdate, setLastUpdate]   = useState<Date>(new Date())

  const loadDevices = useCallback(async () => {
    setLoading(true)
    try {
      // Ambil semua devices
      const { data: devData } = await supabase
        .from('devices')
        .select('*')
        .eq('is_active', true)
        .order('device_id')

      if (!devData) return

      // Untuk setiap device, ambil reading dan prediksi terbaru
      const enriched = await Promise.all(devData.map(async (dev) => {
        const [{ data: readings }, { data: preds }] = await Promise.all([
          supabase.from('sensor_readings')
            .select('*').eq('device_id', dev.device_id)
            .order('timestamp', { ascending: false }).limit(1),
          supabase.from('predictions')
            .select('*').eq('device_id', dev.device_id)
            .order('timestamp', { ascending: false }).limit(1),
        ])
        return {
          ...dev,
          latest_reading    : readings?.[0] || null,
          latest_prediction : preds?.[0]    || null,
        } as DeviceWithLatest
      }))

      setDevices(enriched)
      setFiltered(enriched)
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDevices() }, [loadDevices])

  // Filter logic
  useEffect(() => {
    let result = devices
    if (search) {
      result = result.filter(d =>
        d.device_id.toLowerCase().includes(search.toLowerCase()) ||
        d.device_type.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (statusFilter !== 'All Status') {
      result = result.filter(d =>
        d.latest_reading?.alarm_status === statusFilter
      )
    }
    setFiltered(result)
  }, [devices, search, statusFilter])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('sensor-readings-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        () => loadDevices()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadDevices])

  // Hitung metrics
  const metrics = {
    total   : devices.length,
    normal  : devices.filter(d => d.latest_reading?.alarm_status === 'Normal').length,
    warning : devices.filter(d => d.latest_reading?.alarm_status === 'Warning').length,
    critical: devices.filter(d => d.latest_reading?.alarm_status === 'Critical').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Transformer Leak Current Monitoring
              </h1>
              <p className="text-xs text-gray-500">
                Real-time monitoring dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {format(lastUpdate, 'EEEE, d MMMM yyyy', { locale: idLocale })}
            </span>
            <button onClick={loadDevices}
              className="p-2 text-gray-500 hover:text-blue-600
              hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Total Devices" value={metrics.total}
            icon={<Zap size={18} />} color="blue" />
          <MetricCard title="Normal" value={metrics.normal}
            icon={<CheckCircle size={18} />} color="green" />
          <MetricCard title="Warning" value={metrics.warning}
            icon={<AlertTriangle size={18} />} color="yellow" />
          <MetricCard title="Critical" value={metrics.critical}
            icon={<XCircle size={18} />} color="red" />
        </div>

        {/* Filter bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2
              -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search device ID or dimension..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200
                rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                bg-white"
            />
          </div>
          {['All Devices', 'LCM'].map(opt => (
            <select key={opt}
              className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg
                bg-white focus:outline-none focus:ring-2 focus:ring-blue-500
                text-gray-700">
              <option>{opt}</option>
            </select>
          ))}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg
              bg-white focus:outline-none focus:ring-2 focus:ring-blue-500
              text-gray-700">
            {['All Status', 'Normal', 'Warning', 'Critical'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <DeviceTable
          devices={filtered}
          onRowClick={setSelected}
          isLoading={loading}
        />
      </main>

      {/* Modal */}
      {selected && (
        <DeviceModal
          device={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}