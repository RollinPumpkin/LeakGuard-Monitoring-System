-- JALANKAN SCRIPT INI DI SQL EDITOR SUPABASE ANDA
-- Script ini akan mengubah nama tabel agar sesuai dengan data ESP32 asli Anda

ALTER TABLE sensor_readings RENAME COLUMN ir1_ema TO r1;
ALTER TABLE sensor_readings RENAME COLUMN ir2_ema TO r2;
ALTER TABLE sensor_readings RENAME COLUMN ir3_ema TO r3;
ALTER TABLE sensor_readings RENAME COLUMN is1_ema TO s1;
ALTER TABLE sensor_readings RENAME COLUMN is2_ema TO s2;
ALTER TABLE sensor_readings RENAME COLUMN is3_ema TO s3;
ALTER TABLE sensor_readings RENAME COLUMN it1_ema TO t1;
ALTER TABLE sensor_readings RENAME COLUMN it2_ema TO t2;
ALTER TABLE sensor_readings RENAME COLUMN it3_ema TO t3;

-- Menghapus kolom average yang tidak dikirim oleh ESP32
ALTER TABLE sensor_readings DROP COLUMN IF EXISTS ir_ema_avg;
ALTER TABLE sensor_readings DROP COLUMN IF EXISTS is_ema_avg;
ALTER TABLE sensor_readings DROP COLUMN IF EXISTS it_ema_avg;
ALTER TABLE sensor_readings DROP COLUMN IF EXISTS system_ema_max;

-- Memberikan nilai default pada device_id agar tidak error (karena ESP32 tidak mengirim device_id)
ALTER TABLE sensor_readings ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE sensor_readings ALTER COLUMN device_id SET DEFAULT 'TRAFO-1';
