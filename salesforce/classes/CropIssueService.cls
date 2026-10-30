/**
 * KrishiWorld — CropIssueService
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why this class exists: every crop problem in KrishiWorld is one case.
 * I did not want diagnosis, weather, and dealer logic scattered across
 * triggers and flows, because then nobody can tell what happened to a
 * farmer's case. This class is the one place a case is created and moved
 * forward, and the safety rule lives here on purpose: low confidence or
 * high severity always goes to an agronomist, never to a guessed answer.
 *
 * Scaffolding only — not deployed to any org yet. Object and field names
 * match salesforce/data-model.md.
 */
public with sharing class CropIssueService {

    // A case I will not answer automatically, no matter how busy I am.
    private static final Integer MIN_CONFIDENCE = 70;

    public static Id createIssue(Id farmId, String crop, String stage, Decimal lat, Decimal lon) {
        // In a real org this inserts Crop_Issue__c. Here I keep the shape
        // explicit so the Flow and LWC can be written against it first.
        Crop_Issue__c issue = new Crop_Issue__c(
            Farm__c = farmId,
            Crop__c = crop,
            Crop_Stage__c = stage,
            Location_Latitude__c = lat,
            Location_Longitude__c = lon,
            Status__c = 'New'
        );
        insert issue;
        return issue.Id;
    }

    public static void applyDiagnosis(Id issueId, String diagnosis, Integer confidence, String severity) {
        Crop_Issue__c issue = [
            SELECT Id, Status__c FROM Crop_Issue__c WHERE Id = :issueId LIMIT 1
        ];
        issue.Diagnosis__c = diagnosis;
        issue.Confidence__c = confidence;
        issue.Severity__c = severity;
        // This is the rule I care about most in the whole project.
        if (confidence < MIN_CONFIDENCE || severity == 'High') {
            issue.Status__c = 'Escalated to Agronomist';
        } else {
            issue.Status__c = 'Resolution Given';
        }
        update issue;
    }
}
