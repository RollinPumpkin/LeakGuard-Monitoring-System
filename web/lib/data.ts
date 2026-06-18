import { supabase } from '@/lib/supabase'
import { DeviceWithLatest } from '@/types'

export async function loadDevicesWithLatest(): Promise<DeviceWithLatest[]> {
  const { data: devData } = await supabase
    .from('devices')
    .select('*')
    .eq('is_active', true)
    .order('device_id')

  if (!devData) return []

  return Promise.all(
    devData.map(async (dev) => {
      const [{ data: readings }, { data: preds }] = await Promise.all([
        supabase
          .from('sensor_readings')
          .select('*')
          .eq('device_id', dev.device_id)
          .order('timestamp', { ascending: false })
          .limit(1),
        supabase
          .from('predictions')
          .select('*')
          .eq('device_id', dev.device_id)
          .order('timestamp', { ascending: false })
          .limit(1),
      ])
      return {
        ...dev,
        latest_reading: readings?.[0] ?? null,
        latest_prediction: preds?.[0] ?? null,
      } as DeviceWithLatest
    })
  )
}

export async function addDevice(input: {
  device_id: string
  location?: string
  description?: string
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('devices').insert([
    {
      device_id: input.device_id,
      device_type: 'LCM',
      location: input.location || null,
      description: input.description || null,
      is_active: true,
    },
  ])
  return { error: error?.message ?? null }
}
