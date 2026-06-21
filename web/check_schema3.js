const https = require('https');
const url = new URL('https://rmhyamsztnskwxlbyrhl.supabase.co/rest/v1/');
const options = {
  method: 'GET',
  headers: {
    'apikey': 'sb_publishable_jqYxkFMQae-rjcP9n2La0g_TGIT4i4A',
    'Authorization': 'Bearer sb_publishable_jqYxkFMQae-rjcP9n2La0g_TGIT4i4A',
    'Accept': 'application/openapi+json'
  }
};
const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(Object.keys(parsed.definitions.sensor_readings.properties));
    } catch(e) {
      console.log("Error parsing");
    }
  });
});
req.on('error', (e) => console.error(e));
req.end();
