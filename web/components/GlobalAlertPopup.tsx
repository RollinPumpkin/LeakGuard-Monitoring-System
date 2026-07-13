'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, ShieldAlert, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function GlobalAlertPopup() {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [alertData, setAlertData] = useState<{ status: string; action: string; device_id: string } | null>(null)

  useEffect(() => {
    async function checkLatestPrediction() {
      // Get the latest prediction from Supabase
      const { data, error } = await supabase
        .from('predictions')
        .select('rf_status, action, device_id')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('Error fetching latest prediction for alert:', error)
        return
      }

      if (data && (data.rf_status === 'Warning' || data.rf_status === 'Critical')) {
        setAlertData({
          status: data.rf_status,
          action: data.action,
          device_id: data.device_id || 'TRAFO-1'
        })
        setIsOpen(true)
      }
    }

    checkLatestPrediction()
  }, [])

  if (!isOpen || !alertData) return null

  const isCritical = alertData.status === 'Critical'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`relative w-full max-w-md p-6 overflow-hidden bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 border-t-8 ${isCritical ? 'border-red-600' : 'border-amber-500'}`}>
        
        <div className="flex flex-col items-center text-center">
          <div className={`p-4 mb-4 rounded-full ${isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            {isCritical ? <ShieldAlert size={48} strokeWidth={1.5} /> : <AlertTriangle size={48} strokeWidth={1.5} />}
          </div>
          
          <h2 className={`text-2xl font-bold mb-2 ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
            {alertData.status.toUpperCase()} ALERT
          </h2>
          
          <p className="text-gray-600 mb-6 text-sm">
            Sistem mendeteksi status <strong>{alertData.status}</strong> pada perangkat <span className="font-semibold text-gray-800">{alertData.device_id}</span>.<br/> 
            Tindakan yang disarankan: <br/>
            <span className="inline-block mt-2 font-medium text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg">
              {alertData.action}
            </span>
          </p>

          <button
            onClick={() => setIsOpen(false)}
            className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all transform active:scale-95 ${
              isCritical 
                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200' 
                : 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200'
            }`}
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
