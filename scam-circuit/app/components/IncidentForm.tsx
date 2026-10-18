"use client";

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
  const { formState, setCurrentStep } = useIncidentForm();
  const currentStep = formState.currentStep;
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const formId =
    currentStep === 1
      ? "step1-form"
      : currentStep === 3
        ? "step3-form"
        : undefined;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto w-full max-w-5xl">

        {/* Step navigation OUTSIDE the individual step components */}
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

          {/* <p className="mt-3 text-sm text-gray-600">
            Step {currentStep} of {steps.length}:{" "}
            <span className="font-semibold text-gray-900">
              {steps[currentStep - 1].title}
            </span>
          </p> */}
        </div>

        {/* Only the current step's content changes */}
        {currentStep === 1 && <Step1GeneralInfo />}
        {currentStep === 2 && <Step2EvidenceUpload />}
        {currentStep === 3 && <Step3Review />}

        {/* Navigation buttons OUTSIDE the step components */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:invisible"
          >
            ← Back
          </button>

          {/* {currentStep === 2 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="rounded-lg bg-[#115c04] px-6 py-3 font-medium text-white hover:bg-green-800"
            >
              Continue to Review →
            </button>
          ) : (
            <button
              type="submit"
              form={formId}
              className="rounded-lg bg-[#115c04] px-6 py-3 font-medium text-white hover:bg-green-800"
            >
              {currentStep === 1
                ? "Continue to Evidence →"
                : "Submit Report"}
            </button>
          )} */}
        </div>
      </div>
    </div>
  );
}