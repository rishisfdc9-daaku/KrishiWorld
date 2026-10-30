#!/usr/bin/env python3
"""KrishiWorld — server-side crop-photo inference.
Author: Rishi Gullapalli (rishisfdc9-daaku)

Usage:
    pip install -r requirements.txt
    python infer.py path/to/crop-photo.jpg --crop paddy
    python infer.py path/to/crop-photo.jpg --crop tomato --model mobilenet --topk 5

Output is one JSON object on stdout, in the same shape as the browser
demo (problem, confidence, severity, why, escalate, source, model,
predictions), so a Salesforce callout or a test can read it directly.

What this is and is not:
- It IS a real, runnable image-classification run: a pre-trained
  ResNet18 or MobileNetV3 model (torchvision weights) scores the photo
  locally. No image is uploaded to any vendor, no API key is needed.
- It is NOT a crop-disease model. Those weights come from ImageNet.
  The mapping in analysis.py is provisional (see its honest-limit note),
  and low-confidence / non-plant results escalate to an agronomist.
- The fine-tuned disease model is a separate step, documented in
  TRAINING.md, and it needs a real labelled dataset I do not bundle here.

Errors: I fail loudly, with a non-zero exit code and a plain message.
A farming tool must never print a confident-looking JSON result when
the image could not even be opened.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from analysis import map_predictions

# torchvision ships ImageNet class names only via its weights metadata.
# I load them from the weights object itself, so I never hard-code a
# 1000-label list that could drift from the model actually in use.


def load_model(name: str):
    try:
        import torch
        from torchvision import models
    except ImportError as exc:  # pragma: no cover - environment error
        raise SystemExit(
            "torch / torchvision are not installed. Run: pip install -r requirements.txt"
        ) from exc

    name = name.lower()
    if name == "resnet":
        weights = models.ResNet18_Weights.IMAGENET1K_V1
        model = models.resnet18(weights=weights)
    elif name == "mobilenet":
        weights = models.MobileNet_V3_Large_Weights.IMAGENET1K_V2
        model = models.mobilenet_v3_large(weights=weights)
    else:
        raise SystemExit(f"Unknown model '{name}'. Use --model resnet or mobilenet.")
    model.eval()
    return model, weights


def predict(image_path: Path, model_name: str, topk: int) -> list[dict]:
    import torch
    from torchvision import transforms

    model, weights = load_model(model_name)
    preprocess = weights.transforms()
    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover
        raise SystemExit("Pillow is not installed. Run: pip install -r requirements.txt") from exc

    if not image_path.is_file():
        raise SystemExit(f"Image not found: {image_path}")
    try:
        image = Image.open(image_path).convert("RGB")
    except Exception as exc:
        raise SystemExit(f"Could not open image {image_path}: {exc}") from exc

    # I keep the transform exactly as the weights expect. Cropping or
    # resizing differently would silently change what the model sees.
    tensor = preprocess(image).unsqueeze(0)
    with torch.no_grad():
        logits = model(tensor)
    probabilities = torch.nn.functional.softmax(logits[0], dim=0)
    top_probs, top_idx = torch.topk(probabilities, k=min(topk, len(probabilities)))
    categories = weights.meta["categories"]
    return [
        {"label": categories[int(i)], "confidence": int(round(float(p) * 100))}
        for p, i in zip(top_probs, top_idx)
    ]


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="KrishiWorld crop-photo inference")
    parser.add_argument("image", type=Path, help="Path to a crop photo (jpg/png/webp)")
    parser.add_argument("--crop", default="paddy", choices=["paddy", "cotton", "tomato", "maize"],
                        help="Crop the farmer selected")
    parser.add_argument("--model", default="resnet", choices=["resnet", "mobilenet"],
                        help="Pre-trained backbone (ImageNet weights, not a disease model)")
    parser.add_argument("--topk", type=int, default=3, help="Predictions to return (1-10)")
    args = parser.parse_args(argv)

    if not 1 <= args.topk <= 10:
        parser.error("--topk must be between 1 and 10")

    predictions = predict(args.image, args.model, args.topk)
    result = map_predictions(predictions, args.crop)
    result["model"] = (
        f"{args.model} (torchvision ImageNet weights) — general classifier, "
        "not a crop-disease model"
    )
    result["predictions"] = predictions
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
