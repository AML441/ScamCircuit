"use client";

import { useState } from "react";

export default function Step2EvidenceUpload() {
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

      <p>Selected files: {files.length}</p>
    </div>
  );
}