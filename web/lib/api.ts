const RF_API_URL = process.env.NEXT_PUBLIC_RF_API_URL!

export interface SensorReading {
  ch1_mA: number; ch2_mA: number; ch3_mA: number
  ch4_mA: number; ch5_mA: number; ch6_mA: number
  ch7_mA: number; ch8_mA: number; ch9_mA: number
  ch10_mA: number; ch11_mA: number; ch12_mA: number
  base1_mA: number; base2_mA: number; base3_mA: number
  base4_mA: number; base5_mA: number; base6_mA: number
  base7_mA: number; base8_mA: number; base9_mA: number
  base10_mA: number; base11_mA: number; base12_mA: number
}

export interface PredictionResult {
  status: 'Normal' | 'Warning' | 'Critical'
  confidence_pct: number
  color: string
  action: string
  probabilities: { Normal: number; Warning: number; Critical: number }
  delta_max: number
  channel_max: number
  delta_values: number[]
}

export async function predictReading(data: SensorReading): Promise<PredictionResult> {
  const res = await fetch(`${RF_API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${RF_API_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}