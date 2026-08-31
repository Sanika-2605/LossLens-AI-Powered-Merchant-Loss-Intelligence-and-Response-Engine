import pytest
from app.services.discovery_service import discovery_service

def test_run_pipeline():
    """Test that the full ML pipeline executes successfully and returns patterns."""
    result = discovery_service.run_pipeline()
    
    assert result["status"] == "success"
    assert "total_patterns_discovered" in result
    assert result["total_patterns_discovered"] >= 0

def test_get_patterns():
    """Test that retrieving patterns returns valid pattern records with expected metrics."""
    patterns = discovery_service.get_patterns()
    
    assert isinstance(patterns, list)
    if len(patterns) > 0:
        p = patterns[0]
        # Check standard properties
        assert "id" in p
        assert "cluster_number" in p
        assert "customers_count" in p
        assert "devices_count" in p
        assert "addresses_count" in p
        assert "refunds_count" in p
        assert "current_exposure" in p
        assert "potential_exposure" in p
        assert "risk_score" in p
        assert "expected_loss" in p
        assert "loss_velocity" in p
        assert "customer_ids" in p
        
        # Check risk engine sub-scores
        metrics = p["metrics"]
        assert "transaction_anomaly" in metrics
        assert "graph_anomaly" in metrics
        assert "temporal_anomaly" in metrics
        assert "behavioural_anomaly" in metrics
        
        # Check value constraints
        assert 0 <= p["risk_score"] <= 100
        assert p["expected_loss"] >= 0
        assert p["customers_count"] >= 2  # Connected sharing communities of size >= 2

def test_get_pattern_details():
    """Test that fetching details for a pattern returns members and payment list."""
    patterns = discovery_service.get_patterns()
    if len(patterns) > 0:
        p_id = patterns[0]["id"]
        details = discovery_service.get_pattern_details(p_id)
        
        assert "pattern" in details
        assert "customers" in details
        assert "payments" in details
        assert "refunds" in details
        
        assert len(details["customers"]) == patterns[0]["customers_count"]
        assert isinstance(details["payments"], list)
        assert isinstance(details["refunds"], list)
