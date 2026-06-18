#!/usr/bin/env python3
"""Import dataset CSV (PengujianAkurasi) ke Supabase tabel sensor_readings (skema EMA).

Pakai Supabase REST (PostgREST). Jalankan SETELAH migrasi 001_ema_schema.sql diterapkan.

Env yang dibutuhkan:
  SUPABASE_URL   - mis. https://<ref>.supabase.co
  SUPABASE_KEY   - anon / publishable key

Contoh:
  python db/import_csv.py path/ke/PengujianAkurasi_010626.csv --device TRAFO-1
"""
import argparse
import csv
import json
import os
import sys
import urllib.request
import urllib.error

# Peta kolom CSV -> kolom tabel
COLMAP = {
    "timestamp": "timestamp",
    "millis_s": "millis_s",
    "log_no": "log_no",
    "test_label": "test_label",
    "iref_manual_A": "iref_manual_a",
    "IR1_RAW_A": "ir1_raw", "IR2_RAW_A": "ir2_raw", "IR3_RAW_A": "ir3_raw",
    "IS1_RAW_A": "is1_raw", "IS2_RAW_A": "is2_raw", "IS3_RAW_A": "is3_raw",
    "IT1_RAW_A": "it1_raw", "IT2_RAW_A": "it2_raw", "IT3_RAW_A": "it3_raw",
    "IR1_EMA_A": "ir1_ema", "IR2_EMA_A": "ir2_ema", "IR3_EMA_A": "ir3_ema",
    "IS1_EMA_A": "is1_ema", "IS2_EMA_A": "is2_ema", "IS3_EMA_A": "is3_ema",
    "IT1_EMA_A": "it1_ema", "IT2_EMA_A": "it2_ema", "IT3_EMA_A": "it3_ema",
    "IR_RAW_Avg_A": "ir_raw_avg", "IS_RAW_Avg_A": "is_raw_avg", "IT_RAW_Avg_A": "it_raw_avg",
    "IR_RAW_Max_A": "ir_raw_max", "IS_RAW_Max_A": "is_raw_max", "IT_RAW_Max_A": "it_raw_max",
    "System_RAW_Max_A": "system_raw_max",
    "IR_EMA_Avg_A": "ir_ema_avg", "IS_EMA_Avg_A": "is_ema_avg", "IT_EMA_Avg_A": "it_ema_avg",
    "IR_EMA_Max_A": "ir_ema_max", "IS_EMA_Max_A": "is_ema_max", "IT_EMA_Max_A": "it_ema_max",
    "System_EMA_Max_A": "system_ema_max",
    "Battery_V": "battery_v", "Battery_Percent": "battery_percent",
    "WiFi_RSSI": "wifi_rssi", "WiFi_Status": "wifi_status",
    "RTC_Status": "rtc_status", "SD_Status": "sd_status",
    "Device_Ready": "device_ready", "System_Status": "system_status",
}

INT_COLS = {"log_no", "wifi_rssi", "wifi_status", "rtc_status",
            "sd_status", "device_ready", "system_status"}
TEXT_COLS = {"timestamp", "test_label"}

WARNING_A = 0.05
CRITICAL_A = 0.15


def derive_alarm(system_ema_max: float) -> str:
    if system_ema_max >= CRITICAL_A:
        return "Critical"
    if system_ema_max >= WARNING_A:
        return "Warning"
    return "Normal"


def parse_value(col: str, value: str):
    if value is None or value == "":
        return None
    if col in TEXT_COLS:
        return value
    try:
        if col in INT_COLS:
            return int(float(value))
        return float(value)
    except ValueError:
        return None


def build_record(row: dict, device_id: str) -> dict:
    rec = {"device_id": device_id}
    for csv_col, db_col in COLMAP.items():
        if csv_col in row:
            rec[db_col] = parse_value(db_col, row[csv_col])
    rec["alarm_status"] = derive_alarm(rec.get("system_ema_max") or 0.0)
    return rec


def post_batch(url: str, key: str, records: list) -> None:
    endpoint = url.rstrip("/") + "/rest/v1/sensor_readings"
    data = json.dumps(records).encode()
    req = urllib.request.Request(
        endpoint, data=data, method="POST",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    try:
        urllib.request.urlopen(req, timeout=60)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Insert gagal {e.code}: {e.read().decode()[:500]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path")
    ap.add_argument("--device", default="TRAFO-1")
    ap.add_argument("--batch", type=int, default=200)
    args = ap.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        sys.exit("Set env SUPABASE_URL dan SUPABASE_KEY dahulu.")

    with open(args.csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    records = [build_record(r, args.device) for r in rows]
    total = 0
    for i in range(0, len(records), args.batch):
        chunk = records[i:i + args.batch]
        post_batch(url, key, chunk)
        total += len(chunk)
        print(f"  inserted {total}/{len(records)}")
    print(f"Selesai: {total} baris ke device {args.device}.")


if __name__ == "__main__":
    main()
