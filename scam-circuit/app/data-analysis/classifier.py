import kagglehub
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import xgboost as xgb
from xgboost import XGBClassifier
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
   classification_report,
   precision_recall_curve,
   precision_score,
   recall_score,
   f1_score
)

# import dataset
# for now, importing from Kaggle. Later will import from Tiger Data
local_path = kagglehub.dataset_download(
   'waddahali/fraud-detection',
   output_dir="./downloads",
   force_download=True
)


# info about dataset
df = pd.read_csv('./downloads/fraud.csv')

features = [
    "transaction_amount",
    "hour_of_day",
    "is_weekend",
    "num_items",
    "customer_age",
    "prev_transactions",
    "distance_from_home",
    "device_type",
    "network_quality",
    "is_first_transaction",
    "store_type",
    "velocity_score",
    "id",
    "payment_handle",
    "email",
    "phone",
    "website_url",
    "other_contact",
    "date_occurred",
    "app_contact",
    "payment_method",
    "description"
]

def add_features(df: pd.DataFrame, cutoffs: dict) -> pd.DataFrame:
    df = df.copy()
    df['amount_per_item'] = df['transaction_amount'] / (df['num_items'] + 1)
    df['risk_distance_amount'] = df['transaction_amount'] * df['distance_from_home']
    df['night_transaction'] = (df['hour_of_day'] < 6).astype(int)
    df['high_velocity'] = (df['velocity_score'] > cutoffs['velocity_q75']).astype(int)
    df['amount_per_distance'] = df['transaction_amount'] / (df['distance_from_home'] + 1)
    df['velocity_per_txn'] = df['velocity_score'] / (df['prev_transactions'] + 1)
    df['high_risk_combo'] = (
        (df['transaction_amount'] > cutoffs['amount_q90']) &
        (df['distance_from_home'] > cutoffs['distance_q90'])
    ).astype(int)
    return df

train_df, test_df = train_test_split(
    df, stratify=df['is_fraud'], test_size=0.2, random_state=42
)

cutoffs = {
    'velocity_q75': float(train_df['velocity_score'].quantile(0.75)),
    'amount_q90': float(train_df['transaction_amount'].quantile(0.9)),
    'distance_q90': float(train_df['distance_from_home'].quantile(0.9)),
}

train_df = add_features(train_df, cutoffs)
test_df = add_features(test_df, cutoffs)

X_train, y_train = train_df.drop(columns='is_fraud'), train_df['is_fraud']
X_test, y_test = test_df.drop(columns='is_fraud'), test_df['is_fraud']

# Calculate imbalance ratio
scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()


# MODEL: XGBOOST
xgb = XGBClassifier(
   n_estimators=800,
   max_depth=6,
   learning_rate=0.03,
   scale_pos_weight=scale_pos_weight,
   subsample=0.8,
   colsample_bytree=0.8,
   gamma=1,
   reg_alpha=0.5,
   reg_lambda=1,
   random_state=42,
   n_jobs=-1,
   eval_metric='logloss'
)


xgb.fit(X_train, y_train)

importance = pd.Series(xgb.feature_importances_, index=X_train.columns).sort_values()
print(importance.sort_values(ascending=False))

importance.plot(kind='barh', figsize=(8, 6), title='Feature importance (gain)')
plt.tight_layout()
plt.show()


# PREDICTIONS
probs = xgb.predict_proba(X_test)[:, 1]


# HRESHOLD SEARCH
best_thresh = 0
best_score = 0


for t in np.arange(0.05, 0.9, 0.01):
   preds = (probs > t).astype(int)
  
   precision = precision_score(y_test, preds)
   recall = recall_score(y_test, preds)
  
   # Constraint: avoid useless precision
   if precision > 0.25:
       score = recall  # prioritize catching fraud
      
       if score > best_score:
           best_score = score
           best_thresh = t


print("Better Threshold:", best_thresh)

# SAVE
xgb.save_model('fraud_model.json')
with open('fraud_meta.json', 'w') as f:
    json.dump({
        'threshold': float(best_thresh),
        'cutoffs': cutoffs,
        'feature_columns': list(X_train.columns),
    }, f)