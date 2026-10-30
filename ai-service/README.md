# KrishiWorld AI service — Rishi Gullapalli (rishisfdc9-daaku)

Server-side companion to the browser's on-device model. It runs a
pre-trained image classifier locally and returns a KrishiWorld-shaped
JSON result. No image leaves this machine, no API key is used.

## Run it

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python infer.py ../demo/sample-crop.jpg --crop paddy
python infer.py ../demo/sample-crop.jpg --crop tomato --model mobilenet --topk 5
```

Sample output (labels will vary with the photo):

```json
{
  "problem": "Plant photo consistent with paddy — check first: Bacterial leaf blight pattern — yellowing leaf edges after wet weeks",
  "confidence": 82,
  "severity": "Medium",
  "why": "Model saw \"corn\" (82%) and plant material at 82%. This is a general image model, not a trained crop-disease model — confirm with an agronomist before spraying.",
  "escalate": false,
  "source": "server-ai",
  "model": "resnet (torchvision ImageNet weights) — general classifier, not a crop-disease model",
  "predictions": [{"label": "corn", "confidence": 82}]
}
```

## What is real, what is not

- Real: image loading, preprocessing, model inference, softmax
  confidence, and the mapping/escalation rules in `analysis.py`.
- Not real yet: crop-disease classification. ResNet/MobileNet here
  carry ImageNet weights. For a disease model, see TRAINING.md.
- Still mocked elsewhere in KrishiWorld: weather, dealers, motor,
  mandi prices, schemes. This service only covers the photo step.

## Tests (no model download needed)

```bash
pytest tests/ -v
```

The tests cover `analysis.py` mapping rules only — plant vs non-plant,
the 70% threshold, empty predictions, and the escalate flag — so they
run offline and fast. Inference itself is tested by running `infer.py`
on a real photo, as above.

## Next step I would take

Fine-tune on a labelled crop-disease dataset (TRAINING.md), then
validate per crop and region with agronomists before letting the model
name a disease or set severity to High on its own.
