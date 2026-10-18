import pandas as pd


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
