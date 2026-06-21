const https = require('https');
require('dotenv').config({ path: '.env.local' });

const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sensor_readings`);
const options = {
  method: 'OPTIONS',
  headers: {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  }
};

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.columns) {
        console.log("COLUMNS FOUND:");
        parsed.columns.forEach(c => console.log(`- ${c.name} (${c.type})`));
      } else {
        console.log(data);
      }
    } catch(e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
