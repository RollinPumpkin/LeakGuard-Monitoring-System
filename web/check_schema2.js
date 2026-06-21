const https = require('https');
const url = new URL('https://rmhyamsztnskwxlbyrhl.supabase.co/rest/v1/sensor_readings');
const options = {
  method: 'OPTIONS',
  headers: {
    'apikey': 'sb_publishable_jqYxkFMQae-rjcP9n2La0g_TGIT4i4A',
    'Authorization': 'Bearer sb_publishable_jqYxkFMQae-rjcP9n2La0g_TGIT4i4A'
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
req.on('error', (e) => console.error(e));
req.end();
