from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import os
from sklearn.ensemble import RandomForestRegressor

app = FastAPI(title="LeakGuard ML API")

model_path = "model_rf_pln.pkl"
if os.path.exists(model_path):
    model = joblib.load(model_path)
else:
    model = None

class SensorInput(BaseModel):
    # Nama fitur asli sesuai Colab (dalam satuan mA)
    IR1_EMA_A: float; IR2_EMA_A: float; IR3_EMA_A: float
    IS1_EMA_A: float; IS2_EMA_A: float; IS3_EMA_A: float
    IT1_EMA_A: float; IT2_EMA_A: float; IT3_EMA_A: float

class ForecastInput(BaseModel):
    history_r: list[float]
    history_s: list[float]
    history_t: list[float]

def make_lags(data, n_lags=2):
    X, y = [], []
    for i in range(len(data) - n_lags):
        X.append(data[i:i+n_lags])
        y.append(data[i+n_lags])
    return np.array(X), np.array(y)

def forecast_next_value(history_series):
    # Jika data terlalu sedikit, kembalikan nilai terakhir saja
    if len(history_series) < 4:
        return history_series[-1] if len(history_series) > 0 else 0.0
    
    # Gunakan lag=2 atau lag=3 tergantung panjang data
    n_lags = 2 if len(history_series) < 6 else 3
    
    X, y = make_lags(history_series, n_lags)
    if len(X) == 0:
        return history_series[-1]
        
    model_rf = RandomForestRegressor(n_estimators=50, random_state=42)
    model_rf.fit(X, y)
    
    # Predict next point using the last n_lags points
    last_window = np.array([history_series[-n_lags:]])
    pred = model_rf.predict(last_window)[0]
    return float(pred)

@app.get("/")
def root():
    return {"status": "ok", "model": "Random Forest — LeakGuard PLN"}

@app.post("/predict")
def predict(data: SensorInput):
    if model is None:
        raise HTTPException(status_code=500, detail="Model file not found")
        
    try:
        # Colab features (dalam mA)
        features = np.array([[
            data.IR1_EMA_A * 1000, data.IR2_EMA_A * 1000, data.IR3_EMA_A * 1000,
            data.IS1_EMA_A * 1000, data.IS2_EMA_A * 1000, data.IS3_EMA_A * 1000,
            data.IT1_EMA_A * 1000, data.IT2_EMA_A * 1000, data.IT3_EMA_A * 1000
        ]])

        pred = model.predict(features)[0]
        proba = model.predict_proba(features)[0]
        conf = round(float(max(proba)) * 100, 2)

        info = {
            "Normal"  : {"color": "green",  "action": "Arus per fasa aman."},
            "Warning" : {"color": "yellow", "action": "Jadwalkan inspeksi (Arus fasa > 400mA)"},
            "Critical": {"color": "red",    "action": "Inspeksi segera! (Arus fasa > 1000mA)"},
        }

        label_info = info.get(pred, {"color": "gray", "action": "Unknown status"})

        return {
            "status"         : pred,
            "confidence_pct" : conf,
            "color"          : label_info["color"],
            "action"         : label_info["action"],
            "probabilities"  : {
                cls: round(float(p) * 100, 2)
                for cls, p in zip(model.classes_, proba)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/forecast")
def forecast(data: ForecastInput):
    try:
        pred_r = forecast_next_value(data.history_r)
        pred_s = forecast_next_value(data.history_s)
        pred_t = forecast_next_value(data.history_t)
        
        return {
            "status": "success",
            "predicted_next_hour": {
                "R": round(pred_r, 2),
                "S": round(pred_s, 2),
                "T": round(pred_t, 2)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)