import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Hitung tanggal 2 bulan yang lalu
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 2)
    const cutoffDate = oneMonthAgo.toISOString()

    // Hapus data sensor_readings yang lebih lama dari 2 bulan
    const { error: readingsError } = await supabase
      .from('sensor_readings')
      .delete()
      .lt('timestamp', cutoffDate)

    // Hapus data predictions yang lebih lama dari 2 bulan
    const { error: predsError } = await supabase
      .from('predictions')
      .delete()
      .lt('timestamp', cutoffDate)

    if (readingsError || predsError) {
      console.error('Error during cleanup:', readingsError, predsError)
      return NextResponse.json(
        { success: false, error: 'Database error during cleanup' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up records older than ${cutoffDate}`,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
