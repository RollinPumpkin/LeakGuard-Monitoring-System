import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testCols() {
  const vars = [
    { pred_R: 0 },
    { pred_r: 0 },
    { predicted_r: 0 },
    { r_pred: 0 }
  ]
  
  for (const v of vars) {
    const { error } = await supabase.from('prediction_logs').insert([{ device_id: 'TRAFO-1', target_timestamp: new Date().toISOString(), ...v }])
    if (!error) {
      console.log('Success with:', Object.keys(v)[0])
    } else {
      console.log('Failed with:', Object.keys(v)[0], error.message)
    }
  }
}
testCols()
