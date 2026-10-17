
"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

export default function Step3ReviewConnections() {
  const [identifierType, setIdentifierType] = useState("payment-handle");
  const [identifier, setIdentifier] = useState("");
  const [checked, setChecked] = useState(false);

  function handleIdentifierChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setIdentifier(event.target.value);
    setChecked(false);
  }

  function handleTypeChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    setIdentifierType(event.target.value);
    setChecked(false);
  }

  function checkMatches(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!identifier.trim()) return;

    // Demo only: replace with a secure backend lookup.
    setChecked(true);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Review Connections
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Step 3 of 4 — Identify Potential Connections
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Check whether an identifier associated with your
          incident may appear in other reports.
        </p>
      </div>

      <form onSubmit={checkMatches} className="space-y-5">
        <div>
          <label
            htmlFor="identifierType"
            className="mb-2 block font-medium text-gray-800"
          >
            Identifier type
          </label>

          <select
            id="identifierType"
            value={identifierType}
            onChange={handleTypeChange}
            className="w-full rounded-lg border border-gray-300 p-3"
          >
            <option value="payment-handle">Payment handle</option>
            <option value="email">Email address</option>
            <option value="phone">Phone number</option>
            <option value="username">Username</option>
            <option value="website">Website or URL</option>
            <option value="wallet">Crypto wallet address</option>
            <option value="transaction-id">Transaction ID</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="identifier"
            className="mb-2 block font-medium text-gray-800"
          >
            Identifier to check
          </label>

          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={handleIdentifierChange}
            placeholder="Enter the identifier"
            required
            className="w-full rounded-lg border border-gray-300 p-3"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          Check Potential Matches
        </button>
      </form>

      {checked && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900">
              Demo result: Review recommended
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              This is sample data for the prototype. No actual
              database search was performed.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900">
              Example related reports
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              3 sample reports contain potentially related
              identifiers.
            </p>
            <p className="mt-1 text-sm text-gray-600">
              2 sample indicators were flagged for further review.
            </p>
          </div>

          <p className="text-sm text-gray-500">
            A matching identifier does not prove fraud or establish
            that two incidents are connected. All matches must be
            reviewed in context.
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-between border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={() =>
            alert(
              "Demo only. Connect this button to Step 4 and preserve the report data."
            )
          }
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          Review Report →
        </button>
      </div>
    </div>
  );
}
