# """
# DiscoveryService — AI/ML Loss Discovery Engine for LossLens.

# Performs:
# 1. Feature engineering (transaction, customer, graph, temporal)
# 2. Transaction anomaly model (Isolation Forest)
# 3. Behavioural clustering (DBSCAN)
# 4. Graph pattern discovery (shared devices, addresses, products, coupons)
# 5. Temporal engine (velocity, sudden change, spikes)
# 6. Risk engine (Transaction, Customer, Cluster risks)
# 7. Financial exposure engine (Current, Potential, Expected loss, Loss velocity)
# """

# import os
# import json
# import numpy as np
# import pandas as pd
# from datetime import datetime
# import networkx as nx
# from sklearn.ensemble import IsolationForest
# from sklearn.cluster import DBSCAN
# from sklearn.preprocessing import StandardScaler

# DATA_DIR = 'data/generated'

# def load_dataset(filename: str):
#     filepath = os.path.join(DATA_DIR, f"{filename}.json")
#     if os.path.exists(filepath):
#         with open(filepath, 'r', encoding='utf-8') as fp:
#             return json.load(fp)
#     return []

# class DiscoveryService:
#     def __init__(self):
#         self._cached_patterns = None
#         self._last_run_time = None

#     def run_pipeline(self) -> dict:
#         """Run the complete ML pattern discovery pipeline."""
#         # 1. Load Datasets
#         customers = load_dataset('customers')
#         orders = load_dataset('orders')
#         payments = load_dataset('payments')
#         refunds = load_dataset('refunds')
#         devices = load_dataset('devices')
#         addresses = load_dataset('addresses')
#         customer_device = load_dataset('customer_device')
#         customer_address = load_dataset('customer_address')
#         order_product = load_dataset('order_product')
#         coupons = load_dataset('coupons')

#         if not customers or not payments:
#             return {"status": "error", "message": "Insufficient data to run pipeline"}

#         df_cust = pd.DataFrame(customers)
#         df_orders = pd.DataFrame(orders)
#         df_payments = pd.DataFrame(payments)
#         df_refunds = pd.DataFrame(refunds)
#         df_cust_dev = pd.DataFrame(customer_device)
#         df_cust_addr = pd.DataFrame(customer_address)

#         # Parse timestamps
#         df_cust['created_at'] = pd.to_datetime(df_cust['created_at'])
#         df_orders['created_at'] = pd.to_datetime(df_orders['created_at'])
#         df_payments['created_at'] = pd.to_datetime(df_payments['created_at'])
#         if not df_refunds.empty:
#             df_refunds['created_at'] = pd.to_datetime(df_refunds['created_at'])

#         # -------------------------------------------------------------
#         # Step 1: Feature Engineering — Transaction & Customer
#         # -------------------------------------------------------------
        
#         # Sort payments to compute sequential metrics
#         df_payments = df_payments.sort_values(['customer_id', 'created_at']).reset_index(drop=True)
        
#         # Time since previous transaction
#         df_payments['prev_created_at'] = df_payments.groupby('customer_id')['created_at'].shift(1)
#         df_payments['time_since_previous_transaction'] = (
#             df_payments['created_at'] - df_payments['prev_created_at']
#         ).dt.total_seconds().fillna(0.0)

#         # Transaction velocity (rolling 24h count)
#         # Optimized group-level rolling calculation
#         df_payments = df_payments.sort_values('created_at').reset_index(drop=True)
#         customer_groups = df_payments.groupby('customer_id')
#         velocities = []
#         for name, group in customer_groups:
#             times = group['created_at'].values
#             left_indices = np.searchsorted(times, times - np.timedelta64(24, 'h'), side='left')
#             right_indices = np.arange(len(times)) + 1
#             counts = right_indices - left_indices
#             group = group.copy()
#             group['transaction_velocity'] = counts.astype(float)
#             velocities.append(group)
#         df_payments = pd.concat(velocities).sort_index()

#         # Transaction hourly velocity (rolling 1h count)
#         hourly_velocities = []
#         for name, group in df_payments.groupby('customer_id'):
#             times = group['created_at'].values
#             left_indices = np.searchsorted(times, times - np.timedelta64(1, 'h'), side='left')
#             right_indices = np.arange(len(times)) + 1
#             counts = right_indices - left_indices
#             group = group.copy()
#             group['hourly_velocity'] = counts.astype(float)
#             hourly_velocities.append(group)
#         df_payments = pd.concat(hourly_velocities).sort_index()

#         # Velocity change ratio
#         df_payments['velocity_change'] = (
#             df_payments['hourly_velocity'] / df_payments['transaction_velocity'].clip(lower=1.0)
#         )

#         # Refund Delay & Refund Info
#         if not df_refunds.empty:
#             df_ref_agg = df_refunds.groupby('payment_id').agg(
#                 refund_created_at=('created_at', 'min'),
#                 refund_amount=('amount', 'sum')
#             ).reset_index()
#             df_payments = pd.merge(df_payments, df_ref_agg, left_on='id', right_on='payment_id', how='left')
#             df_payments['refund_delay'] = (
#                 df_payments['refund_created_at'] - df_payments['created_at']
#             ).dt.total_seconds().fillna(0.0)
#             df_payments['is_refunded'] = df_payments['refund_amount'].notna().astype(int)
#         else:
#             df_payments['refund_delay'] = 0.0
#             df_payments['is_refunded'] = 0
#             df_payments['refund_amount'] = 0.0

#         # Refund rate / spike tracking
#         df_payments['daily_refunds'] = 0.0
#         df_payments['weekly_refunds'] = 0.0
#         if not df_refunds.empty:
#             df_payments = df_payments.sort_values(['customer_id', 'created_at']).reset_index(drop=True)
#             df_refunds = df_refunds.sort_values(['customer_id', 'created_at']).reset_index(drop=True)
            
#             refund_groups = df_refunds.groupby('customer_id')
            
#             daily_list = np.zeros(len(df_payments))
#             weekly_list = np.zeros(len(df_payments))
            
#             df_payments['temp_idx'] = df_payments.index
            
#             for cid, pay_grp in df_payments.groupby('customer_id'):
#                 ref_grp = refund_groups.get_group(cid) if cid in refund_groups.groups else None
#                 if ref_grp is not None and not ref_grp.empty:
#                     p_times = pay_grp['created_at'].values
#                     r_times = ref_grp['created_at'].values
                    
#                     idx_right = np.searchsorted(r_times, p_times, side='right')
#                     idx_left_24h = np.searchsorted(r_times, p_times - np.timedelta64(24, 'h'), side='left')
#                     idx_left_7d = np.searchsorted(r_times, p_times - np.timedelta64(7, 'D'), side='left')
                    
#                     daily_counts = idx_right - idx_left_24h
#                     weekly_counts = idx_right - idx_left_7d
                    
#                     indices = pay_grp['temp_idx'].values
#                     daily_list[indices] = daily_counts
#                     weekly_list[indices] = weekly_counts
            
#             df_payments['daily_refunds'] = daily_list
#             df_payments['weekly_refunds'] = weekly_list
#             df_payments = df_payments.drop(columns=['temp_idx'])

#         df_payments['daily_refund_rate'] = (
#             df_payments['daily_refunds'] / df_payments['transaction_velocity'].clip(lower=1.0)
#         )
#         df_payments['refund_spike'] = (
#             df_payments['daily_refunds'] / (df_payments['weekly_refunds'] / 7.0).clip(lower=0.1)
#         )

#         # Payment failure rate
#         df_payments['is_failed'] = (df_payments['status'] == 'failed').astype(int)
#         df_payments['cum_failures'] = df_payments.groupby('customer_id')['is_failed'].cumsum()
#         df_payments['cum_total'] = df_payments.groupby('customer_id').cumcount() + 1
#         df_payments['payment_failure_rate'] = df_payments['cum_failures'] / df_payments['cum_total']

#         # -------------------------------------------------------------
#         # Step 2: Feature Engineering — Customer Aggregates
#         # -------------------------------------------------------------
#         if not df_orders.empty:
#             order_stats = df_orders.groupby('customer_id').agg(
#                 order_count=('id', 'count'),
#                 average_order_value=('total_amount', 'mean')
#             ).reset_index()
#         else:
#             order_stats = pd.DataFrame(columns=['customer_id', 'order_count', 'average_order_value'])

#         if not df_refunds.empty:
#             refund_stats = df_refunds.groupby('customer_id').agg(
#                 refund_count=('id', 'count')
#             ).reset_index()
#         else:
#             refund_stats = pd.DataFrame(columns=['customer_id', 'refund_count'])

#         dev_stats = (
#             df_cust_dev.groupby('customer_id').agg(device_count=('device_id', 'nunique')).reset_index()
#             if not df_cust_dev.empty else pd.DataFrame(columns=['customer_id', 'device_count'])
#         )
#         addr_stats = (
#             df_cust_addr.groupby('customer_id').agg(address_count=('address_id', 'nunique')).reset_index()
#             if not df_cust_addr.empty else pd.DataFrame(columns=['customer_id', 'address_count'])
#         )

#         pay_latest = (
#             df_payments.groupby('customer_id')['created_at'].max().reset_index()
#             if not df_payments.empty else pd.DataFrame(columns=['customer_id', 'created_at'])
#         )
#         pay_latest.columns = ['customer_id', 'latest_activity']

#         df_cust_features = df_cust[['id', 'created_at']].rename(columns={'id': 'customer_id', 'created_at': 'customer_created_at'})
#         df_cust_features = pd.merge(df_cust_features, order_stats, on='customer_id', how='left').fillna(0.0)
#         df_cust_features = pd.merge(df_cust_features, refund_stats, on='customer_id', how='left').fillna(0.0)
#         df_cust_features = pd.merge(df_cust_features, dev_stats, on='customer_id', how='left').fillna(0.0)
#         df_cust_features = pd.merge(df_cust_features, addr_stats, on='customer_id', how='left').fillna(0.0)
#         df_cust_features = pd.merge(df_cust_features, pay_latest, on='customer_id', how='left')

#         df_cust_features['refund_ratio'] = (
#             df_cust_features['refund_count'] / df_cust_features['order_count'].clip(lower=1.0)
#         )
#         latest_timestamp = df_payments['created_at'].max() if not df_payments.empty else datetime.utcnow()
#         df_cust_features['latest_activity'] = df_cust_features['latest_activity'].fillna(latest_timestamp)
#         df_cust_features['account_age'] = (
#             (df_cust_features['latest_activity'] - df_cust_features['customer_created_at']).dt.total_seconds() / (24 * 3600)
#         ).clip(lower=0.1)

#         # -------------------------------------------------------------
#         # Step 3: Feature Engineering — Customer Sharing Graph
#         # -------------------------------------------------------------
#         G = nx.Graph()
#         for cid in df_cust_features['customer_id']:
#             G.add_node(cid)

#         # Connect customers sharing devices
#         if not df_cust_dev.empty:
#             for dev_id, group in df_cust_dev.groupby('device_id'):
#                 custs = group['customer_id'].tolist()
#                 for i in range(len(custs)):
#                     for j in range(i + 1, len(custs)):
#                         G.add_edge(custs[i], custs[j], shared_device=True)

#         # Connect customers sharing addresses
#         if not df_cust_addr.empty:
#             for addr_id, group in df_cust_addr.groupby('address_id'):
#                 custs = group['customer_id'].tolist()
#                 for i in range(len(custs)):
#                     for j in range(i + 1, len(custs)):
#                         edge_data = G.get_edge_data(custs[i], custs[j]) or {}
#                         G.add_edge(custs[i], custs[j], **{**edge_data, "shared_address": True})

#         # Calculate graph metrics
#         shared_device_count = {}
#         shared_address_count = {}
#         for u in G.nodes():
#             dev_count = 0
#             addr_count = 0
#             for v in G.neighbors(u):
#                 edge_data = G.get_edge_data(u, v)
#                 if edge_data.get('shared_device'):
#                     dev_count += 1
#                 if edge_data.get('shared_address'):
#                     addr_count += 1
#             shared_device_count[u] = dev_count
#             shared_address_count[u] = addr_count

#         components = list(nx.connected_components(G))
#         node_to_comp_size = {}
#         node_to_comp_id = {}
#         node_to_density = {}
#         for comp_id, comp in enumerate(components):
#             comp_size = len(comp)
#             subg = G.subgraph(comp)
#             density = nx.density(subg) if comp_size > 1 else 0.0
#             for u in comp:
#                 node_to_comp_size[u] = comp_size
#                 node_to_comp_id[u] = comp_id
#                 node_to_density[u] = density

#         df_cust_features['degree'] = df_cust_features['customer_id'].map(lambda x: G.degree(x)).fillna(0.0)
#         df_cust_features['shared_device_count'] = df_cust_features['customer_id'].map(shared_device_count).fillna(0.0)
#         df_cust_features['shared_address_count'] = df_cust_features['customer_id'].map(shared_address_count).fillna(0.0)
#         df_cust_features['cluster_size'] = df_cust_features['customer_id'].map(node_to_comp_size).fillna(1.0)
#         df_cust_features['graph_density'] = df_cust_features['customer_id'].map(node_to_density).fillna(0.0)
#         df_cust_features['community_id'] = df_cust_features['customer_id'].map(node_to_comp_id).fillna(-1)

#         # -------------------------------------------------------------
#         # Step 4: Transaction Anomaly Model (Isolation Forest)
#         # -------------------------------------------------------------
#         features_tx = [
#             'amount', 'transaction_velocity', 'refund_delay',
#             'time_since_previous_transaction', 'payment_failure_rate',
#             'hourly_velocity', 'daily_refund_rate', 'velocity_change', 'refund_spike'
#         ]
#         X_tx = df_payments[features_tx].fillna(0.0)
#         model_if = IsolationForest(n_estimators=100, random_state=42, contamination='auto')
#         model_if.fit(X_tx)
        
#         raw_scores = model_if.decision_function(X_tx)
#         score_min, score_max = raw_scores.min(), raw_scores.max()
#         if score_max > score_min:
#             # Map raw score so that lower decision_function (outliers) maps to higher anomaly score in [0, 1]
#             df_payments['transaction_anomaly_score'] = 1.0 - (raw_scores - score_min) / (score_max - score_min)
#         else:
#             df_payments['transaction_anomaly_score'] = 0.5

#         # -------------------------------------------------------------
#         # Step 5: Behavioural Clustering (DBSCAN)
#         # -------------------------------------------------------------
#         features_cust = [
#             'order_count', 'refund_count', 'refund_ratio', 'average_order_value',
#             'account_age', 'device_count', 'address_count',
#             'degree', 'shared_device_count', 'shared_address_count',
#             'cluster_size', 'graph_density'
#         ]
#         X_cust = df_cust_features[features_cust].fillna(0.0)
#         scaler = StandardScaler()
#         X_cust_scaled = scaler.fit_transform(X_cust)
        
#         # Fit DBSCAN
#         model_dbscan = DBSCAN(eps=1.5, min_samples=3)
#         cluster_labels = model_dbscan.fit_predict(X_cust_scaled)
#         df_cust_features['cluster_label'] = cluster_labels

#         # -------------------------------------------------------------
#         # Step 6: Risk & Exposure Engine (Discovered Patterns)
#         # -------------------------------------------------------------
        
#         # Merge customer features with payment anomalies
#         df_merged_tx = pd.merge(df_payments, df_cust_features, on='customer_id', how='left')

#         # We define a Discovered Pattern as a community in our resource sharing graph where size >= 2
#         # Let's filter out singletons to focus on connected suspicious networks
#         patterns = []
#         for comp_id, comp in enumerate(components):
#             if len(comp) < 2:
#                 continue

#             comp_list = list(comp)
#             df_comp_custs = df_cust_features[df_cust_features['customer_id'].isin(comp_list)]
#             df_comp_tx = df_merged_tx[df_merged_tx['customer_id'].isin(comp_list)]
            
#             # Count parameters
#             cust_count = len(comp_list)
            
#             # Devices in community
#             dev_ids = df_cust_dev[df_cust_dev['customer_id'].isin(comp_list)]['device_id'].nunique() if not df_cust_dev.empty else 0
#             # Addresses in community
#             addr_ids = df_cust_addr[df_cust_addr['customer_id'].isin(comp_list)]['address_id'].nunique() if not df_cust_addr.empty else 0
            
#             refunds_count = int(df_comp_custs['refund_count'].sum())
            
#             # Financial metrics
#             # Current Exposure: Total refunds already processed
#             current_exposure = float(df_comp_tx['refund_amount'].sum()) if 'refund_amount' in df_comp_tx.columns else 0.0
#             # Potential Exposure: Total captured payments at risk (that haven't been refunded yet)
#             captured_tx = df_comp_tx[df_comp_tx['status'] == 'captured']
#             potential_exposure = float(captured_tx['amount'].sum() - (captured_tx['refund_amount'].fillna(0.0)).sum())

#             # Anomalies and Risk Scores (weighted engine)
#             # 1. Transaction Anomaly Score
#             tx_anomaly = float(df_comp_tx['transaction_anomaly_score'].mean()) if not df_comp_tx.empty else 0.0
            
#             # 2. Graph Anomaly Score (sharing density relative to node count)
#             # High degree, shared devices/addresses compared to customer size
#             graph_anomaly = float(df_comp_custs['degree'].mean() / max(1, cust_count))
            
#             # 3. Temporal Anomaly Score (sudden activity spikes)
#             temporal_anomaly = float(df_comp_tx['velocity_change'].mean()) if not df_comp_tx.empty else 0.0
            
#             # 4. Behavioural Anomaly Score (ratio of refunds and average order patterns)
#             behavioural_anomaly = float(df_comp_custs['refund_ratio'].mean())

#             # Normalize sub-scores to [0, 1] range safely
#             tx_anomaly = np.clip(tx_anomaly, 0.0, 1.0)
#             graph_anomaly = np.clip(graph_anomaly, 0.0, 1.0)
#             temporal_anomaly = np.clip(temporal_anomaly, 0.0, 1.0)
#             behavioural_anomaly = np.clip(behavioural_anomaly, 0.0, 1.0)

#             # Combined Cluster Risk calculation
#             # Cluster Risk = 25% Transaction + 30% Graph + 20% Temporal + 25% Behavioural
#             risk_score = (
#                 0.25 * tx_anomaly +
#                 0.30 * graph_anomaly +
#                 0.20 * temporal_anomaly +
#                 0.25 * behavioural_anomaly
#             )
#             # Convert to percentage
#             risk_percent = round(risk_score * 100, 1)

#             # Expected Loss = Potential Exposure * Risk % + Current Exposure
#             expected_loss = potential_exposure * risk_score + current_exposure

#             # Loss Velocity (Rupees per hour)
#             # Calculated as total exposure divided by span of activities
#             if not df_comp_tx.empty:
#                 tx_times = df_comp_tx['created_at']
#                 time_span_hours = (tx_times.max() - tx_times.min()).total_seconds() / 3600.0
#                 loss_velocity = expected_loss / max(1.0, time_span_hours)
#             else:
#                 loss_velocity = 0.0

#             # List of associated entities for detail view
#             customer_ids = comp_list
#             associated_devices = df_cust_dev[df_cust_dev['customer_id'].isin(comp_list)]['device_id'].unique().tolist() if not df_cust_dev.empty else []
#             associated_addresses = df_cust_addr[df_cust_addr['customer_id'].isin(comp_list)]['address_id'].unique().tolist() if not df_cust_addr.empty else []

#             patterns.append({
#                 "id": f"pattern_{comp_id}",
#                 "cluster_number": comp_id + 1,
#                 "customers_count": cust_count,
#                 "devices_count": dev_ids,
#                 "addresses_count": addr_ids,
#                 "refunds_count": refunds_count,
#                 "current_exposure": round(current_exposure, 2),
#                 "potential_exposure": round(potential_exposure, 2),
#                 "risk_score": risk_percent,
#                 "expected_loss": round(expected_loss, 2),
#                 "loss_velocity": round(loss_velocity, 2),
#                 "customer_ids": customer_ids,
#                 "devices": associated_devices,
#                 "addresses": associated_addresses,
#                 "metrics": {
#                     "transaction_anomaly": round(tx_anomaly * 100, 1),
#                     "graph_anomaly": round(graph_anomaly * 100, 1),
#                     "temporal_anomaly": round(temporal_anomaly * 100, 1),
#                     "behavioural_anomaly": round(behavioural_anomaly * 100, 1),
#                 }
#             })

#         # Sort patterns by risk score & expected loss (highest threat first)
#         patterns = sorted(patterns, key=lambda x: (x['risk_score'], x['expected_loss']), reverse=True)

#         self._cached_patterns = patterns
#         self._last_run_time = datetime.utcnow().isoformat()

#         return {
#             "status": "success",
#             "total_patterns_discovered": len(patterns),
#             "run_timestamp": self._last_run_time
#         }

#     def get_patterns(self) -> list:
#         """Return the cached discovered patterns or run pipeline if empty."""
#         if self._cached_patterns is None:
#             self.run_pipeline()
#         return self._cached_patterns or []

#     def get_pattern_details(self, pattern_id: str) -> dict:
#         """Get full details (customers list and transaction timeline) for a pattern."""
#         patterns = self.get_patterns()
#         pattern = next((p for p in patterns if p['id'] == pattern_id), None)
#         if not pattern:
#             return {}

#         # Load related details
#         customers = load_dataset('customers')
#         payments = load_dataset('payments')
#         refunds = load_dataset('refunds')

#         # Filter
#         member_custs = [c for c in customers if c['id'] in pattern['customer_ids']]
#         member_payments = [p for p in payments if p['customer_id'] in pattern['customer_ids']]
#         member_refunds = [r for r in refunds if r['customer_id'] in pattern['customer_ids']]

#         return {
#             "pattern": pattern,
#             "customers": member_custs,
#             "payments": sorted(member_payments, key=lambda x: x.get('created_at', ''), reverse=True),
#             "refunds": sorted(member_refunds, key=lambda x: x.get('created_at', ''), reverse=True)
#         }

# discovery_service = DiscoveryService()






"""
DiscoveryService — AI/ML Loss Discovery Engine for LossLens.

Performs:
1. Feature engineering (transaction, customer, graph, temporal)
2. Transaction anomaly model (Isolation Forest)
3. Behavioural clustering (DBSCAN)
4. Graph pattern discovery (shared devices, addresses)
5. Temporal engine (velocity, sudden change, spikes)
6. Risk engine (Transaction, Customer, Cluster risks)
7. Financial exposure engine
   - Current exposure
   - Potential exposure
   - Expected loss
   - Loss velocity
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
import networkx as nx

from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler


# ============================================================
# PATH CONFIGURATION
# ============================================================

# discovery_service.py is expected to be inside:
#
# LossLens/
# ├── backend/
# │   └── ...
# │       └── discovery_service.py
# └── data/
#     └── generated/
#
# Therefore:
# __file__
#     -> backend/.../discovery_service.py
#
# We walk upward until we find the project-level data/generated.

CURRENT_FILE = os.path.abspath(__file__)

# Search upward for the project-level data/generated directory.
def find_data_directory():
    current_dir = os.path.dirname(CURRENT_FILE)

    for _ in range(6):
        candidate = os.path.join(current_dir, "data", "generated")

        if os.path.isdir(candidate):
            return candidate

        parent = os.path.dirname(current_dir)

        if parent == current_dir:
            break

        current_dir = parent

    # Fallback:
    # Project root is assumed to be two levels above this file.
    project_root = os.path.dirname(os.path.dirname(CURRENT_FILE))
    return os.path.join(project_root, "data", "generated")


DATA_DIR = find_data_directory()


# ============================================================
# DATASET LOADER
# ============================================================

def load_dataset(filename: str):
    """
    Load a JSON dataset from the project-level data/generated directory.

    Example:
        load_dataset("customers")

    loads:
        <project_root>/data/generated/customers.json
    """

    filepath = os.path.join(DATA_DIR, f"{filename}.json")

    if not os.path.exists(filepath):
        print(f"[DiscoveryService] Dataset not found: {filepath}")
        return []

    try:
        with open(filepath, "r", encoding="utf-8") as fp:
            data = json.load(fp)

        if not isinstance(data, list):
            print(
                f"[DiscoveryService] Invalid dataset format: {filepath}. "
                f"Expected a JSON array."
            )
            return []

        return data

    except json.JSONDecodeError as exc:
        print(
            f"[DiscoveryService] Invalid JSON in {filepath}: {exc}"
        )
        return []

    except Exception as exc:
        print(
            f"[DiscoveryService] Failed to load {filepath}: {exc}"
        )
        return []


# ============================================================
# DISCOVERY SERVICE
# ============================================================

class DiscoveryService:

    def __init__(self):
        self._cached_patterns = None
        self._last_run_time = None

    # ========================================================
    # MAIN PIPELINE
    # ========================================================

    def run_pipeline(self) -> dict:
        """
        Run the complete ML pattern discovery pipeline.
        """

        print("\n" + "=" * 70)
        print("LOSSLENS DISCOVERY PIPELINE")
        print("=" * 70)

        print(f"[DiscoveryService] BASE FILE: {CURRENT_FILE}")
        print(f"[DiscoveryService] DATA_DIR: {DATA_DIR}")

        # ----------------------------------------------------
        # 1. LOAD DATASETS
        # ----------------------------------------------------

        customers = load_dataset("customers")
        orders = load_dataset("orders")
        payments = load_dataset("payments")
        refunds = load_dataset("refunds")
        devices = load_dataset("devices")
        addresses = load_dataset("addresses")
        customer_device = load_dataset("customer_device")
        customer_address = load_dataset("customer_address")
        order_product = load_dataset("order_product")
        coupons = load_dataset("coupons")

        print("\n[DiscoveryService] Dataset sizes:")
        print(f"  customers       : {len(customers)}")
        print(f"  orders          : {len(orders)}")
        print(f"  payments        : {len(payments)}")
        print(f"  refunds         : {len(refunds)}")
        print(f"  devices         : {len(devices)}")
        print(f"  addresses       : {len(addresses)}")
        print(f"  customer_device : {len(customer_device)}")
        print(f"  customer_address: {len(customer_address)}")
        print(f"  order_product   : {len(order_product)}")
        print(f"  coupons         : {len(coupons)}")

        # ----------------------------------------------------
        # REQUIRED DATA VALIDATION
        # ----------------------------------------------------

        if not customers:
            result = {
                "status": "error",
                "message": "Customers dataset is empty or could not be loaded"
            }

            print(f"\nDISCOVERY PIPELINE RESULT: {result}")
            return result

        if not payments:
            result = {
                "status": "error",
                "message": "Payments dataset is empty or could not be loaded"
            }

            print(f"\nDISCOVERY PIPELINE RESULT: {result}")
            return result

        # ----------------------------------------------------
        # 2. DATAFRAMES
        # ----------------------------------------------------

        df_cust = pd.DataFrame(customers)
        df_orders = pd.DataFrame(orders)
        df_payments = pd.DataFrame(payments)
        df_refunds = pd.DataFrame(refunds)
        df_cust_dev = pd.DataFrame(customer_device)
        df_cust_addr = pd.DataFrame(customer_address)

        # ----------------------------------------------------
        # Validate required columns
        # ----------------------------------------------------

        required_customer_columns = {"id", "created_at"}
        required_payment_columns = {
            "id",
            "customer_id",
            "amount",
            "status",
            "created_at"
        }

        missing_customer_columns = (
            required_customer_columns - set(df_cust.columns)
        )

        missing_payment_columns = (
            required_payment_columns - set(df_payments.columns)
        )

        if missing_customer_columns:
            result = {
                "status": "error",
                "message": (
                    "Customers dataset missing required columns: "
                    + ", ".join(sorted(missing_customer_columns))
                )
            }

            print(f"\nDISCOVERY PIPELINE RESULT: {result}")
            return result

        if missing_payment_columns:
            result = {
                "status": "error",
                "message": (
                    "Payments dataset missing required columns: "
                    + ", ".join(sorted(missing_payment_columns))
                )
            }

            print(f"\nDISCOVERY PIPELINE RESULT: {result}")
            return result

        # ----------------------------------------------------
        # 3. PARSE TIMESTAMPS
        # ----------------------------------------------------

        try:
            df_cust["created_at"] = pd.to_datetime(
                df_cust["created_at"],
                errors="coerce"
            )

            if not df_orders.empty and "created_at" in df_orders.columns:
                df_orders["created_at"] = pd.to_datetime(
                    df_orders["created_at"],
                    errors="coerce"
                )

            df_payments["created_at"] = pd.to_datetime(
                df_payments["created_at"],
                errors="coerce"
            )

            if not df_refunds.empty and "created_at" in df_refunds.columns:
                df_refunds["created_at"] = pd.to_datetime(
                    df_refunds["created_at"],
                    errors="coerce"
                )

        except Exception as exc:
            result = {
                "status": "error",
                "message": f"Timestamp parsing failed: {str(exc)}"
            }

            print(f"\nDISCOVERY PIPELINE RESULT: {result}")
            return result

        # Remove rows with invalid critical timestamps.

        df_cust = df_cust.dropna(subset=["created_at"])
        df_payments = df_payments.dropna(
            subset=["created_at", "customer_id"]
        )

        if df_cust.empty or df_payments.empty:
            result = {
                "status": "error",
                "message": "No valid customer/payment records after timestamp validation"
            }

            print(f"\nDISCOVERY PIPELINE RESULT: {result}")
            return result

        # ----------------------------------------------------
        # STEP 1
        # FEATURE ENGINEERING — TRANSACTION
        # ----------------------------------------------------

        df_payments = (
            df_payments
            .sort_values(["customer_id", "created_at"])
            .reset_index(drop=True)
        )

        # ----------------------------------------------------
        # Time since previous transaction
        # ----------------------------------------------------

        df_payments["prev_created_at"] = (
            df_payments
            .groupby("customer_id")["created_at"]
            .shift(1)
        )

        df_payments["time_since_previous_transaction"] = (
            df_payments["created_at"]
            - df_payments["prev_created_at"]
        ).dt.total_seconds().fillna(0.0)

        # ----------------------------------------------------
        # Transaction velocity — rolling 24 hours
        # ----------------------------------------------------

        velocity_groups = []

        for customer_id, group in df_payments.groupby("customer_id"):

            group = group.copy()

            times = group["created_at"].values

            left_indices = np.searchsorted(
                times,
                times - np.timedelta64(24, "h"),
                side="left"
            )

            right_indices = np.arange(len(times)) + 1

            counts = right_indices - left_indices

            group["transaction_velocity"] = counts.astype(float)

            velocity_groups.append(group)

        df_payments = pd.concat(
            velocity_groups,
            ignore_index=True
        )

        # ----------------------------------------------------
        # Hourly velocity
        # ----------------------------------------------------

        hourly_groups = []

        for customer_id, group in df_payments.groupby("customer_id"):

            group = group.copy()

            times = group["created_at"].values

            left_indices = np.searchsorted(
                times,
                times - np.timedelta64(1, "h"),
                side="left"
            )

            right_indices = np.arange(len(times)) + 1

            counts = right_indices - left_indices

            group["hourly_velocity"] = counts.astype(float)

            hourly_groups.append(group)

        df_payments = pd.concat(
            hourly_groups,
            ignore_index=True
        )

        # ----------------------------------------------------
        # Velocity change
        # ----------------------------------------------------

        df_payments["velocity_change"] = (
            df_payments["hourly_velocity"]
            /
            df_payments["transaction_velocity"].clip(lower=1.0)
        )

        # ----------------------------------------------------
        # STEP 1B
        # REFUND FEATURES
        # ----------------------------------------------------

        if not df_refunds.empty:

            required_refund_columns = {
                "payment_id",
                "amount",
                "created_at"
            }

            if required_refund_columns.issubset(
                set(df_refunds.columns)
            ):

                df_ref_agg = (
                    df_refunds
                    .groupby("payment_id")
                    .agg(
                        refund_created_at=("created_at", "min"),
                        refund_amount=("amount", "sum")
                    )
                    .reset_index()
                )

                df_payments = pd.merge(
                    df_payments,
                    df_ref_agg,
                    left_on="id",
                    right_on="payment_id",
                    how="left"
                )

                df_payments["refund_delay"] = (
                    df_payments["refund_created_at"]
                    - df_payments["created_at"]
                ).dt.total_seconds().fillna(0.0)

                df_payments["is_refunded"] = (
                    df_payments["refund_amount"]
                    .notna()
                    .astype(int)
                )

                df_payments["refund_amount"] = (
                    df_payments["refund_amount"]
                    .fillna(0.0)
                )

            else:

                df_payments["refund_delay"] = 0.0
                df_payments["is_refunded"] = 0
                df_payments["refund_amount"] = 0.0

        else:

            df_payments["refund_delay"] = 0.0
            df_payments["is_refunded"] = 0
            df_payments["refund_amount"] = 0.0

        # ----------------------------------------------------
        # Refund velocity
        # ----------------------------------------------------

        df_payments["daily_refunds"] = 0.0
        df_payments["weekly_refunds"] = 0.0

        if (
            not df_refunds.empty
            and "customer_id" in df_refunds.columns
            and "created_at" in df_refunds.columns
        ):

            df_payments = (
                df_payments
                .sort_values(["customer_id", "created_at"])
                .reset_index(drop=True)
            )

            df_refunds = (
                df_refunds
                .sort_values(["customer_id", "created_at"])
                .reset_index(drop=True)
            )

            refund_groups = df_refunds.groupby("customer_id")

            daily_list = np.zeros(len(df_payments))
            weekly_list = np.zeros(len(df_payments))

            df_payments["temp_idx"] = np.arange(
                len(df_payments)
            )

            for customer_id, pay_grp in df_payments.groupby(
                "customer_id"
            ):

                if customer_id not in refund_groups.groups:
                    continue

                ref_grp = refund_groups.get_group(customer_id)

                if ref_grp.empty:
                    continue

                p_times = pay_grp["created_at"].values
                r_times = ref_grp["created_at"].values

                idx_right = np.searchsorted(
                    r_times,
                    p_times,
                    side="right"
                )

                idx_left_24h = np.searchsorted(
                    r_times,
                    p_times - np.timedelta64(24, "h"),
                    side="left"
                )

                idx_left_7d = np.searchsorted(
                    r_times,
                    p_times - np.timedelta64(7, "D"),
                    side="left"
                )

                daily_counts = (
                    idx_right - idx_left_24h
                )

                weekly_counts = (
                    idx_right - idx_left_7d
                )

                indices = pay_grp["temp_idx"].values

                daily_list[indices] = daily_counts
                weekly_list[indices] = weekly_counts

            df_payments["daily_refunds"] = daily_list
            df_payments["weekly_refunds"] = weekly_list

            df_payments.drop(
                columns=["temp_idx"],
                inplace=True
            )

        # ----------------------------------------------------
        # Refund rates
        # ----------------------------------------------------

        df_payments["daily_refund_rate"] = (
            df_payments["daily_refunds"]
            /
            df_payments["transaction_velocity"].clip(lower=1.0)
        )

        df_payments["refund_spike"] = (
            df_payments["daily_refunds"]
            /
            (
                df_payments["weekly_refunds"] / 7.0
            ).clip(lower=0.1)
        )

        # ----------------------------------------------------
        # Payment failure rate
        # ----------------------------------------------------

        df_payments["is_failed"] = (
            df_payments["status"]
            .astype(str)
            .str.lower()
            .eq("failed")
            .astype(int)
        )

        df_payments["cum_failures"] = (
            df_payments
            .groupby("customer_id")["is_failed"]
            .cumsum()
        )

        df_payments["cum_total"] = (
            df_payments
            .groupby("customer_id")
            .cumcount()
            + 1
        )

        df_payments["payment_failure_rate"] = (
            df_payments["cum_failures"]
            /
            df_payments["cum_total"]
        )

        # ----------------------------------------------------
        # STEP 2
        # CUSTOMER AGGREGATES
        # ----------------------------------------------------

        if (
            not df_orders.empty
            and {"customer_id", "id", "total_amount"}.issubset(
                set(df_orders.columns)
            )
        ):

            order_stats = (
                df_orders
                .groupby("customer_id")
                .agg(
                    order_count=("id", "count"),
                    average_order_value=(
                        "total_amount",
                        "mean"
                    )
                )
                .reset_index()
            )

        else:

            order_stats = pd.DataFrame(
                columns=[
                    "customer_id",
                    "order_count",
                    "average_order_value"
                ]
            )

        # ----------------------------------------------------
        # Refund stats
        # ----------------------------------------------------

        if (
            not df_refunds.empty
            and {"customer_id", "id"}.issubset(
                set(df_refunds.columns)
            )
        ):

            refund_stats = (
                df_refunds
                .groupby("customer_id")
                .agg(
                    refund_count=("id", "count")
                )
                .reset_index()
            )

        else:

            refund_stats = pd.DataFrame(
                columns=[
                    "customer_id",
                    "refund_count"
                ]
            )

        # ----------------------------------------------------
        # Device stats
        # ----------------------------------------------------

        if (
            not df_cust_dev.empty
            and {"customer_id", "device_id"}.issubset(
                set(df_cust_dev.columns)
            )
        ):

            dev_stats = (
                df_cust_dev
                .groupby("customer_id")
                .agg(
                    device_count=(
                        "device_id",
                        "nunique"
                    )
                )
                .reset_index()
            )

        else:

            dev_stats = pd.DataFrame(
                columns=[
                    "customer_id",
                    "device_count"
                ]
            )

        # ----------------------------------------------------
        # Address stats
        # ----------------------------------------------------

        if (
            not df_cust_addr.empty
            and {"customer_id", "address_id"}.issubset(
                set(df_cust_addr.columns)
            )
        ):

            addr_stats = (
                df_cust_addr
                .groupby("customer_id")
                .agg(
                    address_count=(
                        "address_id",
                        "nunique"
                    )
                )
                .reset_index()
            )

        else:

            addr_stats = pd.DataFrame(
                columns=[
                    "customer_id",
                    "address_count"
                ]
            )

        # ----------------------------------------------------
        # Latest payment activity
        # ----------------------------------------------------

        pay_latest = (
            df_payments
            .groupby("customer_id")["created_at"]
            .max()
            .reset_index()
        )

        pay_latest.columns = [
            "customer_id",
            "latest_activity"
        ]

        # ----------------------------------------------------
        # Build customer feature dataframe
        # ----------------------------------------------------

        df_cust_features = (
            df_cust[
                ["id", "created_at"]
            ]
            .rename(
                columns={
                    "id": "customer_id",
                    "created_at": "customer_created_at"
                }
            )
        )

        df_cust_features = pd.merge(
            df_cust_features,
            order_stats,
            on="customer_id",
            how="left"
        )

        df_cust_features = pd.merge(
            df_cust_features,
            refund_stats,
            on="customer_id",
            how="left"
        )

        df_cust_features = pd.merge(
            df_cust_features,
            dev_stats,
            on="customer_id",
            how="left"
        )

        df_cust_features = pd.merge(
            df_cust_features,
            addr_stats,
            on="customer_id",
            how="left"
        )

        df_cust_features = pd.merge(
            df_cust_features,
            pay_latest,
            on="customer_id",
            how="left"
        )

        # ----------------------------------------------------
        # Fill numeric missing values
        # ----------------------------------------------------

        numeric_columns = [
            "order_count",
            "average_order_value",
            "refund_count",
            "device_count",
            "address_count"
        ]

        for column in numeric_columns:

            if column not in df_cust_features.columns:
                df_cust_features[column] = 0.0

            df_cust_features[column] = (
                pd.to_numeric(
                    df_cust_features[column],
                    errors="coerce"
                )
                .fillna(0.0)
            )

        # ----------------------------------------------------
        # Refund ratio
        # ----------------------------------------------------

        df_cust_features["refund_ratio"] = (
            df_cust_features["refund_count"]
            /
            df_cust_features["order_count"].clip(
                lower=1.0
            )
        )

        # ----------------------------------------------------
        # Account age
        # ----------------------------------------------------

        latest_timestamp = (
            df_payments["created_at"].max()
            if not df_payments.empty
            else pd.Timestamp.utcnow()
        )

        df_cust_features["latest_activity"] = (
            df_cust_features["latest_activity"]
            .fillna(latest_timestamp)
        )

        df_cust_features["account_age"] = (
            (
                df_cust_features["latest_activity"]
                -
                df_cust_features["customer_created_at"]
            )
            .dt.total_seconds()
            /
            (24 * 3600)
        ).clip(lower=0.1)

        # ----------------------------------------------------
        # STEP 3
        # CUSTOMER SHARING GRAPH
        # ----------------------------------------------------

        G = nx.Graph()

        for customer_id in df_cust_features["customer_id"]:
            G.add_node(customer_id)

        # ----------------------------------------------------
        # Shared devices
        # ----------------------------------------------------

        if (
            not df_cust_dev.empty
            and {"customer_id", "device_id"}.issubset(
                set(df_cust_dev.columns)
            )
        ):

            for device_id, group in df_cust_dev.groupby(
                "device_id"
            ):

                custs = group[
                    "customer_id"
                ].dropna().unique().tolist()

                for i in range(len(custs)):

                    for j in range(i + 1, len(custs)):

                        G.add_edge(
                            custs[i],
                            custs[j],
                            shared_device=True
                        )

        # ----------------------------------------------------
        # Shared addresses
        # ----------------------------------------------------

        if (
            not df_cust_addr.empty
            and {"customer_id", "address_id"}.issubset(
                set(df_cust_addr.columns)
            )
        ):

            for address_id, group in df_cust_addr.groupby(
                "address_id"
            ):

                custs = group[
                    "customer_id"
                ].dropna().unique().tolist()

                for i in range(len(custs)):

                    for j in range(i + 1, len(custs)):

                        edge_data = (
                            G.get_edge_data(
                                custs[i],
                                custs[j]
                            )
                            or {}
                        )

                        edge_data["shared_address"] = True

                        G.add_edge(
                            custs[i],
                            custs[j],
                            **edge_data
                        )

        # ----------------------------------------------------
        # Graph metrics
        # ----------------------------------------------------

        shared_device_count = {}
        shared_address_count = {}

        for customer_id in G.nodes():

            device_count = 0
            address_count = 0

            for neighbor in G.neighbors(customer_id):

                edge_data = G.get_edge_data(
                    customer_id,
                    neighbor
                ) or {}

                if edge_data.get(
                    "shared_device",
                    False
                ):
                    device_count += 1

                if edge_data.get(
                    "shared_address",
                    False
                ):
                    address_count += 1

            shared_device_count[
                customer_id
            ] = device_count

            shared_address_count[
                customer_id
            ] = address_count

        # ----------------------------------------------------
        # Connected components
        # ----------------------------------------------------

        components = list(
            nx.connected_components(G)
        )

        node_to_comp_size = {}
        node_to_comp_id = {}
        node_to_density = {}

        for comp_id, component in enumerate(
            components
        ):

            component_size = len(component)

            subgraph = G.subgraph(component)

            density = (
                nx.density(subgraph)
                if component_size > 1
                else 0.0
            )

            for customer_id in component:

                node_to_comp_size[
                    customer_id
                ] = component_size

                node_to_comp_id[
                    customer_id
                ] = comp_id

                node_to_density[
                    customer_id
                ] = density

        # ----------------------------------------------------
        # Add graph features
        # ----------------------------------------------------

        df_cust_features["degree"] = (
            df_cust_features["customer_id"]
            .map(lambda x: G.degree(x))
            .fillna(0.0)
        )

        df_cust_features["shared_device_count"] = (
            df_cust_features["customer_id"]
            .map(shared_device_count)
            .fillna(0.0)
        )

        df_cust_features["shared_address_count"] = (
            df_cust_features["customer_id"]
            .map(shared_address_count)
            .fillna(0.0)
        )

        df_cust_features["cluster_size"] = (
            df_cust_features["customer_id"]
            .map(node_to_comp_size)
            .fillna(1.0)
        )

        df_cust_features["graph_density"] = (
            df_cust_features["customer_id"]
            .map(node_to_density)
            .fillna(0.0)
        )

        df_cust_features["community_id"] = (
            df_cust_features["customer_id"]
            .map(node_to_comp_id)
            .fillna(-1)
        )

        # ----------------------------------------------------
        # STEP 4
        # TRANSACTION ANOMALY MODEL
        # ----------------------------------------------------

        features_tx = [
            "amount",
            "transaction_velocity",
            "refund_delay",
            "time_since_previous_transaction",
            "payment_failure_rate",
            "hourly_velocity",
            "daily_refund_rate",
            "velocity_change",
            "refund_spike"
        ]

        # Make sure every required feature exists.

        for feature in features_tx:

            if feature not in df_payments.columns:
                df_payments[feature] = 0.0

            df_payments[feature] = (
                pd.to_numeric(
                    df_payments[feature],
                    errors="coerce"
                )
                .replace(
                    [np.inf, -np.inf],
                    np.nan
                )
                .fillna(0.0)
            )

        X_tx = df_payments[
            features_tx
        ]

        # ----------------------------------------------------
        # Isolation Forest
        # ----------------------------------------------------

        if len(X_tx) >= 2:

            model_if = IsolationForest(
                n_estimators=100,
                random_state=42,
                contamination="auto"
            )

            model_if.fit(X_tx)

            raw_scores = (
                model_if
                .decision_function(X_tx)
            )

            score_min = raw_scores.min()
            score_max = raw_scores.max()

            if score_max > score_min:

                df_payments[
                    "transaction_anomaly_score"
                ] = (
                    1.0
                    -
                    (
                        raw_scores - score_min
                    )
                    /
                    (
                        score_max - score_min
                    )
                )

            else:

                df_payments[
                    "transaction_anomaly_score"
                ] = 0.5

        else:

            df_payments[
                "transaction_anomaly_score"
            ] = 0.5

        # ----------------------------------------------------
        # STEP 5
        # BEHAVIOURAL CLUSTERING
        # ----------------------------------------------------

        features_cust = [
            "order_count",
            "refund_count",
            "refund_ratio",
            "average_order_value",
            "account_age",
            "device_count",
            "address_count",
            "degree",
            "shared_device_count",
            "shared_address_count",
            "cluster_size",
            "graph_density"
        ]

        for feature in features_cust:

            if feature not in df_cust_features.columns:
                df_cust_features[feature] = 0.0

            df_cust_features[feature] = (
                pd.to_numeric(
                    df_cust_features[feature],
                    errors="coerce"
                )
                .replace(
                    [np.inf, -np.inf],
                    np.nan
                )
                .fillna(0.0)
            )

        X_cust = df_cust_features[
            features_cust
        ]

        if len(X_cust) >= 3:

            scaler = StandardScaler()

            X_cust_scaled = scaler.fit_transform(
                X_cust
            )

            model_dbscan = DBSCAN(
                eps=1.5,
                min_samples=3
            )

            cluster_labels = (
                model_dbscan
                .fit_predict(X_cust_scaled)
            )

            df_cust_features[
                "cluster_label"
            ] = cluster_labels

        else:

            df_cust_features[
                "cluster_label"
            ] = -1

        # ----------------------------------------------------
        # STEP 6
        # MERGE TRANSACTION + CUSTOMER FEATURES
        # ----------------------------------------------------

        df_merged_tx = pd.merge(
            df_payments,
            df_cust_features,
            on="customer_id",
            how="left"
        )

        # ----------------------------------------------------
        # STEP 7
        # DISCOVER PATTERNS
        # ----------------------------------------------------

        patterns = []

        # A pattern is a connected customer community
        # containing at least two customers.

        for comp_id, component in enumerate(
            components
        ):

            if len(component) < 2:
                continue

            comp_list = list(component)

            df_comp_custs = (
                df_cust_features[
                    df_cust_features[
                        "customer_id"
                    ].isin(comp_list)
                ]
            )

            df_comp_tx = (
                df_merged_tx[
                    df_merged_tx[
                        "customer_id"
                    ].isin(comp_list)
                ]
            )

            customer_count = len(comp_list)

            # ------------------------------------------------
            # Devices
            # ------------------------------------------------

            if (
                not df_cust_dev.empty
                and {
                    "customer_id",
                    "device_id"
                }.issubset(
                    set(df_cust_dev.columns)
                )
            ):

                device_count = (
                    df_cust_dev[
                        df_cust_dev[
                            "customer_id"
                        ].isin(comp_list)
                    ]["device_id"]
                    .nunique()
                )

            else:

                device_count = 0

            # ------------------------------------------------
            # Addresses
            # ------------------------------------------------

            if (
                not df_cust_addr.empty
                and {
                    "customer_id",
                    "address_id"
                }.issubset(
                    set(df_cust_addr.columns)
                )
            ):

                address_count = (
                    df_cust_addr[
                        df_cust_addr[
                            "customer_id"
                        ].isin(comp_list)
                    ]["address_id"]
                    .nunique()
                )

            else:

                address_count = 0

            # ------------------------------------------------
            # Refund count
            # ------------------------------------------------

            refunds_count = int(
                df_comp_custs[
                    "refund_count"
                ].sum()
            )

            # ------------------------------------------------
            # Current exposure
            # ------------------------------------------------

            if (
                "refund_amount"
                in df_comp_tx.columns
            ):

                current_exposure = float(
                    df_comp_tx[
                        "refund_amount"
                    ]
                    .fillna(0.0)
                    .sum()
                )

            else:

                current_exposure = 0.0

            # ------------------------------------------------
            # Potential exposure
            # ------------------------------------------------

            if "status" in df_comp_tx.columns:

                captured_tx = df_comp_tx[
                    df_comp_tx[
                        "status"
                    ]
                    .astype(str)
                    .str.lower()
                    .eq("captured")
                ]

            else:

                captured_tx = df_comp_tx

            if not captured_tx.empty:

                captured_amount = float(
                    pd.to_numeric(
                        captured_tx["amount"],
                        errors="coerce"
                    )
                    .fillna(0.0)
                    .sum()
                )

                refunded_amount = float(
                    captured_tx[
                        "refund_amount"
                    ]
                    .fillna(0.0)
                    .sum()
                    if "refund_amount"
                    in captured_tx.columns
                    else 0.0
                )

                potential_exposure = (
                    captured_amount
                    -
                    refunded_amount
                )

            else:

                potential_exposure = 0.0

            potential_exposure = max(
                0.0,
                potential_exposure
            )

            # ------------------------------------------------
            # Transaction anomaly
            # ------------------------------------------------

            if not df_comp_tx.empty:

                tx_anomaly = float(
                    df_comp_tx[
                        "transaction_anomaly_score"
                    ]
                    .mean()
                )

            else:

                tx_anomaly = 0.0

            # ------------------------------------------------
            # Graph anomaly
            # ------------------------------------------------

            if not df_comp_custs.empty:

                graph_anomaly = float(
                    df_comp_custs[
                        "degree"
                    ].mean()
                    /
                    max(1, customer_count)
                )

            else:

                graph_anomaly = 0.0

            # ------------------------------------------------
            # Temporal anomaly
            # ------------------------------------------------

            if not df_comp_tx.empty:

                temporal_anomaly = float(
                    df_comp_tx[
                        "velocity_change"
                    ]
                    .mean()
                )

            else:

                temporal_anomaly = 0.0

            # ------------------------------------------------
            # Behavioural anomaly
            # ------------------------------------------------

            if not df_comp_custs.empty:

                behavioural_anomaly = float(
                    df_comp_custs[
                        "refund_ratio"
                    ]
                    .mean()
                )

            else:

                behavioural_anomaly = 0.0

            # ------------------------------------------------
            # Normalize
            # ------------------------------------------------

            tx_anomaly = float(
                np.clip(
                    tx_anomaly,
                    0.0,
                    1.0
                )
            )

            graph_anomaly = float(
                np.clip(
                    graph_anomaly,
                    0.0,
                    1.0
                )
            )

            temporal_anomaly = float(
                np.clip(
                    temporal_anomaly,
                    0.0,
                    1.0
                )
            )

            behavioural_anomaly = float(
                np.clip(
                    behavioural_anomaly,
                    0.0,
                    1.0
                )
            )

            # ------------------------------------------------
            # Combined risk
            # ------------------------------------------------

            risk_score = (
                0.25 * tx_anomaly
                +
                0.30 * graph_anomaly
                +
                0.20 * temporal_anomaly
                +
                0.25 * behavioural_anomaly
            )

            risk_score = float(
                np.clip(
                    risk_score,
                    0.0,
                    1.0
                )
            )

            risk_percent = round(
                risk_score * 100,
                1
            )

            # ------------------------------------------------
            # Expected loss
            # ------------------------------------------------

            expected_loss = (
                potential_exposure
                * risk_score
                +
                current_exposure
            )

            # ------------------------------------------------
            # Loss velocity
            # ------------------------------------------------

            if not df_comp_tx.empty:

                tx_times = df_comp_tx[
                    "created_at"
                ]

                time_span_hours = (
                    tx_times.max()
                    -
                    tx_times.min()
                ).total_seconds() / 3600.0

                loss_velocity = (
                    expected_loss
                    /
                    max(
                        1.0,
                        time_span_hours
                    )
                )

            else:

                loss_velocity = 0.0

            # ------------------------------------------------
            # Associated devices
            # ------------------------------------------------

            if (
                not df_cust_dev.empty
                and {
                    "customer_id",
                    "device_id"
                }.issubset(
                    set(df_cust_dev.columns)
                )
            ):

                associated_devices = (
                    df_cust_dev[
                        df_cust_dev[
                            "customer_id"
                        ].isin(comp_list)
                    ]["device_id"]
                    .dropna()
                    .unique()
                    .tolist()
                )

            else:

                associated_devices = []

            # ------------------------------------------------
            # Associated addresses
            # ------------------------------------------------

            if (
                not df_cust_addr.empty
                and {
                    "customer_id",
                    "address_id"
                }.issubset(
                    set(df_cust_addr.columns)
                )
            ):

                associated_addresses = (
                    df_cust_addr[
                        df_cust_addr[
                            "customer_id"
                        ].isin(comp_list)
                    ]["address_id"]
                    .dropna()
                    .unique()
                    .tolist()
                )

            else:

                associated_addresses = []

            # ------------------------------------------------
            # Pattern object
            # ------------------------------------------------

            patterns.append(
                {
                    "id": f"pattern_{comp_id}",

                    "cluster_number":
                        comp_id + 1,

                    "customers_count":
                        customer_count,

                    "devices_count":
                        int(device_count),

                    "addresses_count":
                        int(address_count),

                    "refunds_count":
                        refunds_count,

                    "current_exposure":
                        round(
                            current_exposure,
                            2
                        ),

                    "potential_exposure":
                        round(
                            potential_exposure,
                            2
                        ),

                    "risk_score":
                        risk_percent,

                    "expected_loss":
                        round(
                            expected_loss,
                            2
                        ),

                    "loss_velocity":
                        round(
                            loss_velocity,
                            2
                        ),

                    "customer_ids":
                        comp_list,

                    "devices":
                        associated_devices,

                    "addresses":
                        associated_addresses,

                    "metrics":
                        {
                            "transaction_anomaly":
                                round(
                                    tx_anomaly * 100,
                                    1
                                ),

                            "graph_anomaly":
                                round(
                                    graph_anomaly * 100,
                                    1
                                ),

                            "temporal_anomaly":
                                round(
                                    temporal_anomaly * 100,
                                    1
                                ),

                            "behavioural_anomaly":
                                round(
                                    behavioural_anomaly * 100,
                                    1
                                )
                        }
                }
            )

        # ----------------------------------------------------
        # STEP 8
        # SORT PATTERNS
        # ----------------------------------------------------

        patterns = sorted(
            patterns,
            key=lambda x: (
                x["risk_score"],
                x["expected_loss"]
            ),
            reverse=True
        )

        # ----------------------------------------------------
        # CACHE
        # ----------------------------------------------------

        self._cached_patterns = patterns

        self._last_run_time = (
            datetime.utcnow().isoformat()
        )

        result = {
            "status": "success",
            "total_patterns_discovered":
                len(patterns),
            "run_timestamp":
                self._last_run_time
        }

        print(
            f"\nDISCOVERY PIPELINE RESULT: {result}"
        )

        return result

    # ========================================================
    # GET PATTERNS
    # ========================================================

    def get_patterns(self) -> list:
        """
        Return cached discovered patterns.

        If the pipeline has never been executed,
        run it automatically.
        """

        if self._cached_patterns is None:

            result = self.run_pipeline()

            if result.get("status") != "success":
                return []

        return self._cached_patterns or []

    # ========================================================
    # GET PATTERN DETAILS
    # ========================================================

    def get_pattern_details(
        self,
        pattern_id: str
    ) -> dict:

        """
        Get full details for a discovered pattern.

        Includes:
        - Pattern summary
        - Customers
        - Payments
        - Refunds
        """

        patterns = self.get_patterns()

        pattern = next(
            (
                p
                for p in patterns
                if p["id"] == pattern_id
            ),
            None
        )

        if not pattern:
            return {}

        customers = load_dataset(
            "customers"
        )

        payments = load_dataset(
            "payments"
        )

        refunds = load_dataset(
            "refunds"
        )

        customer_ids = set(
            pattern["customer_ids"]
        )

        # ----------------------------------------------------
        # Filter customers
        # ----------------------------------------------------

        member_customers = [
            customer
            for customer in customers
            if customer.get("id")
            in customer_ids
        ]

        # ----------------------------------------------------
        # Filter payments
        # ----------------------------------------------------

        member_payments = [
            payment
            for payment in payments
            if payment.get("customer_id")
            in customer_ids
        ]

        # ----------------------------------------------------
        # Filter refunds
        # ----------------------------------------------------

        member_refunds = [
            refund
            for refund in refunds
            if refund.get("customer_id")
            in customer_ids
        ]

        # ----------------------------------------------------
        # Sort timelines
        # ----------------------------------------------------

        member_payments = sorted(
            member_payments,
            key=lambda x: x.get(
                "created_at",
                ""
            ),
            reverse=True
        )

        member_refunds = sorted(
            member_refunds,
            key=lambda x: x.get(
                "created_at",
                ""
            ),
            reverse=True
        )

        return {
            "pattern": pattern,

            "customers":
                member_customers,

            "payments":
                member_payments,

            "refunds":
                member_refunds
        }


# ============================================================
# SINGLE SERVICE INSTANCE
# ============================================================

discovery_service = DiscoveryService()
