const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rmhyamsztnskwxlbyrhl.supabase.co'
const supabaseAnonKey = 'sb_publishable_jqYxkFMQae-rjcP9n2La0g_TGIT4i4A'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setup() {
  console.log('Registering septapuma@gmail.com...')
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
    console.error('Error:', error.message)
  } else {
    console.log('Success! User registered.')
  }
}

setup()
