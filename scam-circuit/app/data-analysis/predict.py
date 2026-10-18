# predict.py
import json
import sys
from pathlib import Path
import pandas as pd
import xgboost as xgb_lib
from xgboost import XGBClassifier
from features import add_features

# Loaded once at startup
model = XGBClassifier()
model_dir = Path(__file__).resolve().parent
model.load_model(model_dir / 'fraud_model.json')
with (model_dir / 'fraud_meta.json').open() as f:
    meta = json.load(f)

def classify(record: dict) -> dict:
    top_n = 5
    raw_columns = [column for column in meta['feature_columns'] if column not in {
        'amount_per_item', 'risk_distance_amount', 'night_transaction',
        'high_velocity', 'amount_per_distance', 'velocity_per_txn', 'high_risk_combo',
    }]
    # Numeric nulls become NaN, which XGBoost handles as missing values.
    df = pd.DataFrame([{column: record[column] for column in raw_columns}], dtype=float)
    df = add_features(df, meta['cutoffs'])
    df = df[meta['feature_columns']]          # same columns, same order as training
    prob = float(model.predict_proba(df)[0, 1])
    # stdout is the JSON response consumed by Node; send diagnostics to stderr.
    print(prob, file=sys.stderr)

    contribs = model.get_booster().predict(xgb_lib.DMatrix(df), pred_contribs=True)[0]
    contribs = pd.Series(contribs[:-1], index=df.columns)   # last value is the baseline
    top = contribs.reindex(contribs.abs().sort_values(ascending=False).index)[:top_n]

    return {
        'fraud_probability': prob,
        'is_fraud': prob > meta['threshold'],
        'top_factors': {k: round(float(v), 3) for k, v in top.items()},
    }

if __name__ == '__main__':
    if '--stdin' in sys.argv:
        print(json.dumps(classify(json.load(sys.stdin)), allow_nan=False))
    else:
        incoming = json.loads('{"transaction_amount": NaN, "hour_of_day": 1.0, "is_weekend": 1.0, "num_items": 2.0, "customer_age": 20.0, "prev_transactions": 2.0, "distance_from_home": 43.37, "device_type": 2.0, "network_quality": 67.9, "is_first_transaction": 1.0, "store_type": 1.0, "velocity_score": NaN, "id": 1.5, "payment_handle": 98.0, "email": "hi@gmail.com", "phone": NaN, "website_url": "google.com", "other_contact": NaN, "date_occurred": NaN, "app_contact": "Messages", "payment_method": "Zelle", "description": NaN }')

        print(classify(incoming))
