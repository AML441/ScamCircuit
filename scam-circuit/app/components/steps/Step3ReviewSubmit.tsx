
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import { contactOptions } from "./Step1GeneralInfo";
import FormProgress from "../FormProgress";

export default function Step3ReviewSubmit() {
  const { formState, setCurrentStep } = useIncidentForm();

  const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accuracyConfirmed || !privacyAcknowledged) {
      return;
    }

    // Demo only: no report is sent or saved yet.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">✓</div>

        <h2 className="text-2xl font-bold text-gray-900">
          Demo Report Reviewed
        </h2>

        <p className="mt-3 text-gray-600">
          Your report passed the demo confirmation step, but it has
          not been sent to a server or saved to a database.
        </p>

        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          Back to Start
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-blue-600">
          STEP 3 OF 3
        </p>
        <FormProgress/>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Review & Submit
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Review the details below and confirm your report before
          proceeding.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Incident information */}
        <section className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              1. Incident Information
            </h3>

            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-gray-500">
                How did you first encounter this incident?
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
                {formState.paymentMethod || "Not provided"}
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
        <section className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              2. Evidence
            </h3>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
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
            These files are currently held in browser state. They have
            not been uploaded to secure storage.
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
              className="mt-1 h-4 w-4 rounded border-gray-300"
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
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />

            <span className="text-sm text-gray-700">
              I understand that the report may contain sensitive
              information and that evidence should be handled securely.
            </span>
          </label>
        </section>

        {/* Demo submission notice */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            <strong>Prototype notice:</strong> Submitting this form
            will only show a local confirmation. No report will be
            transmitted, stored, or shared.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-gray-200 pt-5 sm:flex-row">
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <button
            type="submit"
            disabled={!accuracyConfirmed || !privacyAcknowledged}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Submit Report →
          </button>
        </div>
      </form>
    </div>
  );
}
