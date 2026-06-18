export type AlarmStatus = 'Normal' | 'Warning' | 'Critical'

export type Phase = 'R' | 'S' | 'T'

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
  log_no: number | null
  millis_s: number | null
  test_label: string | null
  iref_manual_a: number | null

  // RAW per sensor (3 sensor per fasa)
  ir1_raw: number; ir2_raw: number; ir3_raw: number
  is1_raw: number; is2_raw: number; is3_raw: number
  it1_raw: number; it2_raw: number; it3_raw: number

  // EMA per sensor (ditampilkan di dashboard)
  ir1_ema: number; ir2_ema: number; ir3_ema: number
  is1_ema: number; is2_ema: number; is3_ema: number
  it1_ema: number; it2_ema: number; it3_ema: number

  // Agregat RAW
  ir_raw_avg: number; is_raw_avg: number; it_raw_avg: number
  ir_raw_max: number; is_raw_max: number; it_raw_max: number
  system_raw_max: number

  // Agregat EMA
  ir_ema_avg: number; is_ema_avg: number; it_ema_avg: number
  ir_ema_max: number; is_ema_max: number; it_ema_max: number
  system_ema_max: number

  // Telemetri alat
  battery_v: number | null
  battery_percent: number | null
  wifi_rssi: number | null
  wifi_status: number | null
  rtc_status: number | null
  sd_status: number | null
  device_ready: number | null
  system_status: number | null

  alarm_status: AlarmStatus
  created_at: string
}

export interface Prediction {
  id: number
  device_id: string
  timestamp: string
  rf_status: AlarmStatus | null
  confidence: number | null
  action: string | null
}

export interface DeviceWithLatest extends Device {
  latest_reading: SensorReading | null
  latest_prediction: Prediction | null
}
