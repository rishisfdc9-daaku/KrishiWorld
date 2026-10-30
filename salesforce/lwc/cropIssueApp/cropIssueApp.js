// KrishiWorld LWC — Rishi Gullapalli (rishisfdc9-daaku)
// I kept the component thin on purpose: it collects what the farmer
// knows (crop, photo) and shows what the server decided (diagnosis,
// confidence, escalation). All the hard rules live in Apex, so the
// mobile app and any future web version share the same safety logic.
import { LightningElement, track } from 'lwc';

export default class CropIssueApp extends LightningElement {
    @track crop = 'Paddy';
    @track diagnosis = '';
    @track confidence = 0;
    @track severity = '';
    @track escalated = false;

    get cropOptions() {
        return [
            { label: 'Paddy', value: 'Paddy' },
            { label: 'Cotton', value: 'Cotton' },
            { label: 'Tomato', value: 'Tomato' },
            { label: 'Maize', value: 'Maize' },
        ];
    }

    handleCrop(event) { this.crop = event.detail.value; }
    handlePhoto() { /* Photo upload handled by lightning-file-upload; case creation wired in Apex. */ }

    diagnose() {
        // TODO (Rishi): call DiagnosisService.runDiagnosis via Apex.
        // Until then, show the honest state: no model result yet.
        this.diagnosis = 'Awaiting agronomist review (demo component — model not wired in yet)';
        this.confidence = 0;
        this.severity = 'High';
        this.escalated = true;
    }
}
