import os
import requests
import joblib
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='../web/.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

print("Fetching data from Supabase (sensor_readings)...")
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Fetch all records
response = requests.get(f"{SUPABASE_URL}/rest/v1/sensor_readings?select=r1,r2,r3,s1,s2,s3,t1,t2,t3", headers=headers)
if response.status_code != 200:
    print("Error fetching data:", response.text)
    exit()

data = response.json()
print(f"Total records fetched: {len(data)}")

if len(data) == 0:
    print("No data found in Supabase.")
    exit()

# Load the trained model
print("Loading Random Forest model...")
model = joblib.load('model_rf_pln.pkl')

y_true = []
y_pred = []

print("Evaluating records...")
for row in data:
    # Feature array (9 variables), assuming data in Supabase might be in Amperes (e.g., 0.211)
    # If the max value is very small (< 10), we multiply by 1000 to convert to mA
    raw_features = [
        row.get('r1', 0), row.get('r2', 0), row.get('r3', 0),
        row.get('s1', 0), row.get('s2', 0), row.get('s3', 0),
        row.get('t1', 0), row.get('t2', 0), row.get('t3', 0)
    ]
    if max(raw_features) < 10:
        features = [f * 1000 for f in raw_features]
    else:
        features = raw_features
    
    # Calculate true label using business rules (PLN limits)
    max_val = max(features)
    if max_val >= 500:
        true_label = "Critical"
    elif max_val >= 300:
        true_label = "Warning"
    else:
        true_label = "Normal"
        
    y_true.append(true_label)
    
    # Predict using the model
    X = np.array([features])
    pred = model.predict(X)[0]
    
    # Handle int outputs if model was trained with ints instead of strings
    if str(pred) == "0": pred = "Normal"
    elif str(pred) == "1": pred = "Warning"
    elif str(pred) == "2": pred = "Critical"
    
    y_pred.append(pred)

# Calculate metrics
print("\n" + "="*40)
print("     HASIL EVALUASI MODEL MACHINE LEARNING")
print("="*40)
print("\n1. Confusion Matrix:")
labels = ["Normal", "Warning", "Critical"]
cm = confusion_matrix(y_true, y_pred, labels=labels)
print(f"            Predicted")
print(f"            {labels[0]:>8} {labels[1]:>8} {labels[2]:>8}")
print(f"True {labels[0]:>8} {cm[0][0]:>8} {cm[0][1]:>8} {cm[0][2]:>8}")
print(f"     {labels[1]:>8} {cm[1][0]:>8} {cm[1][1]:>8} {cm[1][2]:>8}")
print(f"     {labels[2]:>8} {cm[2][0]:>8} {cm[2][1]:>8} {cm[2][2]:>8}")

print("\n2. Classification Report:")
print(classification_report(y_true, y_pred, labels=labels, target_names=labels, zero_division=0))

# TP, TN, FP, FN calculation for 'Critical' class specifically as example
tp = cm[2][2]
fn = cm[2][0] + cm[2][1]
fp = cm[0][2] + cm[1][2]
tn = cm[0][0] + cm[0][1] + cm[1][0] + cm[1][1]

print("\n3. Detail Metrik (Kelas Critical):")
print(f"True Positive (TP)  : {tp}")
print(f"True Negative (TN)  : {tn}")
print(f"False Positive (FP) : {fp}")
print(f"False Negative (FN) : {fn}")
print("\n" + "="*40)
print("Validasi selesai.")
