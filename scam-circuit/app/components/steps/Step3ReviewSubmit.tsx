"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import { ErrorNotice, EvidenceList, Icon, StepHeading } from "../FormUI";
import { contactOptions, messagingPlatforms, paymentApps, paymentMethodOptions } from "@/lib/report-options";
import { validateReport, validateEvidence, parseUsernames } from "@/lib/report-validation";

export default function Step3ReviewSubmit() {
  const { formState, setCurrentStep, resetForm } = useIncidentForm();
  const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const report = { ...formState, accuracyConfirmed, privacyAcknowledged };
    const validation = validateReport(report);
    const fileError = validateEvidence(formState.evidenceFiles);
    if (!validation.ok || fileError) {
      setError(!validation.ok ? validation.error : fileError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = new FormData();
      // Send only report inputs; files travel in separate multipart fields.
      const { evidenceFiles, ...fields } = report;
      body.append("report", JSON.stringify(fields));
      evidenceFiles.forEach((file) => body.append("files", file));
      const response = await fetch("/api/reports", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your report could not be saved.");
      if (typeof result.reportId !== "string") throw new Error("The server did not confirm your report. Please try again.");
      setSubmitted(result.reportId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Your report could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }


  if (submitted) {
    return (
      <div className="success-card" role="status">
        <span className="success-icon"><Icon name="check" /></span>
        <div className="eyebrow">REPORT RECEIVED</div>
        <h1>Thank you for sharing your experience.</h1>
        <p>Your report and any attached files have been saved. Your attention to the details makes a difference.</p>
        <div className="report-receipt"><span>Report reference</span><strong>{submitted}</strong><small>Keep this reference for your records.</small></div>
        <button type="button" onClick={() => resetForm()} className="button button-primary">Submit another report<Icon name="arrowRight" /></button>
      </div>
    );
  }

  const paymentLabel = formState.paymentMethod === "other"
    ? formState.otherPaymentMethod
    : paymentMethodOptions.find((option) => option.value === formState.paymentMethod)?.label || "Not provided";
  const appLabel = formState.paymentApp === "other" ? formState.otherPaymentApp : paymentApps.find((app) => app.value === formState.paymentApp)?.label;
  const incidentDate = formState.incidentDate
    ? new Date(`${formState.incidentDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Not provided";

  return (
    <div className="step-view">
      <StepHeading step="STEP 03 / REVIEW & SUBMIT" title="One last look before you submit." description="Check that everything looks right. You can go back and edit any details." />
      <form className="form-card review-card" onSubmit={handleSubmit} aria-busy={submitting}>
        {error && <div className="form-error"><ErrorNotice message={error} /></div>}
        <fieldset disabled={submitting} className="review-fieldset">
          <section className="form-section" aria-labelledby="review-details">
            <div className="review-section-heading"><h2 id="review-details"><Icon name="file" />Incident details</h2><button type="button" className="edit-button" onClick={() => setCurrentStep(1)}><Icon name="edit" />Edit details</button></div>
            <dl className="review-details">
              <div className="review-row"><dt>Contact methods</dt><dd>
                {formState.contactMethods.length ? <ul className="review-contact-list">{formState.contactMethods.map((method) => (
                  <li key={method}>
                    <span className="review-contact-name">{contactOptions.find((option) => option.value === method)?.label || method}</span>
                    {method === "social-messaging" ? <ul className="review-usernames">{formState.messagingPlatforms.map((value) => <li key={value}><span>{value === "other" ? formState.otherMessagingPlatform : messagingPlatforms.find((platform) => platform.value === value)?.label || value}</span><span>{parseUsernames(formState.messagingUsernames[value] || "").join(", ")}</span></li>)}</ul> : <span className="review-contact-value">{formState.contactMethodDetails[method as keyof typeof formState.contactMethodDetails]}</span>}
                  </li>
                ))}</ul> : "Not provided"}
              </dd></div>
              <div className="review-row"><dt>Payment method</dt><dd>{paymentLabel}{formState.paymentMethod === "payment-app" && appLabel ? ` · ${appLabel}` : ""}</dd></div>
              <div className="review-row"><dt>Payment handle</dt><dd className={!formState.paymentHandle ? "value-empty" : ""}>{formState.paymentHandle || "Not provided"}</dd></div>
              <div className="review-row"><dt>Amount lost</dt><dd className={`review-amount ${formState.amountLost === "" ? "value-empty" : ""}`}>{formState.amountLost !== "" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(formState.amountLost)) : "Not provided"}{formState.amountLost !== "" && <span className="review-currency">USD</span>}</dd></div>
              <div className="review-row"><dt>Incident date</dt><dd>{incidentDate}</dd></div>
              <div className="review-row review-narrative"><dt>What happened</dt><dd>{formState.narrative || "Not provided"}</dd></div>
            </dl>
          </section>
          <section className="form-section" aria-labelledby="review-evidence">
            <div className="review-section-heading"><h2 id="review-evidence"><Icon name="upload" />Supporting evidence<span className="count-badge">{formState.evidenceFiles.length}</span></h2><button type="button" className="edit-button" onClick={() => setCurrentStep(2)}><Icon name="edit" />Edit files</button></div>
            {formState.evidenceFiles.length ? <EvidenceList files={formState.evidenceFiles} /> : <p className="empty-files">No files attached.</p>}
          </section>
          <section className="form-section confirmation-section" aria-labelledby="confirm-heading">
            <h2 id="confirm-heading">Before you submit</h2>
            <p className="section-description">Please confirm both statements to send your report.</p>
            <label className="confirmation-option"><input type="checkbox" required checked={accuracyConfirmed} onChange={(event) => setAccuracyConfirmed(event.target.checked)} className="option-checkbox" /><span>I confirm that this report is accurate to the best of my knowledge.</span></label>
            <label className="confirmation-option"><input type="checkbox" required checked={privacyAcknowledged} onChange={(event) => setPrivacyAcknowledged(event.target.checked)} className="option-checkbox" /><span>I understand that this report may contain sensitive information and that evidence should be handled securely.</span></label>
          </section>
          <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setCurrentStep(2)}><Icon name="arrowLeft" />Back to evidence</button><button type="submit" className="button button-primary" disabled={submitting || !accuracyConfirmed || !privacyAcknowledged}>{submitting ? <><span className="button-spinner" />Submitting report…</> : <>Submit report<Icon name="arrowRight" /></>}</button></div>
        </fieldset>
      </form>
    </div>
  );
}
