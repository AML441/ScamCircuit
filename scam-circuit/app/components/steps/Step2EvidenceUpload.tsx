"use client";

import { useState } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import FormProgress from "../FormProgress";
import { validateEvidence } from "@/lib/report-validation";

export default function Step2EvidenceUpload() {
  const { formState, setCurrentStep, addEvidenceFiles, removeEvidenceFile } = useIncidentForm();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <FormProgress />
      <h2 className="text-2xl font-bold text-gray-900">Upload Evidence (optional)</h2>
      <p className="my-3 text-sm text-gray-600">Select up to 10 files, totaling 20 MB or less.</p>
      <input
        aria-label="Evidence files (optional)"
        type="file"
        multiple
        className="text-gray-900"
        onChange={(event) => {
          const selectedFiles = Array.from(event.target.files ?? []);
          const validationError = validateEvidence([...formState.evidenceFiles, ...selectedFiles]);
          setError(validationError);
          if (!validationError) addEvidenceFiles(selectedFiles);
          event.target.value = "";
        }}
      />
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <p className="my-3 text-sm text-gray-700">Selected files: {formState.evidenceFiles.length}</p>
      <ul className="mb-4 space-y-2">
        {formState.evidenceFiles.map((file, index) => (
          <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 text-sm text-gray-800">
            <span className="break-all">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            <button
              type="button"
              className="text-blue-600 hover:text-blue-800"
              aria-label={`Remove ${file.name}`}
              onClick={() => { removeEvidenceFile(index); setError(null); }}
            >Remove</button>
          </li>
        ))}
      </ul>
      <div className="flex justify-between gap-3 border-t border-gray-200 pt-4">
        <button type="button" onClick={() => setCurrentStep(1)} className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50">← Back</button>
        <button type="button" onClick={() => setCurrentStep(3)} className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">Continue to Review &amp; Submit →</button>
      </div>
    </div>
  );
}
