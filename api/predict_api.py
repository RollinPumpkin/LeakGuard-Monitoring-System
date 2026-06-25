from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import os

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)