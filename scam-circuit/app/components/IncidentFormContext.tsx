
"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";

export type IncidentIdentifier = {
  id: string;
  type: string;
  value: string;
};

export interface IncidentFormState {
  currentStep: number;

  // Step 1: Incident information
  incidentType: string;
  encounterMethod: string;
  outcome: string;
  moneyLost: string;
  paymentMethod: string;
  incidentDate: string;
  suspiciousIdentifiers: string;
  narrative: string;

  // Step 2: Evidence
  evidenceFiles: File[];

  // Step 3: Potential connections
  identifiersToCheck: IncidentIdentifier[];
  matchesReviewed: boolean;

  // Step 4: Acknowledgments
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

  incidentType: "",
  encounterMethod: "",
  outcome: "",
  moneyLost: "",
  paymentMethod: "",
  incidentDate: "",
  suspiciousIdentifiers: "",
  narrative: "",

  evidenceFiles: [],

  identifiersToCheck: [],
  matchesReviewed: false,

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
    if (step < 1 || step > 4) return;

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
