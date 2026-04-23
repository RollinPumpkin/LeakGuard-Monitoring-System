from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI(
    title="LeakGuard RF Prediction API",
    description="Random Forest API untuk prediksi kebocoran arus transformator",
    version="1.0.0"
)

# CORS — izinkan semua origin (untuk development)
# Ganti * dengan domain Vercel-mu saat production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model saat server start
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    model  = joblib.load(os.path.join(BASE_DIR, "model_rf_kebocoran.pkl"))
    scaler = joblib.load(os.path.join(BASE_DIR, "scaler_kebocoran.pkl"))
    le     = joblib.load(os.path.join(BASE_DIR, "label_encoder.pkl"))
    print("✅ Model loaded successfully")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = scaler = le = None

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
    return {
        "status": "ok",
        "model": "Random Forest — LeakGuard",
        "model_loaded": model is not None
    }

@app.get("/health")
def health():
    return {"status": "healthy", "model_ready": model is not None}

@app.post("/predict")
def predict(data: SensorInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        d    = data.dict()
        ch   = [d[f"ch{i}_mA"]   for i in range(1, 13)]
        base = [d[f"base{i}_mA"] for i in range(1, 13)]

        # Hitung fitur turunan (sama seperti saat training)
        delta  = [ch[i] - base[i] for i in range(12)]
        roll3  = ch  # single input: rolling = nilai raw

        features        = np.array([ch + base + delta + roll3]).reshape(1, -1)
        features_scaled = scaler.transform(features)

        pred  = model.predict(features_scaled)[0]
        proba = model.predict_proba(features_scaled)[0]
        label = le.inverse_transform([pred])[0]
        conf  = round(float(max(proba)) * 100, 2)

        action_map = {
            "Normal"  : "Tidak ada tindakan diperlukan. Kondisi aman.",
            "Warning" : "Jadwalkan inspeksi dalam 7 hari ke depan.",
            "Critical": "SEGERA lakukan inspeksi! Risiko kegagalan tinggi.",
        }
        color_map = {
            "Normal": "green", "Warning": "yellow", "Critical": "red"
        }

        # Bangun dict probabilitas
        proba_dict = {cls: round(float(p) * 100, 2)
                      for cls, p in zip(le.classes_, proba)}

        return {
            "status"         : label,
            "confidence_pct" : conf,
            "color"          : color_map[label],
            "action"         : action_map[label],
            "probabilities"  : proba_dict,
            "delta_max"      : round(float(max(delta)), 2),
            "channel_max"    : round(float(max(ch)), 2),
            "delta_values"   : [round(float(d), 2) for d in delta],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)