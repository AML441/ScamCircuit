
"use client";

import { useIncidentForm } from "./IncidentFormContext";

const steps = [
  "Incident Information",
  "Evidence Upload",
  "Review & Submit",
];

export default function FormProgress() {
  const { formState } = useIncidentForm();
  const currentStep = formState.currentStep;
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="mb-6">
      <p className="text-xl text-gray-600">
        Step {currentStep} of {steps.length} —{" "}
        {steps[currentStep - 1]}
      </p>

      {/* Progress bar background */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        {/* Progress bar fill */}
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
