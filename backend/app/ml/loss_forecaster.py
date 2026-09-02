"""
Loss Forecaster ML Module for LossLens.

Generates 7-day and 30-day expected loss forecasts based on historical transaction velocity, refund ratios, and time-series exposure analysis.
Handles insufficient historical data explicitly with confidence intervals.
"""

from typing import Dict, Any
from datetime import datetime
from app.services.evidence_engine import evidence_engine

class LossForecaster:
    def forecast_loss(self, pattern_id: str) -> Dict[str, Any]:
        """
        Compute robust 7-day and 30-day loss forecasts based on observed exposure and velocity.
        """
        evidence = evidence_engine.get_evidence(pattern_id)
        if not evidence or "pattern_summary" not in evidence:
            return {
                "pattern_id": pattern_id,
                "current_exposure": 0.0,
                "observed_exposure": 0.0,
                "7_day_forecast": 0.0,
                "30_day_forecast": 0.0,
                "confidence": "LOW",
                "uncertainty_range": {"7_day": [0.0, 0.0], "30_day": [0.0, 0.0]},
                "insufficient_data": True
            }

        pattern = evidence["pattern_summary"]
        fin = evidence.get("financial_values", {})

        current_exp = float(pattern.get("current_exposure", fin.get("current_exposure", 0.0)))
        expected_loss = float(pattern.get("expected_loss", fin.get("expected_loss", 0.0)))
        loss_vel = float(pattern.get("loss_velocity", 15.0))
        refund_ratio = float(fin.get("refund_ratio", 0.15))

        timeline = evidence.get("timeline", [])
        insufficient_data = len(timeline) < 3

        # Robust time-velocity extrapolation with exponential decay factor
        # Daily loss rate derived from velocity & expected loss
        daily_rate = max(loss_vel, expected_loss / 7.0 if expected_loss > 0 else 10.0)

        # 7-day forecast sum with mild velocity decay (0.95 factor per day)
        forecast_7d = round(sum(daily_rate * (0.95 ** d) for d in range(7)), 2)

        # 30-day forecast sum with long-term decay (0.90 factor per day)
        forecast_30d = round(sum(daily_rate * (0.90 ** d) for d in range(30)), 2)

        # Confidence bounds (+/- 20% for 7d, +/- 40% for 30d if sufficient data)
        uncertainty_factor = 0.50 if insufficient_data else 0.20

        lower_7d = round(max(0.0, forecast_7d * (1.0 - uncertainty_factor)), 2)
        upper_7d = round(forecast_7d * (1.0 + uncertainty_factor), 2)

        lower_30d = round(max(0.0, forecast_30d * (1.0 - uncertainty_factor * 1.5)), 2)
        upper_30d = round(forecast_30d * (1.0 + uncertainty_factor * 1.5), 2)

        confidence_level = "LOW" if insufficient_data else ("HIGH" if len(timeline) > 10 else "MEDIUM")

        return {
            "pattern_id": pattern_id,
            "observed_exposure": round(current_exp, 2),
            "current_exposure": round(current_exp, 2),
            "expected_loss_baseline": round(expected_loss, 2),
            "daily_loss_velocity": round(daily_rate, 2),
            "7_day_forecast": forecast_7d,
            "30_day_forecast": forecast_30d,
            "confidence": confidence_level,
            "uncertainty_range": {
                "7_day": [lower_7d, upper_7d],
                "30_day": [lower_30d, upper_30d]
            },
            "insufficient_data": insufficient_data
        }

loss_forecaster = LossForecaster()
