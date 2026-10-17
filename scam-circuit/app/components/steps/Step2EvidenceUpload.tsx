"use client";

import { useState } from "react";
import { useIncidentForm } from "../IncidentFormContext";

export default function Step2EvidenceUpload() {
const { setCurrentStep } = useIncidentForm();
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-2xl font-bold">Upload Evidence</h2>

      <input
        type="file"
        multiple
        onChange={(event) => {
          const selectedFiles = Array.from(
            event.target.files ?? []
          );

          setFiles((previousFiles) => [
            ...previousFiles,
            ...selectedFiles,
          ]);
        }}
      />
    <div className="flex justify-end border-t border-gray-200 pt-4">
            <button
                type="button"
                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
                onClick={() => setCurrentStep(3)}
            >
                Continue to Review & Submit →
            </button>
            </div>
        <p>Selected files: {files.length}</p>

    </div>
  );
}
