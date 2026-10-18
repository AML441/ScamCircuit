"use client";

import { useState } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import { validateEvidence } from "@/lib/report-validation";

export default function Step2EvidenceUpload() {
  const {
    formState,
    setCurrentStep,
    addEvidenceFiles,
    removeEvidenceFile,
  } = useIncidentForm();

  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    const validationError = validateEvidence([
      ...formState.evidenceFiles,
      ...selectedFiles,
    ]);

    setError(validationError);

    if (!validationError) {
      addEvidenceFiles(selectedFiles);
    }
  };

  return (
    <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Upload Evidence (optional)
      </h2>

      <p className="my-3 text-sm text-gray-600">
        Select up to 10 files, totaling 20 MB or less.
      </p>

      <div className="space-y-3">
        <label
          htmlFor="evidence-upload"
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();

            if (
              !event.currentTarget.contains(
                event.relatedTarget as Node | null
              )
            ) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFiles(Array.from(event.dataTransfer.files));
          }}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-green-500 hover:bg-green-50"
          }`}
        >
          <span className="font-semibold text-gray-900">
            {isDragging ? "Drop your files here" : "Upload evidence"}
          </span>

          <span className="text-sm text-gray-500">
            {isDragging
              ? "Release to add your files"
              : "Drag and drop files here, or click to choose files"}
          </span>

          <span className="rounded-lg bg-green-700 px-5 py-3 font-medium text-white">
            Choose files
          </span>
        </label>

        <input
          id="evidence-upload"
          aria-label="Evidence files (optional)"
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            handleFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {formState.evidenceFiles.length === 0 ? (
          <p className="text-sm text-gray-500">No files selected</p>
        ) : (
          <ul className="space-y-2">
            {formState.evidenceFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <span aria-hidden="true">📄</span>

                <span className="flex-1 break-all text-sm text-gray-900">
                  {file.name}
                </span>

                <span className="shrink-0 text-xs text-gray-500">
                  {(file.size / 1024).toFixed(0)} KB
                </span>

                <button
                  type="button"
                  className="shrink-0 text-sm text-green-600 hover:text-green-800"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => {
                    removeEvidenceFile(index);
                    setError(null);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className="rounded-lg bg-green-700 px-6 py-3 font-medium text-white hover:bg-green-800"
          >
            Continue to Review &amp; Submit →
          </button>
        </div>
      </div>
    </div>
  );
}