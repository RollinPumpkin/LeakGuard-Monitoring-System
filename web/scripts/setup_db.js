const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const sqlPath = path.resolve('C:\\Users\\septa\\.gemini\\antigravity\\brain\\7108be6d-e217-49cd-81e1-9280e05299db\\supabase_roles_setup.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

const client = new Client({
  connectionString: 'postgresql://postgres:Septapumasurya01@db.rmhyamsztnskwxlbyrhl.supabase.co:5432/postgres'
})

async function run() {
  try {
    await client.connect()
    console.log('Connected to Supabase PostgreSQL')
    await client.query(sql)
    console.log('Successfully executed the roles setup SQL')
  } catch (err) {
    console.error('Error executing SQL:', err)
  } finally {
    await client.end()
  }
}

run()
