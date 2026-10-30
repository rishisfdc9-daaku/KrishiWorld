# KrishiWorld architecture

Author: Rishi Gullapalli — rishisfdc9-daaku

I drew this the way I actually want the system to work, not the way a demo
usually looks. One case per crop problem, so nothing gets lost between the
farmer, the agronomist, and the dealer. Prototype only — see `README.md`
for what is mocked. This is the target design for a real Salesforce org,
not something deployed today.

## System diagram

```text
Farmer's phone (Experience Cloud app / LWC)
  │  1. Photo of crop problem
  │  2. Location (with permission)
  │  3. Electricity timings + soil-moisture reading
  ▼
Salesforce Platform
  ├── Service Cloud — Crop_Issue__c
  │     Every crop problem is one case: photo, crop, stage,
  │     location, diagnosis, resolution, follow-up date.
  │     Severe / low-confidence cases → agronomist queue.
  │
  ├── Agentforce — Diagnosis Agent, Irrigation Agent, Alert Agent
  │     Diagnosis: combines image result + weather (3 weeks)
  │     + soil/geology + crop stage → resolution steps.
  │     Irrigation: water need from soil moisture + forecast
  │     + crop stage → motor schedule inside electricity window.
  │     Alerts: forecast change → push / SMS / voice alert
  │     with ONE clear action.
  │
  ├── Data Cloud — one farmer profile
  │     Weather, soil, IoT, dealer stock, mandi prices,
  │     farm history, and past cases, unified by farm.
  │
  ├── Einstein / image model (real version only)
  │     Disease / pest / deficiency classification with
  │     confidence + severity. Never used alone for severe cases.
  │
  ├── Integrations (MuleSoft / REST callouts)
  │     Weather API ──► past 3 weeks + forecast
  │     Soil / geology data ──► soil type, health card
  │     Dealer / Commerce ──► verified dealers, price, stock
  │     IoT Cloud ──► smart motor, soil sensors, weather station
  │     Mandi prices, schemes, insurance ──► later phases
  │
  └── Flow + Notifications
        Follow-up checks, alert delivery, motor reminders,
        and agronomist handover — all automated, all logged
        against the Crop_Issue__c record.

External (real version only)
  Weather provider · Soil data provider · Verified dealers
  Smart motors / sensors · Agronomists (Field Service)
```

## Data flow for one crop problem

```text
Photo + crop + stage
  → Crop_Issue__c created (Status = New)
  → AI analysis, in one of three places, same JSON shape, same rule:
      (a) Browser: demo/ai-analysis.js — MobileNet on-device, photo never uploaded
      (b) Server: ai-service/infer.py — ResNet/MobileNet locally, analysis.py mapping
      (c) Salesforce: AiAnalysisService.cls — configurable external endpoint,
          no hard-coded URL or key; unconfigured / failed / malformed = null
  → DiagnosisService: image result + confidence
  → WeatherService: last 3 weeks + forecast for that location
      (logic: core/weather.js — summaries, disease-risk heuristic, one-action alerts)
  → Soil lookup: soil type + health-card values for that farm
      (logic: core/soil.js — scoring, never a prescription on its own)
  → Agentforce diagnosis: resolution, dosage, safety, check-again date
  → If confidence < 70% OR severity = High: Status = Escalated to Agronomist
    else: Status = Resolution Given
    (rule in one place: core/escalation.js, mirrored in Apex CropIssueService)
  → If input needed: DealerLocatorService → verified dealers nearby
      (logic: core/dealers.js — licence + 1-year expiry + no complaints, verified first)
  → If water needed: MotorControlService → schedule inside electricity window
      (logic: core/motor.js — window, dry-run, water level, fail-safe OFF)
  → Pest warnings: village-level anonymised counts only (core/pest.js)
  → Mandi prices: dated, stale after 7 days (core/mandi.js)
  → Schemes: match stated rules, always "verify on official portal" (core/schemes.js)
  → Crop calendar / yield range: stages + range, not a promise (core/calendar.js)
  → Offline: queue with backoff, timestamp conflict rule (core/offline-queue.js)
  → Privacy: village-precision location, consent defaults to no (core/privacy.js)
  → Alerts run daily against the forecast for open cases
  → Farmer confirms outcome → case closed, outcome feeds future diagnoses
```

## AI analysis flow (new)

```text
Photo (browser or file)
  → Model: MobileNet (browser, TF.js) or ResNet/MobileNet (server, torchvision)
      — both are general ImageNet classifiers, NOT crop-disease models
  → Top predictions + confidence scores (shown to the farmer, not hidden)
  → Mapping: plant/leaf labels → provisional crop guidance for the picked crop
      Non-plant photo → retake + escalate
      Confidence < 70% → escalate (do not guess)
      Confident plant photo → Medium severity at most, "check first" guidance
  → Resolution steps + dealer / motor steps, as before
  → Fallback: if the model cannot load (offline/CDN), the demo shows a
      clearly labelled MOCK diagnosis — never an AI label on a mock result
  → Real disease model: fine-tune via ai-service/train.py on a real
      labelled dataset, validate per crop/region with agronomists, then
      swap the weights in — the JSON shape and the 70% rule do not change
```

## Core logic layer (new)

`core/` is the tested, DOM-free logic layer (Node): validation, errors,
logger, weather, soil, dealers, motor, calendar, pest, mandi, schemes,
escalation, offline queue, privacy — 27 tests in `core/tests/`.
It is not yet wired into the demo page (the demo still uses its own
inline mock code for weather/dealers/motor), and that wiring is the
next step I would take, so the demo and the tests can never drift apart
again. The Salesforce classes mirror the same rules, especially the
70% escalation rule, rather than re-inventing them.

## Offline-first (real version)

1. The mobile app saves the photo + case locally when there is no signal.
2. A sync queue retries when connectivity returns.
3. The server never overwrites a farmer's local note without a timestamp check.
4. Weather alerts are cached for the farmer's village, so a missed sync does
   not mean a missed storm warning on the next open.

## Privacy and safety

- Location is collected only with permission, only for farming help, and
  never sold or used for advertising.
- Village-level pest warnings are anonymised — no individual farm is named.
- Dosage, waiting periods, and protective steps must be validated by an
  agronomist before the real product ships. Demo dosages are illustrative.
- Motor control always requires explicit farmer permission per schedule,
  and must fail safe (off) if a sensor reports dry running or no water.
```

