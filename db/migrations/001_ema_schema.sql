-- LeakGuard — Migrasi skema lama (12 kanal ch/base) -> skema EMA (R/S/T, 3 sensor per fasa)
-- Sesuai dataset PengujianAkurasi_010626.csv (data ESP32 monitoring arus bocor outgoing 20kV).
-- Menggantikan tabel sensor_readings & predictions lama.

-- 1. Hapus tabel lama yang tidak sesuai skema baru
drop table if exists predictions cascade;
drop table if exists sensor_readings cascade;

-- 2. Pastikan tabel devices ada (1 ESP32, mendukung custom-add banyak trafo)
create table if not exists devices (
  id           uuid primary key default gen_random_uuid(),
  device_id    text unique not null,
  device_type  text not null default 'LCM',
  location     text,
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 3. Tabel pembacaan sensor (skema EMA)
create table if not exists sensor_readings (
  id              bigint generated always as identity primary key,
  device_id       text not null references devices(device_id) on delete cascade,
  "timestamp"     timestamptz not null default now(),
  log_no          integer,
  millis_s        numeric,
  test_label      text,
  iref_manual_a   numeric,

  -- Arus bocor mentah (RAW) — 3 sensor per fasa R/S/T
  ir1_raw numeric, ir2_raw numeric, ir3_raw numeric,
  is1_raw numeric, is2_raw numeric, is3_raw numeric,
  it1_raw numeric, it2_raw numeric, it3_raw numeric,

  -- Arus bocor terhalus (EMA) — yang ditampilkan di dashboard
  ir1_ema numeric, ir2_ema numeric, ir3_ema numeric,
  is1_ema numeric, is2_ema numeric, is3_ema numeric,
  it1_ema numeric, it2_ema numeric, it3_ema numeric,

  -- Agregat RAW per fasa
  ir_raw_avg numeric, is_raw_avg numeric, it_raw_avg numeric,
  ir_raw_max numeric, is_raw_max numeric, it_raw_max numeric,
  system_raw_max numeric,

  -- Agregat EMA per fasa (Average EMA R/S/T pada desain dashboard)
  ir_ema_avg numeric, is_ema_avg numeric, it_ema_avg numeric,
  ir_ema_max numeric, is_ema_max numeric, it_ema_max numeric,
  system_ema_max numeric,

  -- Telemetri kondisi alat
  battery_v       numeric,
  battery_percent numeric,
  wifi_rssi       integer,
  wifi_status     integer,
  rtc_status      integer,
  sd_status       integer,
  device_ready    integer,
  system_status   integer,

  -- Status alarm (placeholder; model ML disambungkan kemudian)
  alarm_status text not null default 'Normal',

  created_at timestamptz not null default now()
);

create index if not exists idx_sensor_readings_device_ts
  on sensor_readings (device_id, "timestamp" desc);

-- 4. Tabel prediksi (struktur dipertahankan; diisi saat model ML siap)
create table if not exists predictions (
  id          bigint generated always as identity primary key,
  device_id   text not null references devices(device_id) on delete cascade,
  "timestamp" timestamptz not null default now(),
  rf_status   text,
  confidence  numeric,
  action      text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_predictions_device_ts
  on predictions (device_id, "timestamp" desc);

-- 5. RLS — izinkan akses publik via anon key (prototipe akademik)
alter table devices         enable row level security;
alter table sensor_readings enable row level security;
alter table predictions     enable row level security;

drop policy if exists "public devices"   on devices;
drop policy if exists "public readings"  on sensor_readings;
drop policy if exists "public preds"     on predictions;

create policy "public devices"  on devices         for all using (true) with check (true);
create policy "public readings" on sensor_readings for all using (true) with check (true);
create policy "public preds"    on predictions     for all using (true) with check (true);

-- 6. Realtime untuk sensor_readings (UI subscribe INSERT)
do $$
begin
  begin
    alter publication supabase_realtime add table sensor_readings;
  exception when duplicate_object then null;
  end;
end $$;

-- 7. Seed 1 trafo default (monitoring 1 trafo saat ini; trafo lain via custom-add)
insert into devices (device_id, device_type, location, description)
values ('TRAFO-1', 'LCM', 'Gardu Beton Satu Trafo', 'Monitoring arus bocor kabel outgoing 20kV fasa R/S/T')
on conflict (device_id) do nothing;
