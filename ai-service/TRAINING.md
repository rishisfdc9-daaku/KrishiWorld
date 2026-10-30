# Fine-tuning a real crop-disease model — Rishi Gullapalli

This is the honest gap in KrishiWorld today, and I would rather write
it down than hide it: neither the browser MobileNet model nor
`infer.py` is a disease classifier. This note is how I would close that
gap, step by step, without inventing a dataset or results I do not have.

## 1. Get a real, labelled dataset (not bundled here)

- Use a dataset you have the right to use, with photos labelled by
  crop + disease/problem, ideally with region, crop stage, and photo
  conditions recorded. I do not bundle one, and I do not claim any
  particular dataset's size or accuracy here — check its licence and
  its own documentation before use.
- Split by field/farm, not just by random photo, or the same plant
  photographed twice will leak into both train and test and flatter
  your accuracy. That is the mistake I most want to avoid.
- Keep a held-out test set that agronomists have reviewed, and never
  tune thresholds on it.

Expected folder layout for `train.py`:

```text
data/
  train/paddy_bacterial_blight/*.jpg
  train/paddy_healthy/*.jpg
  train/tomato_early_blight/*.jpg
  val/...
  test/...
```

Class names are the folder names — nothing is hard-coded in `train.py`
beyond reading them from disk.

## 2. Fine-tune (train.py)

```bash
pip install -r requirements.txt
python train.py --data data --epochs 10 --out models/krishiworld-disease-v1.pt
```

- Start from the same ResNet18/MobileNet backbone, replace only the
  final classifier layer, freeze the backbone for a few epochs, then
  unfreeze with a low learning rate. That is standard transfer learning
  and it is also the least wasteful way to start with a modest dataset.
- Augment for field conditions: random crops, brightness, and rotation
  — but not flips that change a symptom's meaning, and never synthetic
  disease spots pasted onto healthy leaves.

## 3. Validate before any farmer sees a disease name

- Report accuracy per crop and per class, not just overall accuracy.
  A model that is 95% right on healthy leaves and 40% right on a rare
  disease is not a 95% model for farmers.
- Calibrate confidence: check that "90% confident" really is right
  about 90% of the time on the held-out set. If it is not, fix the
  threshold before shipping — the 70% escalation rule in KrishiWorld
  only protects farmers if the confidence number means something.
- Agronomist review: every class in the model should be reviewed by
  agronomists for its resolution steps, dosage, and safety notes
  before it is used for advice. Demo dosages must be removed first.

## 4. Ship it the boring way

- Export the fine-tuned weights, point `infer.py --weights` at them
  (see train.py output), and keep the same JSON shape so Salesforce
  and the demo do not need to change.
- Monitor in production: log confidence distributions and escalation
  rates per crop, and re-validate when a new region or crop is added.
  A model that worked in one state is not automatically safe in another.
