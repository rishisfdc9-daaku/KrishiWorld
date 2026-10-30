# Agentforce diagnosis flow (design notes)
Author: Rishi Gullapalli (rishisfdc9-daaku)

I am writing this as a flow, not just a prompt, because the order matters:
never give an answer before you know the confidence, and never skip the
human step for a severe case.

1. Farmer submits photo + crop + stage → Crop_Issue__c, Status = New.
2. Diagnosis Agent calls the image model → problem, confidence, severity.
3. Flow pulls weather (last 3 weeks + forecast) and soil for that farm.
4. Diagnosis Agent drafts resolution steps in simple language, plus
   safety, waiting period, and a check-again date.
5. Decision: confidence < 70 OR severity = High?
   - Yes → Status = Escalated to Agronomist, agronomist work queue, farmer
     told honestly: "I am not sure enough — an agronomist will review this."
   - No → Status = Resolution Given, steps shown to the farmer.
6. If input is needed → DealerLocatorService (verified dealers only).
7. If water is needed → Irrigation Agent + MotorControlService, inside the
   farm's electricity window, with farmer permission.
8. Daily alert job re-checks the forecast for open cases and creates
   Weather_Alert__c records with one clear action each.
9. Farmer confirms the outcome → case closed; outcome is stored so the
   next diagnosis for that village is a little less of a guess.

Prompt rules I will hold myself to:
- Short sentences, local language first, no jargon.
- Always state confidence. Never present a guess as a fact.
- Dosage only from a validated label + agronomist check, never from the model alone.
