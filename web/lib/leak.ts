import { AlarmStatus, Phase, SensorReading } from '@/types'

// Nilai arus pada CSV dalam satuan Ampere (_A). Tampilkan sebagai mA agar terbaca.
export function toMilliAmp(valueAmp: number | null | undefined): number {
  return (Number(valueAmp) || 0) * 1000
}

export function formatMA(valueAmp: number | null | undefined, digits = 1): string {
  return `${toMilliAmp(valueAmp).toFixed(digits)} mA`
}

// Threshold default (Ampere)
export const DEFAULT_WARNING_A = 1.0
export const DEFAULT_CRITICAL_A = 2.0

export interface AlarmThresholds {
  warning: number
  critical: number
}

export function computeAlarmStatus(r: SensorReading | null, thresholds?: AlarmThresholds): AlarmStatus {
  if (!r) return 'Normal'
  const max = Math.max(
    Number(r.r1)||0, Number(r.r2)||0, Number(r.r3)||0,
    Number(r.s1)||0, Number(r.s2)||0, Number(r.s3)||0,
    Number(r.t1)||0, Number(r.t2)||0, Number(r.t3)||0
  )
  const w = thresholds?.warning ?? DEFAULT_WARNING_A
  const c = thresholds?.critical ?? DEFAULT_CRITICAL_A

  if (max >= c) return 'Critical'
  if (max >= w) return 'Warning'
  return 'Normal'
}

// Nilai EMA per sensor untuk satu fasa (R/S/T) -> 3 sensor.
export function phaseEma(r: SensorReading, phase: Phase): number[] {
  const p = phase.toLowerCase()
  return [
    Number(r[`${p}1` as keyof SensorReading] || 0),
    Number(r[`${p}2` as keyof SensorReading] || 0),
    Number(r[`${p}3` as keyof SensorReading] || 0),
  ]
}

// Rata-rata EMA per fasa (Average EMA R/S/T pada desain).
export function phaseEmaAvg(r: SensorReading, phase: Phase): number {
  const values = phaseEma(r, phase)
  return (values[0] + values[1] + values[2]) / 3
}

export const PHASES: Phase[] = ['R', 'S', 'T']

export const phaseColor: Record<Phase, string> = {
  R: 'text-red-600',
  S: 'text-amber-600',
  T: 'text-blue-600',
}

export const phaseBg: Record<Phase, string> = {
  R: 'bg-red-50 border-red-100',
  S: 'bg-amber-50 border-amber-100',
  T: 'bg-blue-50 border-blue-100',
}
