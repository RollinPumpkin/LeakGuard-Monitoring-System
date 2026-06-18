import { AlarmStatus, Phase, SensorReading } from '@/types'

// Nilai arus pada CSV dalam satuan Ampere (_A). Tampilkan sebagai mA agar terbaca.
export function toMilliAmp(valueAmp: number | null | undefined): number {
  return (Number(valueAmp) || 0) * 1000
}

export function formatMA(valueAmp: number | null | undefined, digits = 1): string {
  return `${toMilliAmp(valueAmp).toFixed(digits)} mA`
}

// Threshold sementara (placeholder, sebelum model ML disambungkan).
// Berbasis arus bocor maksimum sistem (Ampere).
const WARNING_A = 0.05
const CRITICAL_A = 0.15

export function computeAlarmStatus(r: SensorReading | null): AlarmStatus {
  if (!r) return 'Normal'
  const max = Number(r.system_ema_max) || 0
  if (max >= CRITICAL_A) return 'Critical'
  if (max >= WARNING_A) return 'Warning'
  return 'Normal'
}

// Nilai EMA per sensor untuk satu fasa (R/S/T) -> 3 sensor.
export function phaseEma(r: SensorReading, phase: Phase): number[] {
  const p = phase.toLowerCase()
  return [
    Number(r[`i${p}1_ema` as keyof SensorReading]),
    Number(r[`i${p}2_ema` as keyof SensorReading]),
    Number(r[`i${p}3_ema` as keyof SensorReading]),
  ]
}

// Rata-rata EMA per fasa (Average EMA R/S/T pada desain).
export function phaseEmaAvg(r: SensorReading, phase: Phase): number {
  const p = phase.toLowerCase()
  return Number(r[`i${p}_ema_avg` as keyof SensorReading])
}

export const PHASES: Phase[] = ['R', 'S', 'T']

export const phaseColor: Record<Phase, string> = {
  R: 'text-red-600',
  S: 'text-yellow-600',
  T: 'text-blue-600',
}

export const phaseBg: Record<Phase, string> = {
  R: 'bg-red-50 border-red-100',
  S: 'bg-yellow-50 border-yellow-100',
  T: 'bg-blue-50 border-blue-100',
}
