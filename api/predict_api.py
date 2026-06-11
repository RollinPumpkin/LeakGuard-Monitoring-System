from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
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
    model_path = os.path.join(BASE_DIR, "model_rf_kebocoran.pkl")
    scaler_path = os.path.join(BASE_DIR, "scaler_kebocoran.pkl")
    le_path = os.path.join(BASE_DIR, "label_encoder.pkl")
    
    print(f"📂 BASE_DIR: {BASE_DIR}")
    print(f"🔍 Looking for model at: {model_path}")
    print(f"   Files exist: {os.path.exists(model_path)}")
    
    model  = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    le     = joblib.load(le_path)
    print("✅ Model loaded successfully")
except Exception as e:
    import traceback
    print(f"❌ Error loading model: {e}")
    print(f"   Full traceback:")
    traceback.print_exc()
    model = scaler = le = None

class SensorInput(BaseModel):
    ch1_mA: float | int;  ch2_mA: float | int;  ch3_mA: float | int
    ch4_mA: float | int;  ch5_mA: float | int;  ch6_mA: float | int
    ch7_mA: float | int;  ch8_mA: float | int;  ch9_mA: float | int
    ch10_mA: float | int; ch11_mA: float | int; ch12_mA: float | int
    base1_mA: float | int;  base2_mA: float | int;  base3_mA: float | int
    base4_mA: float | int;  base5_mA: float | int;  base6_mA: float | int
    base7_mA: float | int;  base8_mA: float | int;  base9_mA: float | int
    base10_mA: float | int; base11_mA: float | int; base12_mA: float | int

    @field_validator('*', mode='before')
    def convert_to_float(cls, v):
        if v is None:
            return 0.0
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0

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