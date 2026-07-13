import joblib
import numpy as np

model = joblib.load('model_rf_pln.pkl')
print('Classes:', model.classes_)

X = np.array([[0.1]*9])
pred = model.predict(X)[0]
print('Predict:', pred, type(pred))
