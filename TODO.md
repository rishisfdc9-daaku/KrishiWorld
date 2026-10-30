# TODO — turning this prototype into a real Salesforce org

In rough order. Nothing below is done yet, and nothing below should be
treated as deployed.

## 1. Salesforce org setup
- [ ] Create a Salesforce Developer Edition / scratch org (sfdx project).
- [ ] Create the custom objects in `salesforce/data-model.md` with real
      field types, page layouts, and sharing rules (farmer sees only own farm).
- [ ] Enable Experience Cloud site for the farmer mobile app.
- [ ] Set up Named Credentials for weather, soil, dealer, and IoT APIs —
      never hard-code API keys in Apex or in the demo.

## 2. Real data, replacing every mock in `demo/mock-data.js`
- [ ] Weather provider: past 3 weeks + 7-day forecast by latitude/longitude.
- [ ] Soil / geology provider + Soil Health Card import.
- [ ] Verified dealer registry: who verifies a dealer, how often, and how
      a dealer loses verified status.
- [ ] Mandi price feed, government schemes, and insurance rules (later phase).
- [ ] Real image-diagnosis model, trained and validated per crop/region,
      with a published confidence threshold for agronomist escalation.

## 3. Agentforce + Flow
- [ ] Build the diagnosis, irrigation, and alert agents described in
      `salesforce/flows/agentforce-diagnosis-flow.md`.
- [ ] Prompt Templates for resolution steps in simple, local language.
- [ ] Human-approval step for severe cases, and an agronomist work queue.
- [ ] Test: low-confidence photo, severe pest, and no-network case.

## 4. IoT / smart motors — safety first
- [ ] Pick a motor controller + sensor protocol (MQTT / REST via MuleSoft).
- [ ] Dry-run protection, water-level check, and fail-safe OFF.
- [ ] Farmer permission per schedule; log every on/off event on the case.
- [ ] Fallback: timed SMS reminder when the motor is not smart.

## 5. Language, accessibility, and pilot
- [ ] Local-language voice input/output; test with low-literacy farmers.
- [ ] Offline mode on the real mobile app, with sync-conflict tests.
- [ ] Pilot: one crop, one region, ~100 farmers, agronomist review on
      every case, before any scale-up.
- [ ] Validate every dosage, waiting period, and safety step with
      agronomists; remove all demo dosages.

## 6. Publishing — my call, when I am ready
- [ ] I will decide later whether to create a GitHub repo under rishisfdc9-daaku, or keep it local for now.
- [ ] If I publish: add a licence, double-check there are no demo keys
      (there are none in this prototype), and add the repo link to LinkedIn.
- [ ] I will NOT add a project link to LinkedIn until the code is actually
      published and I have opened and verified the link myself.
