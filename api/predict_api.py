from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import os
from datetime import datetime, timedelta

app = FastAPI(title="LeakGuard ML API - 24H Forecast")

model_path = "model_rf_24h.pkl"
if os.path.exists(model_path):
    models = joblib.load(model_path)
else:
    models = None

class ForecastInput(BaseModel):
    device_id: str
    history_r: list[float]
    history_s: list[float]
    history_t: list[float]

def forecast_24_steps(model, history, steps=24, lags=3):
    current_history = list(history)
    predictions = []
    
    for _ in range(steps):
        if len(current_history) < lags:
            break
            
        last_window = np.array([current_history[-lags:]])
        pred = model.predict(last_window)[0]
        
        predictions.append(float(pred))
        current_history.append(float(pred))
        
    return predictions

@app.get("/")
def root():
    return {"status": "ok", "model": "Random Forest 24H Forecasting (R, S, T)"}

@app.post("/forecast24h")
def forecast_24h(data: ForecastInput):
    if models is None:
        raise HTTPException(status_code=500, detail="Model file not found")
        
    try:
        preds_r = forecast_24_steps(models['R'], data.history_r, steps=24, lags=3)
        preds_s = forecast_24_steps(models['S'], data.history_s, steps=24, lags=3)
        preds_t = forecast_24_steps(models['T'], data.history_t, steps=24, lags=3)
        
        now = datetime.now()
        start_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        
        forecast_results = []
        for i in range(len(preds_r)):
            forecast_time = start_time + timedelta(hours=i)
            forecast_results.append({
                "target_timestamp": forecast_time.isoformat(),
                "device_id": data.device_id,
                "pred_r": round(preds_r[i], 2),
                "pred_s": round(preds_s[i], 2),
                "pred_t": round(preds_t[i], 2)
            })
            
        return {
            "status": "success",
            "forecast_horizon_hours": len(preds_r),
            "predictions": forecast_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PredictInput(BaseModel):
    IR1_EMA_A: float
    IR2_EMA_A: float
    IR3_EMA_A: float
    IS1_EMA_A: float
    IS2_EMA_A: float
    IS3_EMA_A: float
    IT1_EMA_A: float
    IT2_EMA_A: float
    IT3_EMA_A: float

model_clf_path = "model_rf_pln.pkl"
if os.path.exists(model_clf_path):
    model_clf = joblib.load(model_clf_path)
else:
    model_clf = None

@app.post("/predict")
def predict_status(data: PredictInput):
    if model_clf is None:
        raise HTTPException(status_code=500, detail="Classification model not found")
        
    try:
        # Calculate averages as required by the classification model
        R_avg = (data.IR1_EMA_A + data.IR2_EMA_A + data.IR3_EMA_A) / 3
        S_avg = (data.IS1_EMA_A + data.IS2_EMA_A + data.IS3_EMA_A) / 3
        T_avg = (data.IT1_EMA_A + data.IT2_EMA_A + data.IT3_EMA_A) / 3
        
        # Features for prediction
        X_new = [[
            data.IR1_EMA_A, data.IR2_EMA_A, data.IR3_EMA_A,
            data.IS1_EMA_A, data.IS2_EMA_A, data.IS3_EMA_A,
            data.IT1_EMA_A, data.IT2_EMA_A, data.IT3_EMA_A
        ]]
        
        pred = model_clf.predict(X_new)[0]
        prob = model_clf.predict_proba(X_new)[0]
        max_prob = float(max(prob))
        
        status_map = {"Normal": "Normal", "Warning": "Warning", "Critical": "Critical", 0: "Normal", 1: "Warning", 2: "Critical"}
        pred_label = status_map.get(pred, str(pred))
        
        # Ensure pred_label matches exact casing for the UI
        if pred_label.lower() == "normal": pred_label = "Normal"
        elif pred_label.lower() == "warning": pred_label = "Warning"
        elif pred_label.lower() == "critical": pred_label = "Critical"
        else: pred_label = "Unknown"
        
        action = "Semua parameter aman."
        if pred_label == "Warning":
            action = "Periksa keseimbangan beban."
        elif pred_label == "Critical":
            action = "Segera lakukan inspeksi fisik trafo!"
            
        return {
            "status": pred_label,
            "confidence_pct": round(max_prob * 100, 2),
            "action": action
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
