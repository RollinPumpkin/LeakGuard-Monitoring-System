import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:8000'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Panggil Railway API (Python) - 24H Forecast
    const response = await fetch(`${ML_API_URL}/forecast24h`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`ML API Error: ${response.statusText}`)
    }

    const forecastResult = await response.json()
    const predictions = forecastResult.predictions || []
    
    // Save to Supabase (Upsert) untuk histori permanen
    if (predictions.length > 0) {
       const { error } = await supabase
         .from('prediction_logs')
         .upsert(predictions, { onConflict: 'device_id,target_timestamp' })
       
       if (error) {
         console.error('Failed to save prediction_logs:', error)
       }
    }

    return NextResponse.json({ success: true, result: predictions })

  } catch (error: any) {
    console.error('Forecast Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
