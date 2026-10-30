# KrishiWorld — AI-Powered Farming on Salesforce

Author: Rishi Gullapalli — rishisfdc9-daaku

I built this because I kept thinking about one simple thing: the person who
grows our food should not have to guess. A photo, a location, and the last
few weeks of weather should be enough to get a clear answer.

> **Local prototype only. Nothing here is deployed, and nothing here is on GitHub yet.**
> I have not created a GitHub account for this yet, nothing was pushed
> anywhere, and no credentials or secrets are used. This folder is my working
> demo plus the Salesforce design I plan to build from.

KrishiWorld puts the world in a farmer's hand, through a Salesforce app on
their phone. A farmer photographs a crop problem, and the app combines that
photo with location, the last 3 weeks of weather, and local soil conditions
to give a clear, step-by-step resolution — plus genuine input dealers,
weather alerts, and smart-motor irrigation.

This prototype is based on
[`../linkedin/krishiworld-farmer-salesforce-project.md`](../linkedin/krishiworld-farmer-salesforce-project.md).

## What is mocked vs real

| Area | In this prototype |
| --- | --- |
| Crop photo analysis | **Real AI, with a clearly stated limit.** `demo/ai-analysis.js` runs MobileNet (TensorFlow.js, ImageNet) in the browser, on-device, and returns real top predictions with confidence. The photo never leaves the browser. Limit: MobileNet is a general classifier, NOT a trained crop-disease model — its result is a provisional plant-relevance signal mapped to crop guidance, and anything below 70% confidence or not clearly a plant escalates to an agronomist. The old per-crop mock is kept ONLY as a clearly labelled fallback when the model cannot load offline. `ai-service/infer.py` does the same analysis server-side with ResNet/MobileNet. A real disease model requires fine-tuning — see `ai-service/TRAINING.md`. |
| Location | **Browser geolocation if the farmer allows it, otherwise a mock demo farm.** The demo never requires a real farm location. |
| Weather — past 3 weeks + forecast | **Mocked data** in `demo/mock-data.js`. No weather API is called. The analysis logic (summaries, disease-risk heuristic, one-action alerts) is real, tested code in `core/weather.js` — it just runs on demo data for now. |
| Soil / geology | **Mocked data** in `demo/mock-data.js`. Soil scoring logic is real, tested code in `core/soil.js`. |
| Genuine dealer list, prices, stock | **Mocked, clearly labelled verified demo dealers.** No real shop data, ordering, or payment. Verification/ranking rules are real, tested code in `core/dealers.js`. |
| Weather alerts | **Mocked alerts** derived from the mock forecast in the demo; alert-generation logic is real code in `core/weather.js`. |
| Smart motor on/off | **Mocked in the demo page.** The button changes demo state only. Safety rules (electricity window, dry-run, fail-safe OFF, water estimate cap) are real, tested code in `core/motor.js`. No real motor, IoT device, or electricity supply is controlled. |
| Crop calendar, yield, pest warnings, mandi, schemes | **Logic is real, tested code** in `core/calendar.js`, `core/pest.js`, `core/mandi.js`, `core/schemes.js`. The data feeding it in the demo is still illustrative — mandi prices are not live, scheme rules are generic examples to be replaced with current official rules, and pest counts are not real village reports. |
| Offline queue, privacy | **Real, tested logic** in `core/offline-queue.js` and `core/privacy.js` (in-memory queue, timestamp conflict rule, village-precision anonymisation, consent defaults to no). Not yet wired to a real mobile local store. |
| Salesforce code | **Scaffolding only** in `salesforce/`. Apex classes and an LWC component outline the real design, but they are not deployed to any Salesforce org. `AiAnalysisService.cls` shows how an external AI endpoint would be called, with a configurable endpoint and no hard-coded key or URL. |
| Farmer data | **Local only.** The demo stores nothing on a server. Closing the page discards the demo state. |

## How the AI analysis works

```text
Farmer uploads a crop photo
  → demo/ai-analysis.js loads MobileNet in the browser (needs internet once, for the CDN)
  → model classifies the photo ON-DEVICE — the photo is never uploaded
  → top predictions + confidence scores are shown in the UI
  → plant/leaf predictions are mapped to provisional crop guidance
  → confidence < 70% OR not clearly a plant OR severity High
      → escalated to an agronomist (same rule as core/escalation.js and Apex)
  → if the model cannot load (offline / CDN blocked)
      → clearly labelled MOCK fallback, never presented as AI
```

Server-side, the same shape:

```text
python ai-service/infer.py photo.jpg --crop paddy
  → ResNet18 / MobileNetV3 (torchvision ImageNet weights, local)
  → ai-service/analysis.py mapping + 70% rule
  → JSON: problem, confidence, severity, why, escalate, predictions
```

To get a genuine disease classifier, fine-tune on labelled crop photos
(see `ai-service/TRAINING.md` and `ai-service/train.py`) and validate
per crop/region with agronomists before letting it name a disease.

Safety note, carried over from the spec: a real version must always show a
confidence level, never hide uncertainty, and route severe or low-confidence
cases to a human agronomist. Dosages in the demo are illustrative only and
must be validated by an agronomist before any real use.

## How to open the demo

No build step, no install, no server needed for the page itself — but
the on-device AI model loads from a CDN, so you need internet once for
a real AI result. Offline, you still get the full flow with a labelled
mock fallback.

1. Open `demo/index.html` in any modern browser
   (double-click it, or drag it into a browser window).
2. Try the full flow in order:
   1. Pick a crop, then upload a crop photo (it is only previewed and
      analysed locally — nothing is uploaded).
   2. Click **Diagnose crop problem** — the on-device AI result appears
      with its source ("ON-DEVICE AI analysis") and top predictions, or
      a clearly labelled mock if the model could not load.
   3. Click **Use my location** (optional) or keep the demo farm location.
   4. Read the past-3-weeks weather summary and the resolution steps.
   5. Check the nearby genuine dealers and try **Verify QR** on a product.
   6. Read the weather alerts.
   7. Set electricity timings, move the soil-moisture slider, and try **Switch motor ON / OFF** (mock).

That is the whole demo. If a step looks empty, scroll down — each section
appears in page order, and the diagnosis section drives which resolution
and dealers are highlighted.

### Test the AI analysis specifically

- **Online, real model:** open the demo, upload a clear photo of a leaf
  or plant, click Diagnose. You should see "Result source: ON-DEVICE
  AI analysis" with 3 model predictions and confidence scores.
- **Offline / fallback:** disconnect or block the CDN scripts, reload,
  upload a photo, click Diagnose. You should see "MOCK diagnosis
  (fallback — model unavailable)" — and never an AI label on a mock.
- **Non-plant photo:** upload a photo of a car or a room. The AI path
  should escalate ("does not clearly show a crop") rather than force a
  crop diagnosis onto it.
- **Server AI:** `cd ai-service && pip install -r requirements.txt &&
  python infer.py <photo.jpg> --crop paddy` — see `ai-service/README.md`.
- **Core logic tests:** from `krishiworld/`, run
  `node --test core/tests/*.test.js` — 27 tests covering escalation,
  motor safety, dealer ranking, weather, soil, pest, mandi, privacy,
  offline queue, calendar, and schemes. Python mapping tests:
  `cd ai-service && pytest tests/ -v`.

## File list

```text
krishiworld/
├── README.md                    # This file
├── ARCHITECTURE.md              # System diagram (markdown) + data flow
├── TODO.md                      # What is needed to become a real Salesforce org
├── demo/
│   ├── index.html               # Demo page (no build step; TF.js + MobileNet via CDN)
│   ├── styles.css               # Demo styling
│   ├── mock-data.js             # ALL mocked weather, soil, dealer, alert data
│   ├── ai-analysis.js           # NEW: on-device MobileNet analysis + mapping + fallback
│   └── app.js                   # Demo logic: photo preview, AI diagnosis, motor
├── core/                        # NEW: tested logic layer (Node, no DOM)
│   ├── index.js                 # Public entry point
│   ├── errors.js / validation.js / logger.js
│   ├── weather.js               # 3-week summaries, disease-risk heuristic, alerts
│   ├── soil.js                  # Soil Health Card scoring (not a prescription)
│   ├── dealers.js               # Verification (licence + 1-year expiry + complaints), ranking, QR format
│   ├── motor.js                 # Electricity window, dry-run, fail-safe OFF, water estimate
│   ├── calendar.js              # Crop stages, yield range (not a promise)
│   ├── pest.js                  # Village-level, anonymised outbreak warnings
│   ├── mandi.js                 # Price trends, stale-price labelling
│   ├── schemes.js               # Scheme matching (verify on official portal), claim checklist
│   ├── escalation.js            # The 70% / High-severity rule, in one place
│   ├── offline-queue.js         # Offline queue, backoff, timestamp conflict rule
│   ├── privacy.js               # Village-precision location, personal-field stripping, consent
│   └── tests/                   # 27 Node tests (escalation, motor, dealers, weather, ...)
├── ai-service/                  # NEW: server-side AI (Python, local, no API keys)
│   ├── infer.py                 # ResNet/MobileNet inference → KrishiWorld JSON
│   ├── analysis.py              # Mapping + 70% rule (testable without a model)
│   ├── train.py                 # Fine-tuning skeleton (needs a real labelled dataset)
│   ├── TRAINING.md              # How to fine-tune and validate a disease model
│   ├── requirements.txt
│   └── tests/test_analysis.py   # 6 Python tests for the mapping rules
└── salesforce/
    ├── data-model.md            # Objects, fields, and relationships
    ├── flows/
    │   └── agentforce-diagnosis-flow.md  # Agentforce / Flow design notes
    ├── classes/
    │   ├── CropIssueService.cls         # Crop_Issue__c case handling + escalation rule
    │   ├── DiagnosisService.cls         # Image-diagnosis orchestration
    │   ├── AiAnalysisService.cls        # NEW: external AI endpoint callout (configurable, no key)
    │   ├── WeatherService.cls           # Weather API integration (stub)
    │   ├── DealerLocatorService.cls     # Genuine dealer lookup
    │   └── MotorControlService.cls      # Smart-motor / IoT control
    └── lwc/cropIssueApp/
        ├── cropIssueApp.html
        ├── cropIssueApp.js
        └── cropIssueApp.js-meta.xml
```

### What I would improve next

I wrote this down so a reviewer can see I know where the gaps are, not
just where the code is: (1) replace MobileNet with a fine-tuned disease
model validated per crop/region; (2) wire `core/` into the demo page so
the demo's weather/dealer/motor sections use the tested logic instead
of inline demo code; (3) replace demo data with real weather, dealer
registry, and mandi feeds; (4) build the real mobile offline store on
top of `core/offline-queue.js`; (5) get every dosage and scheme rule
validated by agronomists and the official portals before any farmer
relies on them.

## UI images — for the LinkedIn project attachment section later

These are mobile screen mockups I made for the project, so the idea is
easy to see at a glance. They are design mockups, not screenshots of a
live app, and the dealer names, prices, and weather in them are illustrative.
I have NOT uploaded them to LinkedIn — that step is separate, after the
demo is ready.

1. Home / farm dashboard
   ![KrishiWorld home dashboard](sandbox://workspace/krishiworld/ui-images/media-generation-krishiworld-ui-01-home-dashboa-0-6fc434f3-1245-4bc7-8d81-43455f29333c.webp)
2. Crop photo diagnosis result
   ![KrishiWorld diagnosis result](sandbox://workspace/krishiworld/ui-images/media-generation-krishiworld-ui-02-diagnosis-re-0-46d881ec-8ba7-4b07-9f6a-1fdd0b4952da.webp)
3. Genuine dealer list
   ![KrishiWorld genuine dealer list](sandbox://workspace/krishiworld/ui-images/media-generation-krishiworld-ui-03-dealer-list-0-8ba1c48a-e8b7-4301-80db-bc3f740cbbb7.webp)
4. Weather alert
   ![KrishiWorld weather alert](sandbox://workspace/krishiworld/ui-images/media-generation-krishiworld-ui-04-weather-aler-0-14790057-e030-4a93-a647-1d5d35e8150b.webp)
5. Smart motor control with electricity timings
   ![KrishiWorld smart motor control](sandbox://workspace/krishiworld/ui-images/media-generation-krishiworld-ui-05-motor-contro-0-95f9a75f-185a-4238-bd49-bd8a96a234ca.webp)

Files are also in `ui-images/` in this folder, with their original filenames.

## Design principles

- **Simple language first.** Every resolution step is written so a farmer can
  act on it without jargon.
- **Farmer owns the data.** Location and farm data are used only for farming
  help, and the demo keeps everything local.
- **Human in the loop.** Low confidence or high severity always escalates to
  an agronomist instead of guessing.
- **Offline-first in the real product.** The web demo needs a browser, but
  the Salesforce design in `ARCHITECTURE.md` queues cases locally and syncs
  when the farmer is back in range.
- **No paid promotion.** Dealers are ranked by verification, distance, and
  stock in the demo — never by who paid for placement.
