const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log("Checking Supabase connection and schema...");
  
  // Try to insert a dummy row and rollback, or just select
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error querying sensor_readings:", error);
    return;
  }
  
  console.log("Query successful!");
  if (data && data.length > 0) {
    console.log("Columns found in data:", Object.keys(data[0]));
  } else {
    console.log("Table is empty, but query succeeded. Let's insert a test row to see columns.");
    
    // Insert test row
    const testRow = {
      device_id: 'TEST',
      r1: 0.1, r2: 0.2, r3: 0.3,
      s1: 0.1, s2: 0.2, s3: 0.3,
      t1: 0.1, t2: 0.2, t3: 0.3
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('sensor_readings')
      .insert([testRow])
      .select();
      
    if (insertError) {
      console.error("Error inserting test row:", insertError);
    } else {
      console.log("Insert successful! Columns in inserted row:");
      if (insertData && insertData.length > 0) {
        console.log(Object.keys(insertData[0]));
      }
      
      // Delete test row
      await supabase.from('sensor_readings').delete().eq('device_id', 'TEST');
      console.log("Test row deleted.");
    }
  }
}

check();
