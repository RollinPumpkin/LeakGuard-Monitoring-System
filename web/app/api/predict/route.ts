import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ML_API_URL = process.env.ML_API_URL || 'https://leakguard-monitoring-system-production.up.railway.app'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Webhook payload dari Supabase (INSERT ke sensor_readings)
    // Format: { type: 'INSERT', table: 'sensor_readings', record: { ... } }
    const record = body.record

    if (!record || !record.device_id) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    // Siapkan data untuk dikirim ke ML API (Format: Ampere)
    const payloadToML = {
      IR1_EMA_A: record.r1 || 0,
      IR2_EMA_A: record.r2 || 0,
      IR3_EMA_A: record.r3 || 0,
      IS1_EMA_A: record.s1 || 0,
      IS2_EMA_A: record.s2 || 0,
      IS3_EMA_A: record.s3 || 0,
      IT1_EMA_A: record.t1 || 0,
      IT2_EMA_A: record.t2 || 0,
      IT3_EMA_A: record.t3 || 0
    }

    // 1. Panggil Railway API
    const response = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadToML)
    })

    if (!response.ok) {
      throw new Error(`ML API Error: ${response.statusText}`)
    }

    const predictionResult = await response.json()

    // 2. Simpan hasil prediksi ke Supabase (tabel predictions)
    const { error: insertError } = await supabase
      .from('predictions')
      .insert({
        device_id: record.device_id,
        rf_status: predictionResult.status,
        confidence: predictionResult.confidence_pct,
        action: predictionResult.action,
        timestamp: new Date().toISOString()
      })

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ success: true, result: predictionResult })

  } catch (error: any) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
