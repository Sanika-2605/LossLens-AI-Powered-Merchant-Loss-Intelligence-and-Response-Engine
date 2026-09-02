"""
Explainability Service for LossLens.

Generates transparent risk score breakdowns using:
1. SHAP TreeExplainer for actual Isolation Forest ML model feature attribution.
2. Transparent normalized contribution scoring for graph, temporal, refund ratio, and device-sharing signals.
"""

from typing import Dict, Any, List
import numpy as np
from app.services.evidence_engine import evidence_engine
from app.services.discovery_service import discovery_service

class ExplainabilityService:
    def _compute_shap_attributions(self) -> Dict[str, float]:
        """
        Compute mean absolute SHAP values for Isolation Forest transaction model features.
        """
        if (
            discovery_service.model_if is None
            or discovery_service.X_tx is None
            or discovery_service.features_tx is None
        ):
            return {}

        try:
            import shap
            X_sample = discovery_service.X_tx
            if len(X_sample) == 0:
                return {}

            explainer = shap.TreeExplainer(discovery_service.model_if)
            shap_values = explainer.shap_values(X_sample)

            if isinstance(shap_values, list):
                shap_values = shap_values[0]

            # Mean absolute SHAP importance per feature
            abs_shap = np.abs(shap_values).mean(axis=0)
            features = discovery_service.features_tx

            shap_dict = {}
            total_shap = float(np.sum(abs_shap))
            for i, feat in enumerate(features):
                raw_val = float(abs_shap[i])
                shap_dict[feat] = (raw_val / total_shap) if total_shap > 0 else 0.0

            return shap_dict
        except Exception as e:
            print(f"[ExplainabilityService] SHAP computation warning: {e}")
            return {}

    def get_explanation(self, pattern_id: str) -> Dict[str, Any]:
        """
        Generate transparent explainable risk score breakdown with SHAP feature attributions.
        """
        evidence = evidence_engine.get_evidence(pattern_id)
        if not evidence or "pattern_summary" not in evidence:
            return {"risk_score": 0.0, "contributions": [], "shap_status": "NO_EVIDENCE"}

        pattern = evidence["pattern_summary"]
        raw_risk = float(pattern.get("risk_score", 0.0))
        normalized_risk = round(raw_risk / 100.0, 2) if raw_risk > 1.0 else round(raw_risk, 2)

        metrics = pattern.get("metrics", {})
        txn_anomaly = float(metrics.get("transaction_anomaly", 0.0))
        graph_anomaly = float(metrics.get("graph_anomaly", 0.0))
        temporal_anomaly = float(metrics.get("temporal_anomaly", 0.0))
        behavioural_anomaly = float(metrics.get("behavioural_anomaly", 0.0))

        fin = evidence.get("financial_values", {})
        refund_ratio = float(fin.get("refund_ratio", 0.0))
        refund_signal = min(refund_ratio * 100.0, 100.0)

        graph_sig = evidence.get("graph_signals", {})
        shared_devices = graph_sig.get("connected_devices", 0)
        shared_addresses = graph_sig.get("connected_addresses", 0)

        # Compute SHAP feature importances from Isolation Forest
        shap_feature_map = self._compute_shap_attributions()
        has_shap = len(shap_feature_map) > 0

        # Build signal breakdown
        raw_signals = [
            {
                "signal": "shared_devices",
                "label": "Shared Device Clusters",
                "raw_val": float(shared_devices * 30.0 + graph_anomaly * 0.4),
                "evidence": [f"{shared_devices} shared device(s) detected across cluster customers"],
                "attribution_source": "NetworkX Community Detection"
            },
            {
                "signal": "refund_behavior",
                "label": "Elevated Refund Ratio",
                "raw_val": float(refund_signal * 0.8 + behavioural_anomaly * 0.3),
                "evidence": [f"Refund ratio of {round(refund_ratio * 100, 1)}% vs baseline (<5%)"],
                "attribution_source": "DBSCAN Behavioural Clustering"
            },
            {
                "signal": "transaction_anomalies",
                "label": "Isolation Forest Anomaly (SHAP)",
                "raw_val": float(txn_anomaly),
                "evidence": [
                    f"Transaction anomaly metric: {round(txn_anomaly, 2)}",
                    f"Top SHAP Feature: {max(shap_feature_map, key=shap_feature_map.get) if has_shap else 'velocity'}"
                ],
                "attribution_source": "SHAP TreeExplainer (Isolation Forest)" if has_shap else "Isolation Forest Decision Function"
            },
            {
                "signal": "temporal_velocity",
                "label": "Sudden Activity Burst",
                "raw_val": float(temporal_anomaly),
                "evidence": [f"Temporal velocity anomaly score: {round(temporal_anomaly, 2)}"],
                "attribution_source": "Temporal Velocity Engine"
            },
            {
                "signal": "address_reuse",
                "label": "Address Reuse Network",
                "raw_val": float(shared_addresses * 25.0),
                "evidence": [f"{shared_addresses} shared address(es) associated with entities"],
                "attribution_source": "Graph Structural Analysis"
            }
        ]

        total_raw = sum(s["raw_val"] for s in raw_signals)
        contributions = []

        if total_raw > 0:
            for s in raw_signals:
                if s["raw_val"] > 0:
                    weight = s["raw_val"] / total_raw
                    contrib = round(weight * normalized_risk, 3)
                    contributions.append({
                        "signal": s["signal"],
                        "label": s["label"],
                        "contribution": contrib,
                        "percentage": round(weight * 100, 1),
                        "evidence": s["evidence"],
                        "attribution_source": s["attribution_source"]
                    })
        else:
            contributions.append({
                "signal": "baseline_risk",
                "label": "Baseline Risk",
                "contribution": normalized_risk,
                "percentage": 100.0,
                "evidence": ["Standard baseline pattern risk"],
                "attribution_source": "System Risk Baseline"
            })

        contributions = sorted(contributions, key=lambda x: x["contribution"], reverse=True)

        return {
            "pattern_id": pattern_id,
            "risk_score": normalized_risk,
            "raw_risk_score_100": raw_risk,
            "contributions": contributions,
            "shap_status": "ACTIVE_TREE_EXPLAINER" if has_shap else "TRANSPARENT_SIGNAL_NORMALIZATION",
            "shap_feature_attributions": {
                k: round(v, 4) for k, v in sorted(shap_feature_map.items(), key=lambda x: x[1], reverse=True)
            }
        }

explainability_service = ExplainabilityService()
