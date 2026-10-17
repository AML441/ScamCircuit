
"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";

export interface IncidentFormState {
  currentStep: number;

  // Step 1: Incident information
  encounterMethod: string;
  otherContactMethod: string;
  contactMethods: string[];

  contactMethodDetails: {
    website: string;
    "social-media": string;
    text: string;
    email: string;
    phone: string;
    "in-person": string;
    other: string;
  };

  paymentMethod: string;
  paymentMethods: string[];
  otherPaymentMethod: string;
  incidentDate: string;
  narrative: string;

  // Step 2: Evidence
  evidenceFiles: File[];

  // Step 3: Acknowledgments
  accuracyConfirmed: boolean;
  privacyAcknowledged: boolean;
}

interface IncidentFormContextType {
  formState: IncidentFormState;
  updateForm: (data: Partial<IncidentFormState>) => void;
  setCurrentStep: (step: number) => void;
  addEvidenceFiles: (files: File[]) => void;
  removeEvidenceFile: (index: number) => void;
  resetForm: () => void;
}

const initialState: IncidentFormState = {
  currentStep: 1,
  otherContactMethod: "",
  contactMethods: [],
   contactMethodDetails: {
    website: "",
    "social-media": "",
    text: "",
    email: "",
    phone: "",
    "in-person": "",
    other: "",
  },
  paymentMethods: [],
  otherPaymentMethod: "",
  encounterMethod: "",
  paymentMethod: "",
  incidentDate: "",
  narrative: "",

  evidenceFiles: [],

  accuracyConfirmed: false,
  privacyAcknowledged: false,
};

const IncidentFormContext =
  createContext<IncidentFormContextType | undefined>(undefined);

export function IncidentFormProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [formState, setFormState] =
    useState<IncidentFormState>(initialState);

  function updateForm(data: Partial<IncidentFormState>) {
    setFormState((previous) => ({
      ...previous,
      ...data,
    }));
  }

  function setCurrentStep(step: number) {
    if (step < 1 || step > 3) return;

    setFormState((previous) => ({
      ...previous,
      currentStep: step,
    }));
  }

  function addEvidenceFiles(files: File[]) {
    setFormState((previous) => ({
      ...previous,
      evidenceFiles: [
        ...previous.evidenceFiles,
        ...files,
      ],
    }));
  }

  function removeEvidenceFile(index: number) {
    setFormState((previous) => ({
      ...previous,
      evidenceFiles: previous.evidenceFiles.filter(
        (_, currentIndex) => currentIndex !== index
      ),
    }));
  }

  function resetForm() {
    setFormState({
      ...initialState,
      evidenceFiles: [],
    });
  }

  return (
    <IncidentFormContext.Provider
      value={{
        formState,
        updateForm,
        setCurrentStep,
        addEvidenceFiles,
        removeEvidenceFile,
        resetForm,
      }}
    >
      {children}
    </IncidentFormContext.Provider>
  );
}

export function useIncidentForm() {
  const context = useContext(IncidentFormContext);

  if (!context) {
    throw new Error(
      "useIncidentForm must be used within IncidentFormProvider"
    );
  }

  return context;
}
