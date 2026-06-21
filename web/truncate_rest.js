const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  const t1 = await fetch(`${url}/rest/v1/sensor_readings?id=gt.0`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('sensor_readings', t1.status);
  
  const t2 = await fetch(`${url}/rest/v1/predictions?id=gt.0`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('predictions', t2.status);
}

run();
