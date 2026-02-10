"""Tests for z-score computation logic in the PySpark pipeline."""

from __future__ import annotations

import math
from datetime import datetime, timedelta

import pytest


# ── Pure-Python reference implementations for testing ─────────────────────────
# We test the statistical logic without requiring a Spark cluster.

def compute_z_score(price: float, median: float, std: float) -> float:
    """Reference z-score formula matching pipeline.spark_scoring logic."""
    if std is None or std <= 0:
        return 0.0
    return (price - median) / std


def is_underpriced(z_score: float, threshold: float = -1.5) -> bool:
    return z_score < threshold


class TestZScoreComputation:
    """Validate z-score math matches the pipeline logic."""

    def test_z_score_below_median(self):
        # price=1500, median=2500, std=500 → z = (1500-2500)/500 = -2.0
        z = compute_z_score(1500, 2500, 500)
        assert z == pytest.approx(-2.0)

    def test_z_score_at_median(self):
        z = compute_z_score(2500, 2500, 500)
        assert z == pytest.approx(0.0)

    def test_z_score_above_median(self):
        z = compute_z_score(3500, 2500, 500)
        assert z == pytest.approx(2.0)

    def test_z_score_zero_std(self):
        """When std is 0 (all same price), z-score should be 0."""
        z = compute_z_score(2500, 2500, 0.0)
        assert z == 0.0

    def test_z_score_none_std(self):
        z = compute_z_score(2500, 2500, None)
        assert z == 0.0

    def test_z_score_small_deviation(self):
        z = compute_z_score(2400, 2500, 200)
        assert z == pytest.approx(-0.5)


class TestUnderpricedFlag:
    """Validate the underpriced threshold logic."""

    def test_strongly_underpriced(self):
        assert is_underpriced(-2.0) is True

    def test_moderately_underpriced(self):
        assert is_underpriced(-1.6) is True

    def test_at_threshold(self):
        # z = -1.5 is NOT < -1.5
        assert is_underpriced(-1.5) is False

    def test_near_median(self):
        assert is_underpriced(-0.5) is False

    def test_above_median(self):
        assert is_underpriced(1.0) is False

    def test_custom_threshold(self):
        assert is_underpriced(-1.0, threshold=-0.5) is True
        assert is_underpriced(-0.3, threshold=-0.5) is False


class TestGroupStatistics:
    """Test group-level statistics that feed into z-score."""

    def test_median_calculation(self):
        """Verify rolling median on a known dataset."""
        prices = [2000, 2200, 2100, 2400, 2300]
        median = sorted(prices)[len(prices) // 2]
        assert median == 2200

    def test_std_calculation(self):
        """Verify std dev on a known dataset."""
        import statistics
        prices = [2000, 2200, 2100, 2400, 2300]
        std = statistics.stdev(prices)
        # Expected: ~158.11
        assert 155 < std < 162

    def test_z_scores_for_group(self):
        """Compute z-scores for a full group and verify ranking."""
        import statistics
        prices = [2000, 2200, 2100, 2400, 2800, 1500]
        median = statistics.median(prices)
        std = statistics.stdev(prices)

        z_scores = [(p, compute_z_score(p, median, std)) for p in prices]
        z_scores.sort(key=lambda x: x[1])

        # Cheapest listing (1500) should have the most negative z-score
        assert z_scores[0][0] == 1500
        assert z_scores[0][1] < -1.0

        # Most expensive (2800) should have the highest z-score
        assert z_scores[-1][0] == 2800
        assert z_scores[-1][1] > 0
