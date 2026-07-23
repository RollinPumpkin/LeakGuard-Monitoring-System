require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Latest 5 readings:');
    data.forEach(d => {
      console.log(`- ${d.timestamp} (Device: ${d.device_id}, r1: ${d.r1})`);
    });
  }
}

check();
