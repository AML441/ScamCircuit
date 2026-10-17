"use client";

import { useState } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import FormProgress from "../FormProgress";

export default function Step2EvidenceUpload() {
const { setCurrentStep } = useIncidentForm();
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6">
      {/* <h2 className="text-2xl font-bold">Upload Evidence</h2> */}
      <FormProgress />

      <div className="space-y-3">
        <label
            htmlFor="evidence-upload"
            className="flex cursor-pointer flex-col items-center
            gap-3 rounded-xl border-2 border-dashed
            border-gray-300 p-8 text-center
            hover:border-blue-500 hover:bg-blue-50"
        >
            <span className="font-semibold text-gray-900">
            Upload evidence
            </span>

            <span className="text-sm text-gray-500">
            Click to choose files
            </span>

            <span className="rounded-lg bg-blue-600 px-5 py-3
            font-medium text-white">
            Choose files
            </span>
        </label>

        <input
            id="evidence-upload"
            type="file"
            multiple
            className="sr-only"
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

        {files.length === 0 ? (
            <p className="text-sm text-gray-500">
            No files selected
            </p>
        ) : (
            <ul className="space-y-2">
            {files.map((file, index) => (
                <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg
                    border border-gray-200 bg-gray-50 p-3"
                >
                <span className="text-gray-700">📄</span>
                <span className="flex-1 break-all text-sm text-gray-900">
                    {file.name}
                </span>
                <span className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(0)} KB
                </span>
                </li>
            ))}
            </ul>
        )}
        </div>
        <div className="w-full flex items-center justify-between flex-row  border-t border-gray-200 pt-4">
             <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="rounded-lg border flex justify-start border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
                ← Back
            </button>
            <button
                    type="button"
                    className="rounded-lg flex justify-end bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
                    onClick={() => setCurrentStep(3)}
                >
                    Continue to Review & Submit →
            </button>
        </div>
        {/* <p>Selected files: {files.length}</p> */}
    </div>
  );
}
