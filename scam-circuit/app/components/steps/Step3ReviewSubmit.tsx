
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import { contactOptions, messagingPlatforms, paymentApps } from "@/lib/report-options";
import { formatPayment } from "@/lib/report-format";
// import FormProgress from "../FormProgress";
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
      <div className="mx-auto max-w-8xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl text-green-700">✓</div>

        <h2 className="text-2xl font-bold text-gray-900">
          Report Submitted
        </h2>

        <p className="mt-3 text-gray-700">
          Your report and attachments have been saved.
          <span className="mt-2 block">Report ID: {submitted}</span>
        </p>

        <button
          type="button"
          onClick={() => resetForm()}
          className="mt-6 rounded-lg bg-green-700 px-6 py-3 font-medium text-white hover:bg-green-800"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white shadow-sm sm:p-6">
      {/* Header */}
      <div className="mb-8">
        {/* <FormProgress/> */}
        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Review & Submit
        </h2> 
        <p className="mt-2 text-sm text-gray-600">
          Review the details below and confirm your report before
          proceeding.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" aria-busy={submitting}>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <fieldset disabled={submitting} className="space-y-6">
        {/* Step 1: Incident information */}
        <section className="rounded-xl border border-gray-300 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              1. Incident Information
            </h3>

            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-sm font-medium text-green-600 hover:text-green-800"
            >
              Edit
            </button>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-gray-500">
                How were you contacted?
              </dt>
              <dd className="mt-1 text-gray-900">
                {formState.contactMethods.length > 0 ? (
                  <ul className="space-y-2">
                    {formState.contactMethods.map((method) => {
                      const option = contactOptions.find(
                        (option) => option.value === method
                      );
                      const details = formState.contactMethodDetails[
                        method as keyof typeof formState.contactMethodDetails
                      ];

                      return (
                        <li key={method} className="whitespace-pre-wrap break-words">
                          {option?.label || method}
                          {method === "social-messaging" && (
                            <ul className="mt-1 space-y-1 pl-4">
                              {formState.messagingPlatforms.map((value) => {
                                const name = value === "other"
                                  ? formState.otherMessagingPlatform
                                  : messagingPlatforms.find((platform) => platform.value === value)?.label || value;
                                return <li key={value}>{name}: {parseUsernames(formState.messagingUsernames[value] || "").join(", ")}</li>;
                              })}
                            </ul>
                          )}
                          {details ? `: ${details}` : ""}
                        </li>
                      );
                    })}
                  </ul>
                ) : "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-500">
                Payment method
              </dt>
              <dd className="mt-1 text-gray-900">
                {formatPayment(formState.paymentMethod)}
                {formState.paymentMethod === "other" && formState.otherPaymentMethod
                  ? `: ${formState.otherPaymentMethod}` : ""}
                {formState.paymentMethod === "payment-app" && formState.paymentApp
                  ? `: ${paymentApps.find((app) => app.value === formState.paymentApp)?.label || formState.paymentApp}` : ""}
                {formState.paymentMethod === "payment-app" && formState.paymentApp === "other" && formState.otherPaymentApp
                  ? `: ${formState.otherPaymentApp}` : ""}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-500">Payment handle</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-gray-900">
                {formState.paymentHandle || "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-500">Amount lost (USD)</dt>
              <dd className="mt-1 text-gray-900">
                {formState.amountLost !== "" ? `$${formState.amountLost}` : "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-500">
                Incident date
              </dt>
              <dd className="mt-1 text-gray-900">
                {formState.incidentDate || "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-500">
                Incident description
              </dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-gray-900">
                {formState.narrative || "Not provided"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Step 2: Evidence */}
        <section className="rounded-xl border border-gray-300 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              2. Evidence
            </h3>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-sm font-medium text-green-600 hover:text-green-800"
            >
              Edit
            </button>
          </div>

          <p className="mt-3 text-sm text-gray-600">
            {formState.evidenceFiles.length} file(s) selected
          </p>

          {formState.evidenceFiles.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {formState.evidenceFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3"
                >
                  <span className="break-all text-sm text-gray-800">
                    {file.name}
                  </span>

                  <span className="shrink-0 text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No evidence files selected.
            </p>
          )}

          <p className="mt-3 text-xs text-gray-500">
            Selected files will be saved with your report when you submit.
          </p>
        </section>

        {/* Acknowledgments */}
        <section className="space-y-4 rounded-xl bg-gray-50 p-5">
          <h3 className="font-semibold text-gray-900">
            Confirmations
          </h3>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={accuracyConfirmed}
              onChange={(event) =>
                setAccuracyConfirmed(event.target.checked)
              }
              required
              className="mt-1 h-4 w-4 rounded border-gray-300 accent-green-600"
            />

            <span className="text-sm text-gray-700">
              I confirm that this report is accurate to the best of
              my knowledge.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={privacyAcknowledged}
              onChange={(event) =>
                setPrivacyAcknowledged(event.target.checked)
              }
              required
              className="mt-1 h-4 w-4 rounded border-gray-300 accent-green-600"
            />

            <span className="text-sm text-gray-700">
              I understand that the report may contain sensitive
              information and that evidence should be handled securely.
            </span>
          </label>
        </section>

        {/* Navigation */}
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-gray-300 pt-5 sm:flex-row">
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <button
            type="submit"
            disabled={submitting || !accuracyConfirmed || !privacyAcknowledged}
            className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? "Submitting…" : "Submit Report →"}
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
