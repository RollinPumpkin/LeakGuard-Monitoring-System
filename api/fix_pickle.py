import joblib
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("🔧 Loading pickle files with pickle protocol handling...")

# Load dengan error handling
try:
    model = joblib.load(os.path.join(BASE_DIR, "model_rf_kebocoran.pkl"))
    print("✅ Model loaded")
except Exception as e:
    print(f"❌ Model error: {e}")
    model = None

try:
    scaler = joblib.load(os.path.join(BASE_DIR, "scaler_kebocoran.pkl"))
    print("✅ Scaler loaded")
except Exception as e:
    print(f"❌ Scaler error: {e}")
    scaler = None

try:
    le = joblib.load(os.path.join(BASE_DIR, "label_encoder.pkl"))
    print("✅ Label Encoder loaded")
except Exception as e:
    print(f"❌ Label Encoder error: {e}")
    le = None

# Resave dengan protocol 4
if model:
    joblib.dump(model, os.path.join(BASE_DIR, "model_rf_kebocoran.pkl"), protocol=4)
    print("💾 Model re-saved with protocol 4")

if scaler:
    joblib.dump(scaler, os.path.join(BASE_DIR, "scaler_kebocoran.pkl"), protocol=4)
    print("💾 Scaler re-saved with protocol 4")

if le:
    joblib.dump(le, os.path.join(BASE_DIR, "label_encoder.pkl"), protocol=4)
    print("💾 Label Encoder re-saved with protocol 4")

print("✅ Done!")
