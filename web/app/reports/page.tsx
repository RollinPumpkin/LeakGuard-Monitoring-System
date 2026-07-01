'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SensorReading } from '@/types'
import { useThresholds } from '@/components/ThresholdProvider'
import { computeAlarmStatus, phaseEmaAvg } from '@/lib/leak'
import { FileText, Download, Calendar, Activity, Eye } from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<string>(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [selectedDevice, setSelectedDevice] = useState<string>('all')
  const [devices, setDevices] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<SensorReading[] | null>(null)
  
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
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    // Supaya endDate mencakup sampai akhir hari (23:59:59)
    end.setHours(23, 59, 59, 999)

    let query = supabase
      .from('sensor_readings')
      .select('*')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
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

    return { data: data as SensorReading[], startDate: start, endDate: end }
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

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Laporan-Arus-Bocor-${format(new Date(), 'yyyyMMdd')}.csv`)
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

    doc.save(`Laporan-Arus-Bocor-${format(new Date(), 'yyyyMMdd')}.pdf`)
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
            <div className="flex bg-gray-100 rounded-lg p-1 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 py-1.5 px-2 text-sm font-medium rounded-md text-gray-900 border-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <span className="text-gray-400 flex items-center">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 py-1.5 px-2 text-sm font-medium rounded-md text-gray-900 border-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
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
            onClick={async () => {
              const report = await generateReportData()
              if (report && report.data.length > 0) {
                setPreviewData(report.data)
              } else {
                setPreviewData([])
              }
            }}
            disabled={loading}
            className="flex-1 flex justify-center items-center gap-2 px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" /> : <><Eye size={18} /> Tampilkan Preview</>}
          </button>

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

      {previewData && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Preview Data ({previewData.length} baris)</h2>
          {previewData.length === 0 ? (
            <p className="text-sm text-gray-500">Tidak ada data untuk periode ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Perangkat</th>
                    <th className="px-4 py-3">Avg R / S / T (mA)</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 50).map((d) => (
                    <tr key={d.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{format(parseISO(d.timestamp), 'dd MMM yyyy HH:mm', { locale })}</td>
                      <td className="px-4 py-3">{d.device_id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {(phaseEmaAvg(d, 'R') * 1000).toFixed(1)} <span className="text-gray-400 font-normal">/</span> {(phaseEmaAvg(d, 'S') * 1000).toFixed(1)} <span className="text-gray-400 font-normal">/</span> {(phaseEmaAvg(d, 'T') * 1000).toFixed(1)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          computeAlarmStatus(d, thresholds) === 'Normal' ? 'bg-green-100 text-green-700' :
                          computeAlarmStatus(d, thresholds) === 'Warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {computeAlarmStatus(d, thresholds)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 50 && (
                <div className="text-center mt-4 text-xs text-gray-500 italic">
                  Menampilkan 50 baris pertama dari total {previewData.length} baris.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
