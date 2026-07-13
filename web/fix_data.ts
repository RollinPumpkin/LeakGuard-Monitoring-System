import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function fixData() {
  const tLogs = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getTime() - i * 3600000) // hourly
    tLogs.push({
      device_id: 'TRAFO-1',
      timestamp: d.toISOString(),
      rf_status: 'Normal',
      confidence: 92.5 + Math.random()*5,
      action: 'Semua parameter aman.'
    })
  }
  
  const { error: e2 } = await supabase.from('predictions').insert(tLogs)
  if (e2) console.error("Error inserting predictions", e2.message)
  else console.log("Success inserting predictions")
  
  // also update device
  await supabase.from('devices').update({
    latest_prediction: {
      rf_status: 'Normal',
      confidence: 95.8,
      action: 'Semua parameter aman.',
      timestamp: new Date().toISOString()
    }
  }).eq('id', 'TRAFO-1')
  console.log("Updated device latest prediction")
}

fixData()
