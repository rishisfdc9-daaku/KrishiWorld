"""KrishiWorld — server-side AI analysis helpers.
Author: Rishi Gullapalli (rishisfdc9-daaku)

Why this file exists separately from infer.py: I want the mapping rules
testable without loading a neural network. A reviewer can read this file
and argue with my thresholds without running a GPU.

Honest limit, repeated here on purpose: the pre-trained model in infer.py
is a general ImageNet classifier (ResNet / MobileNet). It is NOT a crop
disease model. Its labels are mapped provisionally, exactly like the
browser version, and anything below 70% confidence — or anything that
does not look like plant material — is escalated, not answered. The
path to a real disease model is TRAINING.md: fine-tune on labelled crop
photos, validate per crop and region, and only then let the model name
a disease. I will not rename a general label into a disease name to
make a demo look finished.
"""
from __future__ import annotations

MIN_CONFIDENCE = 70

PLANT_KEYWORDS = (
    "leaf", "plant", "tree", "flower", "corn", "maize", "broccoli",
    "cauliflower", "cabbage", "cucumber", "zucchini", "mushroom",
    "potato", "tomato", "pepper", "bean", "pea", "lettuce", "spinach",
    "carrot", "onion", "garlic", "apple", "banana", "orange", "grape",
    "strawberry", "rice", "wheat", "cotton", "vine", "grass", "bush",
    "shrub", "seedling", "sprout", "foliage", "branch", "stem",
)

CROP_GUIDANCE = {
    "paddy": "Bacterial leaf blight pattern — yellowing leaf edges after wet weeks",
    "cotton": "Bollworm damage pattern — damaged bolls and shedding",
    "tomato": "Early blight pattern — dark leaf spots",
    "maize": "Nutrient stress pattern — pale lower leaves",
}


def is_plant_label(label: str) -> bool:
    lower = (label or "").lower()
    return any(word in lower for word in PLANT_KEYWORDS)


def map_predictions(predictions, crop: str) -> dict:
    """Map raw model predictions to a KrishiWorld result.

    predictions: list of {"label": str, "confidence": int 0-100}, best first.
    Returns a dict in the same shape as the browser demo, so Salesforce
    and the demo can consume either source without a translation layer.
    """
    if not predictions:
        return {
            "problem": "No clear image result — needs agronomist review",
            "confidence": 0,
            "severity": "High",
            "why": "The model returned no prediction. I will not guess from an empty result.",
            "escalate": True,
            "source": "server-ai",
        }

    top = predictions[0]
    confidence = int(top["confidence"])
    plant = [p for p in predictions if is_plant_label(p["label"])]
    plant_score = int(max(p["confidence"] for p in plant)) if plant else 0
    guidance = CROP_GUIDANCE.get(crop, CROP_GUIDANCE["paddy"])

    if plant_score == 0:
        return {
            "problem": "Photo does not clearly show a crop — needs a retake / agronomist review",
            "confidence": confidence,
            "severity": "High",
            "why": (
                f'Top prediction was "{top["label"]}" ({confidence}%), which is not '
                "plant material. Please retake a clear, close photo of the affected "
                "leaves, in daylight."
            ),
            "escalate": True,
            "source": "server-ai",
        }

    if confidence < MIN_CONFIDENCE or plant_score < MIN_CONFIDENCE:
        return {
            "problem": "Uncertain plant photo — needs agronomist review",
            "confidence": min(confidence, plant_score),
            "severity": "High",
            "why": (
                f"Plant material was seen ({plant_score}%) but confidence is below "
                f"{MIN_CONFIDENCE}%. Below that threshold I escalate instead of guessing."
            ),
            "escalate": True,
            "source": "server-ai",
        }

    return {
        "problem": f"Plant photo consistent with {crop} — check first: {guidance}",
        "confidence": plant_score,
        "severity": "Medium",
        "why": (
            f'Model saw "{top["label"]}" ({confidence}%) and plant material at '
            f"{plant_score}%. This is a general image model, not a trained "
            "crop-disease model — confirm with an agronomist before spraying."
        ),
        "escalate": False,
        "source": "server-ai",
    }
