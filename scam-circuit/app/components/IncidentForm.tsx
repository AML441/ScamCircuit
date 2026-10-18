
"use client";

import { useState } from "react";
import { useIncidentForm } from "./IncidentFormContext";
import Step1GeneralInfo from "./steps/Step1GeneralInfo";
import Step2EvidenceUpload from "./steps/Step2EvidenceUpload";
import Step3Review from "./steps/Step3ReviewSubmit";

const steps = [
  { title: "Incident details", description: "Tell us what happened" },
  { title: "Supporting evidence", description: "Add files or screenshots" },
  { title: "Review & submit", description: "Check your details before submitting" },
];

export default function IncidentForm() {
  const { formState } = useIncidentForm();
  const currentStep = formState.currentStep;

  const [activeTab, setActiveTab] = useState<"report" | "search">("report");
  const [searchQuery, setSearchQuery] = useState("");

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Search functionality can be connected here.
    console.log("Search query:", searchQuery);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto w-full max-w-5xl">

        {/* Main tabs */}
        <div className="mb-6 flex justify-center gap-10 border-b border-gray-300">
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => setActiveTab("report")}
              className={`border-b-2 px-2 py-3 text-sm font-semibold transition ${
                activeTab === "report"
                  ? "border-[#115c04] text-[#115c04]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Report
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`border-b-2 px-2 py-3 text-sm font-semibold transition ${
                activeTab === "search"
                  ? "border-[#115c04] text-[#115c04]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Search
            </button>
          </div>
        </div>

        {/* Report tab */}
        {activeTab === "report" && (
          <>
            {/* Three-step progress indicator */}
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                {steps.map((step, index) => {
                  const stepNumber = index + 1;
                  const isActive = currentStep === stepNumber;
                  const isComplete = currentStep > stepNumber;

                  return (
                    <div
                      key={step.title}
                      className="flex flex-1 items-center gap-2"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold ${
                          isActive || isComplete
                            ? "bg-[#115c04] text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {isComplete ? "✓" : stepNumber}
                      </div>

                      <div className="hidden sm:block">
                        <p
                          className={`text-sm font-semibold ${
                            isActive ? "text-[#115c04]" : "text-gray-600"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#115c04] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Current report step */}
            {currentStep === 1 && <Step1GeneralInfo />}
            {currentStep === 2 && <Step2EvidenceUpload />}
            {currentStep === 3 && <Step3Review />}
          </>
        )}

        {/* Search tab */}
        {activeTab === "search" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Search Reports
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Search for a report using its report ID or other available details.
            </p>

            <form onSubmit={handleSearch} className="mt-6">
              <label
                htmlFor="report-search"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Search query
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="report-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Enter a report ID..."
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />

                <button
                  type="submit"
                  className="rounded-lg bg-[#115c04] px-6 py-3 font-semibold text-white transition hover:bg-green-800"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
