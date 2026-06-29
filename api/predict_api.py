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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
