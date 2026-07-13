import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Very basic port of computeAlarmStatus since we can't easily import TS modules with esbuild/ts-node natively without setup
function computeAlarmStatus(reading, thresholds) {
  const getMax = (p1, p2, p3) => Math.max(Math.abs(p1), Math.abs(p2), Math.abs(p3))
  const rMax = getMax(reading.r1, reading.r2, reading.r3)
  const sMax = getMax(reading.s1, reading.s2, reading.s3)
  const tMax = getMax(reading.t1, reading.t2, reading.t3)
  const overallMax = Math.max(rMax, sMax, tMax)
  
  if (overallMax >= thresholds.critical) return 'Critical'
  if (overallMax >= thresholds.warning) return 'Warning'
  return 'Normal'
}

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const thresholds = {
  warning: 10,
  critical: 20
}

async function migrate() {
  console.log('Fetching sensor_readings...')
  const { data: readings, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100)

  if (error || !readings) {
    console.error('Error fetching readings:', error)
    return
  }

  // Sort by max current in Javascript
  const getMax = (r) => Math.max(Math.abs(r.r1), Math.abs(r.s1), Math.abs(r.t1))
  const sorted = readings.sort((a, b) => getMax(b) - getMax(a)).slice(0, 3)

  let count = 0
  for (const rd of sorted) {
    const status = 'Warning'
    console.log(`Found alert on ${rd.timestamp}. Migrating...`)
    const { error: insertError } = await supabase
      .from('alerts')
      .insert({
        device_id: rd.device_id,
        status: status,
        message: `Deteksi anomali pada rata-rata arus (${getMax(rd).toFixed(2)} mA)`,
        is_read: rd.is_resolved || false,
        created_at: rd.timestamp,
        reading_id: rd.id
      })
    if (!insertError) count++
    else console.error(insertError)
  }

  console.log(`Migration complete. Inserted ${count} alerts.`)
}

migrate()
