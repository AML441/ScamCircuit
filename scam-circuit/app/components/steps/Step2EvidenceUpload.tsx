"use client";

import { useState } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import { ErrorNotice, EvidenceList, Icon, StepHeading } from "../FormUI";
import { validateEvidence } from "@/lib/report-validation";

export default function Step2EvidenceUpload() {
  const { formState, setCurrentStep, addEvidenceFiles, removeEvidenceFile } = useIncidentForm();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(files: File[]) {
    const validationError = validateEvidence([...formState.evidenceFiles, ...files]);
    setError(validationError);
    if (!validationError) addEvidenceFiles(files);
  }

  return (
    <div className="step-view">
      <StepHeading step="STEP 02 / SUPPORTING EVIDENCE" title="A little context goes a long way." description="Add screenshots, messages, or receipts that help explain what happened." optional />
      <div className="form-card">
        <section className="form-section upload-section" aria-labelledby="upload-title">
          <div className="upload-section-heading"><h2 id="upload-title">Supporting files</h2><span className="optional">Optional</span></div>
          <p className="section-description">You can add multiple files, or continue without uploading anything.</p>
          {error && <ErrorNotice message={error} />}
          <label htmlFor="evidence-files" className={`upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}>
            <input id="evidence-files" className="upload-input" type="file" multiple onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} aria-describedby="upload-limits" />
            <span className="upload-icon"><Icon name="upload" /></span>
            <span className="upload-title">{dragging ? "Drop your files here" : "Drag and drop your files here"}</span>
            <span className="upload-or">or</span>
            <span className="button button-secondary upload-browse">Choose files<Icon name="arrowRight" /></span>
            <span className="upload-limits" id="upload-limits">Up to 10 files · 20 MB total</span>
          </label>
          <div className="files-heading"><h3>Attached files</h3><span className="count-badge">{formState.evidenceFiles.length}</span></div>
          {formState.evidenceFiles.length > 0 ? <EvidenceList files={formState.evidenceFiles} onRemove={(index) => { removeEvidenceFile(index); setError(null); }} /> : <p className="empty-files">No files added yet. You can skip this step if you don’t have any.</p>}
          <div className="help-note"><Icon name="info" /><p>Choose files relevant to your report. Avoid including passwords, authentication codes, or full card numbers.</p></div>
        </section>
        <div className="form-actions"><button type="button" onClick={() => setCurrentStep(1)} className="button button-quiet"><Icon name="arrowLeft" />Back to details</button><button type="button" onClick={() => setCurrentStep(3)} className="button button-primary">Continue to review<Icon name="arrowRight" /></button></div>
      </div>
    </div>
  );
}
