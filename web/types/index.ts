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
  r1: number; r2: number; r3: number
  s1: number; s2: number; s3: number
  t1: number; t2: number; t3: number

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
  
  // Fitur prediksi masa depan (Optional)
  pred_R?: number | null
  pred_S?: number | null
  pred_T?: number | null
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
