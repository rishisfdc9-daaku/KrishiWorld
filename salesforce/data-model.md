# KrishiWorld — Salesforce data model (scaffolding)

Author: Rishi Gullapalli (rishisfdc9-daaku)

I designed this around one record per problem. If a farmer, an agronomist,
and a dealer are all looking at different records, the farmer loses — so
everything hangs off Crop_Issue__c. This is scaffolding, not a deployed org.

## Crop_Issue__c — the case for one crop problem
- Farmer__c (Lookup, Account/Contact) — who owns this farm
- Crop__c (Picklist: Paddy, Cotton, Tomato, Maize, Other)
- Crop_Stage__c (Picklist: Sowing, Vegetative, Flowering, Harvest)
- Photo_URL__c (Text) — in production, a ContentDocument link, not a URL string
- Location_Latitude__c / Location_Longitude__c (Number)
- Village__c, Soil_Type__c, Soil_Moisture__c (Number, %)
- Diagnosis__c (Text), Confidence__c (Number, %), Severity__c (Picklist: Low, Medium, High)
- Resolution__c (Long Text), Check_Again_Date__c (Date)
- Status__c (Picklist: New, Resolution Given, Escalated to Agronomist, Closed)
- Water_Need_Litres__c, Motor_Schedule__c — linked to irrigation events

Why Status matters: "Escalated to Agronomist" is not a failure state. It is
the safety rule. Low confidence or high severity must land there, never in
a guessed answer.

## Farm__c
- Farmer, village, total area, primary crops, electricity window
  (Electricity_From__c, Electricity_To__c), preferred language.
- Why I keep electricity on the farm, not the case: it rarely changes, and
  every irrigation decision needs it without asking the farmer again.

## Dealer__c
- Name, location, Verified__c (Checkbox), Verification_Date__c,
  Verification_By__c — who actually checked this dealer, and when.
- A dealer without a verifier and a date is not "verified" in my code,
  no matter what a marketing page says.

## Dealer_Product__c
- Dealer, product name, price, stock quantity, QR_Code__c.
- QR check writes a verification event, so a fake product leaves a trace.

## Irrigation_Event__c
- Farm, Crop_Issue__c (optional), motor on/off times, litres used,
  electricity window used, dry-run flag.
- Every motor action is logged here. If it is not logged, it did not happen
  as far as the farmer's record is concerned.

## Weather_Alert__c
- Farm/village, alert level, message, action, forecast date, delivered flag.
- Alerts are per village + crop, not per district — a generic district
  alert is exactly what farmers learn to ignore.
