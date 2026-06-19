const { Client } = require('pg')

const client = new Client({
  connectionString: 'postgresql://postgres:Septapumasurya01@db.rmhyamsztnskwxlbyrhl.supabase.co:5432/postgres'
})

async function run() {
  try {
    await client.connect()
    console.log('Connected to Supabase PostgreSQL')
    
    // Konfirmasi email secara otomatis
    const res = await client.query(`
      UPDATE auth.users 
      SET email_confirmed_at = now() 
      WHERE email = 'septapuma@gmail.com';
    `)
    console.log(`Updated ${res.rowCount} user(s).`)

  } catch (err) {
    console.error('Error executing SQL:', err)
  } finally {
    await client.end()
  }
}

run()
