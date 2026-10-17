"use client";

import { useIncidentForm } from "./IncidentFormContext";
import Step1GeneralInfo from "./steps/Step1GeneralInfo";
import Step2EvidenceUpload from "./steps/Step2EvidenceUpload";
import Step3Review from "./steps/Step3Review";

export default function IncidentForm() {
     const { formState } = useIncidentForm();
     return (
    <div className="min-h-screen bg-[black] p-6">
      {(() => {
        switch (formState.currentStep) {
          case 1:
            return <Step1GeneralInfo />;

          case 2:
            return <Step2EvidenceUpload/>;

          case 3:
            return <Step3Review />;

        //   case 4:
        //     return <Step4ReviewSubmit />;

          default:
            return <Step1GeneralInfo />;
        }
      })()}
    </div>
  );
}