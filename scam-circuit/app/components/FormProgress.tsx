"use client";

import { useIncidentForm } from "./IncidentFormContext";
import { Icon } from "./FormUI";

const steps = [
  { title: "Incident details", description: "Tell us what happened" },
  { title: "Supporting evidence", description: "Add files or screenshots" },
  { title: "Review & submit", description: "Check the details" },
];

export default function FormProgress() {
  const { formState, setCurrentStep } = useIncidentForm();
  return (
    <nav className="form-progress" aria-label="Report progress">
      <p className="sidebar-label">YOUR REPORT</p>
      <ol className="step-list">
        {steps.map((step, index) => {
          const number = index + 1;
          const active = number === formState.currentStep;
          const complete = number < formState.currentStep;
          return (
            <li key={step.title} className={`progress-step ${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`} aria-current={active ? "step" : undefined}>
              <button type="button" className="step-link" disabled={!complete} onClick={() => setCurrentStep(number)}>
                <span className="step-circle">{complete ? <Icon name="check" /> : `0${number}`}</span>
                <span className="step-text"><span className="step-name">{step.title}</span><span className="step-description">{step.description}</span></span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mobile-progress-label">Step {formState.currentStep} of 3 <span>{steps[formState.currentStep - 1].title}</span></div>
    </nav>
  );
}
