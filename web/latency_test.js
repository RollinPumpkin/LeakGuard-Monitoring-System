const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runLatencyTest() {
  console.log("=== PENGUJIAN LATENSI: WEBSOCKET VS POLLING API ===");
  
  const testDeviceId = 'TRAFO-1';
  
  // 1. Uji Polling API (HTTP Tradisional)
  console.log("\n[1] Menguji Polling API (HTTP REST)...");
  let pollingTimes = [];
  for(let i=0; i<3; i++) {
    const start = performance.now();
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('id')
      .limit(1);
    const end = performance.now();
    pollingTimes.push(end - start);
    console.log(`    Percobaan ${i+1}: ${(end - start).toFixed(2)} ms`);
  }
  const avgPolling = pollingTimes.reduce((a, b) => a + b) / pollingTimes.length;
  console.log(`--> Rata-rata Polling API: ${avgPolling.toFixed(2)} ms`);

  // 2. Uji WebSocket (Supabase Realtime)
  console.log("\n[2] Menguji WebSocket (Supabase Realtime)...");
  
  return new Promise((resolve) => {
    let wsTimes = [];
    let testStartTimes = {};
    const maxTests = 3;

    // Subscribe ke event INSERT
    const channel = supabase.channel('latency_test')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, 
        (payload) => {
          const receiveTime = performance.now();
          // Kita mendeteksi data uji dari nilai ir1_raw yang diset negatif
          const ir1_val = payload.new.ir1_raw; 
          
          if(ir1_val <= -999) {
             const testIndex = Math.abs(ir1_val + 999); // Mengambil kembali index 0, 1, 2
             const sendTime = testStartTimes[testIndex];
             
             if(sendTime) {
                 const latency = receiveTime - sendTime;
                 wsTimes.push(latency);
                 console.log(`    Data diterima via WebSocket! Latensi transmisi: ${latency.toFixed(2)} ms`);
                 
                 if(wsTimes.length >= maxTests) {
                    const avgWs = wsTimes.reduce((a, b) => a + b) / wsTimes.length;
                    console.log(`--> Rata-rata WebSocket Realtime: ${avgWs.toFixed(2)} ms`);
                    console.log("\n=== KESIMPULAN ===");
                    console.log(`Kecepatan WebSocket terbukti ~${(avgPolling / avgWs).toFixed(1)}x lebih cepat dibandingkan Polling API.`);
                    supabase.removeChannel(channel);
                    resolve();
                 }
             }
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log("    Channel WebSocket terhubung. Memulai injeksi data...");
          
          // Lakukan insert 3 kali dengan jeda
          for(let i=0; i<maxTests; i++) {
            await new Promise(r => setTimeout(r, 1000));
            testStartTimes[i] = performance.now(); // Catat waktu lokal
            
            const { error } = await supabase.from('sensor_readings').insert({
              device_id: testDeviceId,
              ir1_raw: -999 - i, // Gunakan nilai negatif sebagai penanda data uji
              alarm_status: 'Normal' // Required default column
            });
            
            if (error) {
                console.error("    [Error] Gagal mengirim data uji ke Supabase:", error.message);
                resolve();
                return;
            }
          }
        }
      });
  });
}

runLatencyTest();
