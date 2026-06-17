'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Device, SensorReading, DeviceWithLatest,
  TrafoConfig, ThresholdConfig, TrafoStatus, PhaseReading
} from '@/types'
import { SystemStatusBar } from '@/components/SystemStatusBar'
import { ThresholdPanel } from '@/components/ThresholdPanel'
import { TrafoCard } from '@/components/TrafoCard'
import { TrendChart } from '@/components/TrendChart'
import { SummaryTable } from '@/components/SummaryTable'
import { Zap, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_NAMES     = 'leakguard_trafo_names'
const LS_THRESHOLD = 'leakguard_threshold'
const MAX_READINGS = 50

const CHANNEL_MAP: Omit<TrafoConfig, 'name'>[] = [
  { rChannel: 'ch1_mA', sChannel: 'ch4_mA', tChannel: 'ch7_mA',
    rBase: 'base1_mA', sBase: 'base4_mA', tBase: 'base7_mA' },
  { rChannel: 'ch2_mA', sChannel: 'ch5_mA', tChannel: 'ch8_mA',
    rBase: 'base2_mA', sBase: 'base5_mA', tBase: 'base8_mA' },
  { rChannel: 'ch3_mA', sChannel: 'ch6_mA', tChannel: 'ch9_mA',
    rBase: 'base3_mA', sBase: 'base6_mA', tBase: 'base9_mA' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadNames(): string[] {
  try {
    const saved = localStorage.getItem(LS_NAMES)
    if (saved) {
      const arr = JSON.parse(saved) as string[]
      if (arr.length === 3) return arr
    }
  } catch { /* ignore */ }
  return ['Trafo 1', 'Trafo 2', 'Trafo 3']
}

function loadThreshold(): number {
  try {
    const v = parseFloat(localStorage.getItem(LS_THRESHOLD) ?? '')
    if (v > 0) return v
  } catch { /* ignore */ }
  return 0.1
}

function buildTrafoStatuses(
  reading: SensorReading | null,
  configs: TrafoConfig[],
  threshold: number
): TrafoStatus[] {
  return configs.map(cfg => {
    const rv = reading ? Number(reading[cfg.rChannel] ?? 0) : 0
    const sv = reading ? Number(reading[cfg.sChannel] ?? 0) : 0
    const tv = reading ? Number(reading[cfg.tChannel] ?? 0) : 0
    const rb = reading ? Number(reading[cfg.rBase] ?? 0) : 0
    const sb = reading ? Number(reading[cfg.sBase] ?? 0) : 0
    const tb = reading ? Number(reading[cfg.tBase] ?? 0) : 0

    const phases: PhaseReading[] = [
      { phase: 'R', value: rv, baseline: rb, status: rv >= threshold ? 'Warning' : 'Normal' },
      { phase: 'S', value: sv, baseline: sb, status: sv >= threshold ? 'Warning' : 'Normal' },
      { phase: 'T', value: tv, baseline: tb, status: tv >= threshold ? 'Warning' : 'Normal' },
    ]
    return {
      config: cfg,
      phases,
      avgCurrent: (rv + sv + tv) / 3,
      overallStatus: phases.some(p => p.status === 'Warning') ? 'Warning' : 'Normal',
    }
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [devices, setDevices]       = useState<Device[]>([])
  const [activeDevId, setActiveDevId] = useState<string>('')
  const [readings, setReadings]     = useState<SensorReading[]>([])
  const [loading, setLoading]       = useState(true)
  const [isLive, setIsLive]         = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [names, setNames]           = useState<string[]>(['Trafo 1', 'Trafo 2', 'Trafo 3'])
  const [threshold, setThreshold]   = useState<ThresholdConfig>({ warning: 0.1 })

  // Load localStorage on mount
  useEffect(() => {
    setNames(loadNames())
    setThreshold({ warning: loadThreshold() })
  }, [])

  // Build TrafoConfig array from names + channel map
  const trafoConfigs = useMemo<TrafoConfig[]>(() =>
    CHANNEL_MAP.map((ch, i) => ({ ...ch, name: names[i] })),
    [names]
  )

  // Load devices
  useEffect(() => {
    supabase.from('devices').select('*').eq('is_active', true)
      .order('device_id')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDevices(data)
          setActiveDevId(data[0].device_id)
        }
      })
  }, [])

  // Load last 50 readings for active device
  const loadReadings = useCallback(async (devId: string) => {
    if (!devId) return
    setLoading(true)
    const { data } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('device_id', devId)
      .order('timestamp', { ascending: false })
      .limit(MAX_READINGS)
    if (data) {
      setReadings(data.reverse())
      setLastUpdate(new Date())
    }
