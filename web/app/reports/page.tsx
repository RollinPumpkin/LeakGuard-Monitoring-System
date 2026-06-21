'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SensorReading } from '@/types'
import { useThresholds } from '@/components/ThresholdProvider'
import { computeAlarmStatus, phaseEmaAvg } from '@/lib/leak'
import { FileText, Download, Calendar, Activity } from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [selectedDevice, setSelectedDevice] = useState<string>('all')
  const [devices, setDevices] = useState<string[]>([])
  
  const { thresholds } = useThresholds()
  const { t, language } = useLanguage()
  const supabase = createClient()
  const locale = language === 'id' ? idLocale : enUS

  useEffect(() => {
    supabase.from('devices').select('device_id').order('device_id').then(({ data }) => {
      if (data) setDevices(data.map(d => d.device_id))
    })
  }, [supabase])

  const generateReportData = async () => {
    setLoading(true)
    const now = new Date()
    let startDate: Date, endDate: Date

    if (period === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 })
      endDate = endOfWeek(now, { weekStartsOn: 1 })
    } else {
      startDate = startOfMonth(now)
      endDate = endOfMonth(now)
    }

    let query = supabase
      .from('sensor_readings')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true })

    if (selectedDevice !== 'all') {
      query = query.eq('device_id', selectedDevice)
    }

    const { data, error } = await query
    setLoading(false)

    if (error) {
      alert('Gagal mengambil data laporan.')
      return null
    }

    return { data: data as SensorReading[], startDate, endDate }
  }

  const handleExportCSV = async () => {
    const report = await generateReportData()
    if (!report || report.data.length === 0) {
      alert('Tidak ada data pada periode ini.')
      return
    }

    const headers = ['Waktu', 'Perangkat', 'Avg R', 'Avg S', 'Avg T', 'R1', 'R2', 'R3', 'S1', 'S2', 'S3', 'T1', 'T2', 'T3', 'Status']
    const rows = report.data.map((d: SensorReading) => {
      const avgR = (phaseEmaAvg(d, 'R') * 1000).toFixed(1)
      const avgS = (phaseEmaAvg(d, 'S') * 1000).toFixed(1)
      const avgT = (phaseEmaAvg(d, 'T') * 1000).toFixed(1)
      const status = computeAlarmStatus(d, thresholds)
      return [
        format(parseISO(d.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        d.device_id,
        avgR, avgS, avgT,
        d.r1, d.r2, d.r3,
        d.s1, d.s2, d.s3,
        d.t1, d.t2, d.t3,
        status
      ]
    })

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Laporan-Arus-Bocor-${period}-${format(new Date(), 'yyyyMMdd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = async () => {
    const report = await generateReportData()
    if (!report || report.data.length === 0) {
      alert('Tidak ada data pada periode ini.')
      return
    }

    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(18)
    doc.text('Laporan Monitoring Arus Bocor', 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Periode: ${format(report.startDate, 'dd MMM yyyy', { locale })} - ${format(report.endDate, 'dd MMM yyyy', { locale })}`, 14, 30)
    doc.text(`Perangkat: ${selectedDevice === 'all' ? 'Semua Trafo' : 'Trafo ' + selectedDevice}`, 14, 36)
    
    // Stats
    const totalData = report.data.length
    const alerts = report.data.filter(d => computeAlarmStatus(d, thresholds) !== 'Normal').length
    doc.text(`Total Data Rekaman: ${totalData}`, 14, 46)
    doc.text(`Total Anomali/Alert: ${alerts}`, 14, 52)

    // Table Data
    const tableData = report.data.map(d => {
      return [
        format(parseISO(d.timestamp), 'dd/MM HH:mm'),
        d.device_id,
        (phaseEmaAvg(d, 'R') * 1000).toFixed(1),
        (phaseEmaAvg(d, 'S') * 1000).toFixed(1),
        (phaseEmaAvg(d, 'T') * 1000).toFixed(1),
        computeAlarmStatus(d, thresholds)
      ]
    })

    autoTable(doc, {
      startY: 60,
      head: [['Waktu', 'Trafo', 'Avg R (mA)', 'Avg S (mA)', 'Avg T (mA)', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] }
    })

    doc.save(`Laporan-Arus-Bocor-${period}-${format(new Date(), 'yyyyMMdd')}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-500" />
            Laporan & Ekspor Data
          </h1>
          <p className="text-sm text-gray-500 mt-1">Buat dan unduh laporan pemantauan arus bocor dalam format PDF atau CSV.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Konfigurasi Laporan</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} /> Periode Waktu
            </label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPeriod('week')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${period === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${period === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Bulan Ini
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Activity size={16} /> Perangkat Trafo
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="all">Semua Trafo</option>
              {devices.map(d => (
                <option key={d} value={d}>Trafo {d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleExportPDF}
            disabled={loading}
            className="flex-1 flex justify-center items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <><Download size={18} /> Export as PDF</>}
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="flex-1 flex justify-center items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <><Download size={18} /> Export as CSV</>}
          </button>
        </div>
      </div>
    </div>
  )
}
