import { supabase } from '@/lib/supabase'

// Kolom yang boleh di-insert dari payload ESP32 (skema EMA).
const ALLOWED = new Set<string>([
  'device_id', 'timestamp', 'log_no', 'millis_s', 'test_label', 'iref_manual_a',
  'ir1_raw', 'ir2_raw', 'ir3_raw', 'is1_raw', 'is2_raw', 'is3_raw',
  'it1_raw', 'it2_raw', 'it3_raw',
  'ir1_ema', 'ir2_ema', 'ir3_ema', 'is1_ema', 'is2_ema', 'is3_ema',
  'it1_ema', 'it2_ema', 'it3_ema',
  'ir_raw_avg', 'is_raw_avg', 'it_raw_avg',
  'ir_raw_max', 'is_raw_max', 'it_raw_max', 'system_raw_max',
  'ir_ema_avg', 'is_ema_avg', 'it_ema_avg',
  'ir_ema_max', 'is_ema_max', 'it_ema_max', 'system_ema_max',
  'battery_v', 'battery_percent', 'wifi_rssi', 'wifi_status',
  'rtc_status', 'sd_status', 'device_ready', 'system_status',
  'alarm_status',
])

const WARNING_A = 0.05
const CRITICAL_A = 0.15

function deriveAlarm(systemEmaMax: number): string {
  if (systemEmaMax >= CRITICAL_A) return 'Critical'
  if (systemEmaMax >= WARNING_A) return 'Warning'
  return 'Normal'
}

export async function GET() {
  return Response.json({ status: 'API Sensor Active' })
}

export async function POST(req: Request) {
  try {
    // Auth opsional: aktif hanya jika INGEST_API_KEY di-set di environment.
    const expectedKey = process.env.INGEST_API_KEY
    if (expectedKey && req.headers.get('x-api-key') !== expectedKey) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await req.json()
    const rows = Array.isArray(raw) ? raw : [raw]

    const records = rows.map((body: Record<string, unknown>) => {
      const row: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(body)) {
        if (ALLOWED.has(key)) row[key] = value
      }
      if (!row.device_id) throw new Error('device_id wajib diisi')
      if (row.alarm_status == null) {
        row.alarm_status = deriveAlarm(Number(row.system_ema_max) || 0)
      }
      return row
    })

    const { error } = await supabase.from('sensor_readings').insert(records)

    if (error) {
      console.error(error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, inserted: records.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
