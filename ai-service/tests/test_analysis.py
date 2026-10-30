"""Tests for KrishiWorld AI mapping rules — no model download, offline.
Author: Rishi Gullapalli (rishisfdc9-daaku)
Run: pytest tests/ -v  (from ai-service/)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from analysis import map_predictions


def test_plant_photo_confident_does_not_escalate():
    result = map_predictions(
        [{"label": "corn", "confidence": 85}, {"label": "broccoli", "confidence": 10}],
        "paddy",
    )
    assert result["escalate"] is False
    assert result["severity"] == "Medium"
    assert result["confidence"] == 85


def test_non_plant_photo_escalates():
    result = map_predictions([{"label": "sports car", "confidence": 92}], "tomato")
    assert result["escalate"] is True
    assert result["severity"] == "High"
    assert "retake" in result["why"].lower()


def test_low_confidence_escalates_even_for_plants():
    result = map_predictions([{"label": "leaf", "confidence": 55}], "cotton")
    assert result["escalate"] is True
    assert result["confidence"] == 55


def test_empty_predictions_escalate_with_zero_confidence():
    result = map_predictions([], "maize")
    assert result["escalate"] is True
    assert result["confidence"] == 0


def test_threshold_boundary_70_does_not_escalate():
    result = map_predictions([{"label": "cabbage", "confidence": 70}], "maize")
    assert result["escalate"] is False


def test_unknown_crop_falls_back_to_paddy_guidance_without_crashing():
    result = map_predictions([{"label": "lettuce", "confidence": 90}], "unknown-crop")
    assert result["escalate"] is False
    assert "paddy" in result["problem"] or "check first" in result["problem"]
