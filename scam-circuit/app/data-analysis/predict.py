# predict.py
import json
import pandas as pd
import xgboost as xgb_lib
from xgboost import XGBClassifier
from classifier import add_features

# Loaded once at startup
model = XGBClassifier()
model.load_model('fraud_model.json')
with open('fraud_meta.json') as f:
    meta = json.load(f)

def classify(record: dict) -> dict:
    top_n = 5
    df = pd.DataFrame([record])
    df = add_features(df, meta['cutoffs'])
    df = df[meta['feature_columns']]          # same columns, same order as training
    prob = float(model.predict_proba(df)[0, 1])
    
    contribs = model.get_booster().predict(xgb_lib.DMatrix(df), pred_contribs=True)[0]
    contribs = pd.Series(contribs[:-1], index=df.columns)   # last value is the baseline
    top = contribs.reindex(contribs.abs().sort_values(ascending=False).index)[:top_n]

    return {
        'fraud_probability': prob,
        'is_fraud': prob > meta['threshold'],
        'top_factors': {k: round(float(v), 3) for k, v in top.items()},
    }

# Example
incoming = json.loads('{"transaction_amount": NaN, "hour_of_day": 1.0, "is_weekend": 1.0, "num_items": 2.0, "customer_age": 20.0, "prev_transactions": 2.0, "distance_from_home": 43.37, "device_type": 2.0, "network_quality": 67.9, "is_first_transaction": 1.0, "store_type": 1.0, "velocity_score": NaN, "id": 1.5, "payment_handle": 98.0, "email": "hi@gmail.com", "phone": NaN, "website_url": "google.com", "other_contact": NaN, "date_occurred": NaN, "app_contact": "Messages", "payment_method": "Zelle", "description": NaN }')

print(classify(incoming))
# meta_raw_columns = [
#     "transaction_amount",
#     "hour_of_day",
#     "is_weekend",
#     "num_items",
#     "customer_age",
#     "prev_transactions",
#     "distance_from_home",
#     "device_type",
#     "network_quality",
#     "is_first_transaction",
#     "store_type",
#     "velocity_score",
# ]
# test_df = pd.read_csv('./downloads/fraud.csv')
# fraud_rows = test_df[test_df['is_fraud'] == 1]
# raw = fraud_rows[meta_raw_columns]   # raw columns only

# results = [classify(row.to_dict()) for _, row in raw.head(20).iterrows()]
# print(sum(r['is_fraud'] for r in results), "of 20 flagged")
# print([round(r['fraud_probability'], 2) for r in results])