create table if not exists prediction_logs (
  id                  uuid primary key default gen_random_uuid(),
  device_id           text not null references devices(device_id) on delete cascade,
  target_timestamp    timestamptz not null,
  pred_r              numeric,
  pred_s              numeric,
  pred_t              numeric,
  created_at          timestamptz not null default now(),
  unique(device_id, target_timestamp)
);

create index if not exists idx_prediction_logs_ts on prediction_logs (device_id, target_timestamp desc);

alter table prediction_logs enable row level security;
drop policy if exists "public prediction_logs" on prediction_logs;
create policy "public prediction_logs" on prediction_logs for all using (true) with check (true);
