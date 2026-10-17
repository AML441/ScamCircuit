import kagglehub
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from xgboost import XGBClassifier
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
df.head()
df.info()
df.describe()
print("end")


# PIPELINE


# FEATURE ENGINEERING


df['amount_per_item'] = df['transaction_amount'] / (df['num_items'] + 1)
df['risk_distance_amount'] = df['transaction_amount'] * df['distance_from_home']
df['night_transaction'] = (df['hour_of_day'] < 6).astype(int)
df['high_velocity'] = (df['velocity_score'] > df['velocity_score'].quantile(0.75)).astype(int)


# Strong interaction features
df['amount_per_distance'] = df['transaction_amount'] / (df['distance_from_home'] + 1)
df['velocity_per_txn'] = df['velocity_score'] / (df['prev_transactions'] + 1)


df['high_risk_combo'] = (
   (df['transaction_amount'] > df['transaction_amount'].quantile(0.9)) &
   (df['distance_from_home'] > df['distance_from_home'].quantile(0.9))
).astype(int)


# Choose features to train on
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

X = df[features]
y = df["is_fraud"]


X_train, X_test, y_train, y_test = train_test_split(
   X, y, stratify=y, test_size=0.2, random_state=42
)


# HANDLE IMBALANCE


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


# FINAL RESULTS
pred_final = (probs > best_thresh).astype(int)
print(classification_report(y_test, pred_final))


# PRECISION-RECALL CURVE


precision, recall, thresholds = precision_recall_curve(y_test, probs)


plt.figure(figsize=(7,5))
plt.plot(recall, precision)
plt.title("Precision-Recall Curve (Fraud Detection)")
plt.xlabel("Recall")
plt.ylabel("Precision")
plt.grid()
plt.show()

