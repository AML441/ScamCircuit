"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useIncidentForm } from "./IncidentFormContext";
import FormProgress from "./FormProgress";
import { Icon } from "./FormUI";
import Step1GeneralInfo from "./steps/Step1GeneralInfo";
import Step2EvidenceUpload from "./steps/Step2EvidenceUpload";
import Step3Review from "./steps/Step3ReviewSubmit";

export default function IncidentForm() {
  const { formState } = useIncidentForm();
  const contentRef = useRef<HTMLElement>(null);
  const previousStep = useRef(formState.currentStep);

  useEffect(() => {
    if (previousStep.current !== formState.currentStep) {
      contentRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
      previousStep.current = formState.currentStep;
    }
  }, [formState.currentStep]);

  return (
    <div className="report-app">
      <a className="skip-link" href="#report-form">Skip to form</a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="ScamCircuit home"><span className="brand-mark"><Icon name="circuit" /></span>Scam<span className="brand-light">Circuit</span><span className="brand-period">.</span></Link>
          <span className="header-divider" /><span className="header-caption">A little clarity goes a long way.</span>
          <span className="header-badge"><span className="status-dot" />Incident reporting</span>
        </div>
      </header>
      <div className="report-layout">
        <aside className="report-sidebar">
          <div className="sidebar-sticky">
            <FormProgress />
            <div className="sidebar-guidance">
              <span className="guidance-icon"><Icon name="file" /></span>
              <h2>The details make a difference.</h2>
              <p>Take it one step at a time. Links, usernames, and payment details help tell the full story.</p>
              <div className="guidance-footnote"><Icon name="info" /><span>You can review everything before submitting.</span></div>
            </div>
            <p className="sidebar-footnote">Your report is submitted only after your final confirmation.</p>
          </div>
        </aside>
        <main id="report-form" className="report-content" ref={contentRef} tabIndex={-1}>
          {formState.currentStep === 1 ? <Step1GeneralInfo /> : formState.currentStep === 2 ? <Step2EvidenceUpload /> : <Step3Review />}
        </main>
      </div>
      <footer className="site-footer"><span>ScamCircuit</span><span>A clearer picture. One report at a time.</span></footer>
    </div>
  );
}
