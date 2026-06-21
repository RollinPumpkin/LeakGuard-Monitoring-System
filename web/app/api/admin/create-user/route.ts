import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' },
        { status: 500 }
      )
    }

    // Create a Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Create the user in auth.users
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // auto confirm
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // 2. Insert into user_roles
    if (userData?.user?.id) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert([{ id: userData.user.id, role }])

      if (roleError) {
        return NextResponse.json({ error: 'User created, but failed to set role: ' + roleError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, user: userData.user })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
