
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import joblib
import numpy as np
import uvicorn

app = FastAPI(title="LeakGuard RF API", version="1.0.0")

# CORS — izinkan website Next.js memanggil API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ganti dengan domain website kamu saat production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model saat server start
model   = joblib.load("model_rf_kebocoran.pkl")
scaler  = joblib.load("scaler_kebocoran.pkl")
le      = joblib.load("label_encoder.pkl")

# Schema input — 12 channel + 12 baseline
class SensorInput(BaseModel):
    ch1_mA: float;  ch2_mA: float;  ch3_mA: float
    ch4_mA: float;  ch5_mA: float;  ch6_mA: float
    ch7_mA: float;  ch8_mA: float;  ch9_mA: float
    ch10_mA: float; ch11_mA: float; ch12_mA: float
    base1_mA: float;  base2_mA: float;  base3_mA: float
    base4_mA: float;  base5_mA: float;  base6_mA: float
    base7_mA: float;  base8_mA: float;  base9_mA: float
    base10_mA: float; base11_mA: float; base12_mA: float

@app.get("/")
def root():
    return {"status": "ok", "model": "Random Forest — LeakGuard"}

@app.post("/predict")
def predict(data: SensorInput):
    try:
        d = data.dict()
        ch   = [d[f"ch{i}_mA"]   for i in range(1, 13)]
        base = [d[f"base{i}_mA"] for i in range(1, 13)]

        # Hitung delta & rolling (gunakan nilai tunggal, rolling = nilai itu sendiri)
        delta   = [ch[i] - base[i] for i in range(12)]
        roll3   = ch  # untuk single input, rolling = nilai raw

        features = np.array([ch + base + delta + roll3]).reshape(1, -1)
        features_scaled = scaler.transform(features)

        pred   = model.predict(features_scaled)[0]
        proba  = model.predict_proba(features_scaled)[0]
        label  = le.inverse_transform([pred])[0]
        conf   = round(float(max(proba)) * 100, 2)

        # Tentukan warna & rekomendasi
        info = {
            "Normal"  : {"color": "green",  "action": "Tidak ada tindakan diperlukan"},
            "Warning" : {"color": "yellow", "action": "Jadwalkan inspeksi dalam 7 hari"},
            "Critical": {"color": "red",    "action": "Inspeksi segera diperlukan!"},
        }

        return {
            "status"         : label,
            "confidence_pct" : conf,
            "color"          : info[label]["color"],
            "action"         : info[label]["action"],
            "probabilities"  : {
                cls: round(float(p) * 100, 2)
                for cls, p in zip(le.classes_, proba)
            },
            "delta_max"      : round(max(delta), 2),
            "channel_max"    : round(max(ch), 2),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
