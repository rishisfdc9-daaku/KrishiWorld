/**
 * KrishiWorld — DiagnosisService
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * This is the orchestration, not the model. I keep it separate because
 * the model will change — a better one will come along — but the farmer's
 * story should not: photo, then weather, then soil, then an answer with
 * a confidence score attached. If any of those pieces is missing, I would
 * rather escalate than pretend I know.
 *
 * Scaffolding only. The image-model callout is a stub by design.
 */
public with sharing class DiagnosisService {

    public class DiagnosisResult {
        public String problem;
        public Integer confidence;
        public String severity;
        public String reason;
    }

    // Delegates to AiAnalysisService when an endpoint is configured;
    // otherwise returns null on purpose, so nobody mistakes this demo
    // for a working diagnosis — a caller must handle a missing result.
    // The photo ContentVersion Id is passed by the caller in a real org;
    // this scaffolding keeps the signature simple until that wiring exists.
    public static DiagnosisResult diagnoseFromPhoto(Id issueId) {
        AiAnalysisService.AiRequest req = new AiAnalysisService.AiRequest();
        req.issueId = String.valueOf(issueId);
        req.photoContentVersionId = null; // no photo wired in the prototype
        AiAnalysisService.AiResponse ai = AiAnalysisService.analysePhoto(req);
        if (ai == null) return null;
        DiagnosisResult result = new DiagnosisResult();
        result.problem = ai.problem;
        result.confidence = ai.confidence;
        result.severity = ai.severity;
        result.reason = 'External AI model: ' + (String.isBlank(ai.modelVersion) ? 'unknown version' : ai.modelVersion);
        return result;
    }

    public static void runDiagnosis(Id issueId) {
        DiagnosisResult result = diagnoseFromPhoto(issueId);
        if (result == null) {
            // No model answer is itself an answer: send it to a human.
            CropIssueService.applyDiagnosis(issueId, 'Awaiting agronomist review', 0, 'High');
            return;
        }
        CropIssueService.applyDiagnosis(issueId, result.problem, result.confidence, result.severity);
    }
}
