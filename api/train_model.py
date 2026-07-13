import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

np.random.seed(42)
n_samples = 2000

# Generate normal data (around 200-250)
normal_data = np.random.normal(loc=220, scale=15, size=(n_samples, 9))
normal_labels = ['Normal'] * n_samples

# Generate warning data (around 300-450)
warning_data = np.random.normal(loc=350, scale=40, size=(n_samples, 9))
warning_labels = ['Warning'] * n_samples

# Generate critical data (> 500)
critical_data = np.random.normal(loc=550, scale=50, size=(n_samples, 9))
critical_labels = ['Critical'] * n_samples

X = np.vstack([normal_data, warning_data, critical_data])
y = np.array(normal_labels + warning_labels + critical_labels)

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X, y)

print("Classes:", clf.classes_)
joblib.dump(clf, 'model_rf_pln.pkl')
print("Model saved to model_rf_pln.pkl")
