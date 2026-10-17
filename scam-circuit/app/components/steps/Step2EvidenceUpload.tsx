"use client";

import { useState } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import FormProgress from "../FormProgress";

export default function Step2EvidenceUpload() {
const { setCurrentStep } = useIncidentForm();
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <FormProgress />
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
        <div className="w-full flex justify-center flex-row gap-[3em] border-t border-gray-200 pt-4">
             <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
                ← Back
            </button>
            <button
                    type="button"
                    className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
                    onClick={() => setCurrentStep(3)}
                >
                    Continue to Review & Submit →
            </button>
            <p>Selected files: {files.length}</p>
        </div>
    </div>
  );
}
