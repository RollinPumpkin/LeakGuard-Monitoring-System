import joblib
import numpy as np

model = joblib.load('model_rf_pln.pkl')
print('Classes:', model.classes_)

for val in [0.1, 10, 100, 211, 300, 500, 1000]:
    X = np.array([[val]*9])
    pred = model.predict(X)[0]
    print(f'Predict {val}:', pred)
