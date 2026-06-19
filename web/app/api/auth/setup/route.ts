import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Mendaftarkan akun super admin
  const { data, error } = await supabase.auth.signUp({
    email: 'septapuma@gmail.com',
    password: 'Septapuma01',
    options: {
      data: {
        role: 'super_admin'
      }
    }
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Super Admin account created successfully! You can now log in.',
    data
  })
}
