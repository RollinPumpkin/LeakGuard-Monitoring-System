export type AlarmStatus = 'Normal' | 'Warning' | 'Critical'

export interface Device {
  id: string
  device_id: string
  device_type: string
  location: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface SensorReading {
  id: number
  device_id: string
  timestamp: string
  ch1_mA: number; ch2_mA: number; ch3_mA: number
  ch4_mA: number; ch5_mA: number; ch6_mA: number
  ch7_mA: number; ch8_mA: number; ch9_mA: number
  ch10_mA: number; ch11_mA: number; ch12_mA: number
  base1_mA: number; base2_mA: number; base3_mA: number
  base4_mA: number; base5_mA: number; base6_mA: number
  base7_mA: number; base8_mA: number; base9_mA: number
  base10_mA: number; base11_mA: number; base12_mA: number
  trend: string
  alarm_status: AlarmStatus
}

export interface Prediction {
  id: number
  device_id: string
  timestamp: string
  rf_status: AlarmStatus
  confidence: number
  delta_max: number
  channel_max: number
  action: string
}

export interface DeviceWithLatest extends Device {
  latest_reading: SensorReading | null
  latest_prediction: Prediction | null
}