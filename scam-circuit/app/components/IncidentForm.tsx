"use client";

import { useIncidentForm } from "./IncidentFormContext";
import ReportSearchTabs from "./ReportSearchTabs";
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

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto w-full max-w-5xl">
        <ReportSearchTabs activeTab="report" />

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
      </div>
    </div>
  );
}
