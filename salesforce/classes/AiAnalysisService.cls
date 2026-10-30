/**
 * KrishiWorld — AiAnalysisService
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * How Salesforce would call an external AI analysis endpoint, without
 * pretending that endpoint exists yet. This is integration scaffolding:
 * the endpoint is configurable, no URL and no key is hard-coded here,
 * and the safety rule is enforced before any result reaches a farmer.
 *
 * Why the endpoint is configurable this way: I have seen too many demos
 * hard-code a URL that works once and then leaks into production. In a
 * real org this reads a Named Credential / Custom Metadata record, so
 * the URL and the secret live in setup, not in code, and rotating a key
 * never needs a code change. The field names below are the contract I
 * would write the Named Credential against; the record itself is not
 * part of this prototype, because there is no real endpoint yet.
 *
 * Flow:
 *   photo -> POST to configured endpoint -> {problem, confidence,
 *   severity, modelVersion} -> CropIssueService.applyDiagnosis, which
 *   already escalates when confidence < 70 or severity = High.
 * If the endpoint is not configured, or the callout fails, or the
 * response is malformed, I return null and the caller escalates to an
 * agronomist. A missing AI answer is never treated as a "healthy crop".
 */
public with sharing class AiAnalysisService {

    // Configurable in a real org (Named Credential / Custom Metadata).
    // Deliberately left blank in this prototype: no real endpoint exists.
    private static final String ENDPOINT_SETTING = 'KrishiWorld_AI_Endpoint';
    private static final Integer MIN_CONFIDENCE = 70;
    private static final Integer CALLOUT_TIMEOUT_MS = 30000;

    public class AiRequest {
        public String issueId;
        public String crop;
        public String photoContentVersionId; // ContentVersion Id of the uploaded photo
        public String modelVersion;          // optional, for A/B testing models
    }

    public class AiResponse {
        public String problem;
        public Integer confidence;
        public String severity;
        public String modelVersion;
        public String rawLabel;              // top model label, kept for audit
    }

    // Test seam: tests set this instead of relying on a live callout.
    @TestVisible private static String testEndpoint;

    public static String getEndpoint() {
        if (String.isNotBlank(testEndpoint)) return testEndpoint;
        // Real org: read from Custom Metadata / Named Credential here.
        // Prototype: no endpoint is configured, so callers escalate.
        return null;
    }

    public static AiResponse analysePhoto(AiRequest request) {
        if (request == null || String.isBlank(request.photoContentVersionId)) {
            return null; // No photo, no AI answer. Caller escalates.
        }
        String endpoint = getEndpoint();
        if (String.isBlank(endpoint)) return null;

        HttpRequest httpReq = new HttpRequest();
        httpReq.setEndpoint(endpoint);
        httpReq.setMethod('POST');
        httpReq.setTimeout(CALLOUT_TIMEOUT_MS);
        httpReq.setHeader('Content-Type', 'application/json');
        // Note: no Authorization header is hard-coded. A real org sends
        // credentials through the Named Credential, never in Apex code.
        httpReq.setBody(JSON.serialize(request));

        HttpResponse httpRes;
        try {
            httpRes = new Http().send(httpReq);
        } catch (CalloutException e) {
            // Network / timeout: escalate, do not retry blindly inside a
            // farmer-facing transaction. Retries belong in a queue (see
            // the offline-queue design in core/offline-queue.js).
            System.debug('KrishiWorld AI callout failed: ' + e.getMessage());
            return null;
        }
        if (httpRes == null || httpRes.getStatusCode() != 200) {
            System.debug('KrishiWorld AI callout returned non-200: ' +
                (httpRes == null ? 'null' : String.valueOf(httpRes.getStatusCode())));
            return null;
        }
        AiResponse parsed;
        try {
            parsed = (AiResponse) JSON.deserialize(httpRes.getBody(), AiResponse.class);
        } catch (Exception e) {
            System.debug('KrishiWorld AI response was not valid JSON: ' + e.getMessage());
            return null;
        }
        if (parsed == null || String.isBlank(parsed.problem) || parsed.confidence == null) {
            return null; // Malformed result is worse than no result.
        }
        // Clamp, never trust a remote confidence blindly.
        parsed.confidence = Math.max(0, Math.min(100, parsed.confidence));
        return parsed;
    }

    public static Boolean shouldEscalate(AiResponse response) {
        // Same rule as everywhere in KrishiWorld, in one place so it
        // cannot drift between the demo, the service, and Apex.
        if (response == null) return true;
        return response.confidence < MIN_CONFIDENCE || response.severity == 'High';
    }

    public static void runAiDiagnosis(Id issueId, String crop, String photoContentVersionId) {
        AiRequest request = new AiRequest();
        request.issueId = String.valueOf(issueId);
        request.crop = crop;
        request.photoContentVersionId = photoContentVersionId;
        AiResponse response = analysePhoto(request);
        if (response == null || shouldEscalate(response)) {
            // Escalation path: keep the case visible to a human, with the
            // reason recorded, instead of showing a guessed resolution.
            CropIssueService.applyDiagnosis(issueId, 'Awaiting agronomist review',
                response == null ? 0 : response.confidence, 'High');
            return;
        }
        CropIssueService.applyDiagnosis(issueId, response.problem,
            response.confidence, response.severity);
    }
}
