import { NextResponse } from 'next/server'

const ML_API_URL = process.env.ML_API_URL || 'https://leakguard-monitoring-system-production.up.railway.app'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Panggil Railway API (Python)
    const response = await fetch(`${ML_API_URL}/forecast`, {
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

    return NextResponse.json({ success: true, result: forecastResult.predicted_next_hour })

  } catch (error: any) {
    console.error('Forecast Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
