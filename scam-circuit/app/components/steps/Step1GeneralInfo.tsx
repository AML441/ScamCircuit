"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useIncidentForm } from "../IncidentFormContext";
import { ErrorNotice, Field, FormSection, Icon, StepHeading } from "../FormUI";
import type { IconName } from "../FormUI";
import { contactOptions, messagingPlatforms, paymentApps, paymentMethodOptions } from "@/lib/report-options";
import { validateReport } from "@/lib/report-validation";

const contactIcons: Record<string, IconName> = { website: "globe", "social-messaging": "message", email: "mail", phone: "phone", other: "more" };
const contactLabels: Record<string, string> = { website: "Website or marketplace", "social-messaging": "Social media or messaging", email: "Email", phone: "Phone call", other: "Other" };
const contactHints: Record<string, string> = { website: "The site or listing you visited", "social-messaging": "An app, social account, or text", email: "An email you received", phone: "A call from a phone number", other: "Another way of getting in touch" };
const detailLabels: Record<string, string> = { website: "Website or listing URL", email: "Sender’s email address", phone: "Phone number", other: "Other contact details" };
const placeholders: Record<string, string> = { website: "https://example.com", email: "name@example.com", phone: "+1 (555) 000-0000", other: "Describe how you were contacted" };

export default function Step1GeneralInfo() {
  const { formState, updateForm, setCurrentStep } = useIncidentForm();
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateReport({ ...formState, accuracyConfirmed: true, privacyAcknowledged: true });
    if (!result.ok) {
      setError(result.error);
      requestAnimationFrame(() => { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: "center" }); });
      return;
    }
    setError(null);
    setCurrentStep(2);
  }

  function toggleContactMethod(value: string, checked: boolean) {
    updateForm({
      contactMethods: checked ? [...formState.contactMethods, value] : formState.contactMethods.filter((method) => method !== value),
      ...(value === "social-messaging" && !checked ? { messagingPlatforms: [], messagingUsernames: {}, otherMessagingPlatform: "" } : {}),
    });
  }

  return (
    <div className="step-view">
      <StepHeading step="STEP 01 / INCIDENT DETAILS" title="Let’s start with what happened." description="Share the details you know. We’ll walk you through the rest." />
      <form className="form-card" onSubmit={handleContinue}>
        {error && <div className="form-error" ref={errorRef} tabIndex={-1}><ErrorNotice message={error} /></div>}
        <FormSection number="01" id="contact-heading" title="How were you contacted?" description="Select all that apply. You can choose more than one.">
          <fieldset className="contact-fieldset">
            <legend className="sr-only">Contact methods</legend>
            <div className="contact-grid">
              {contactOptions.map((option) => (
                <label key={option.value} className={`contact-option ${formState.contactMethods.includes(option.value) ? "is-selected" : ""}`}>
                  <span className="contact-option-icon"><Icon name={contactIcons[option.value]} /></span>
                  <span className="contact-option-copy"><span className="contact-option-name">{contactLabels[option.value]}</span><span className="contact-option-hint">{contactHints[option.value]}</span></span>
                  <input type="checkbox" name="contactMethods" value={option.value} checked={formState.contactMethods.includes(option.value)} onChange={(event) => toggleContactMethod(option.value, event.target.checked)} className="option-checkbox" />
                </label>
              ))}
            </div>
          </fieldset>

          {contactOptions.filter((option) => formState.contactMethods.includes(option.value)).map((option) => (
            <div key={option.value} className="conditional-panel">
              {option.value === "social-messaging" ? (
                <fieldset>
                  <legend className="field-label">Which platforms were used?</legend>
                  <p className="field-hint platform-hint">Select all that apply.</p>
                  <div className="platform-options">
                    {messagingPlatforms.map((platform) => (
                      <label key={platform.value} className={`platform-chip ${formState.messagingPlatforms.includes(platform.value) ? "is-selected" : ""}`}>
                        <input type="checkbox" name="messagingPlatforms" value={platform.value} checked={formState.messagingPlatforms.includes(platform.value)} onChange={(event) => updateForm({
                          messagingPlatforms: event.target.checked ? [...formState.messagingPlatforms, platform.value] : formState.messagingPlatforms.filter((value) => value !== platform.value),
                          ...(platform.value === "other" && !event.target.checked ? { otherMessagingPlatform: "" } : {}),
                        })} className="option-checkbox" />
                        {platform.label}
                      </label>
                    ))}
                  </div>
                  <div className="conditional-fields">
                    {formState.messagingPlatforms.includes("other") && (
                      <Field id="otherMessagingPlatform" label="Other platform or app">
                        <input id="otherMessagingPlatform" name="otherMessagingPlatform" type="text" required maxLength={200} value={formState.otherMessagingPlatform} onChange={(event) => updateForm({ otherMessagingPlatform: event.target.value })} placeholder="Enter the platform or app name" className="form-control" />
                      </Field>
                    )}
                    {messagingPlatforms.filter((platform) => formState.messagingPlatforms.includes(platform.value)).map((platform) => (
                      <Field key={platform.value} id={`usernames-${platform.value}`} label={`${platform.value === "other" ? formState.otherMessagingPlatform || "Other app" : platform.label} usernames or account identifiers`} hint="Separate multiple usernames or phone numbers with commas.">
                        <input id={`usernames-${platform.value}`} name={`usernames-${platform.value}`} type="text" required maxLength={2000} value={formState.messagingUsernames[platform.value] || ""} onChange={(event) => updateForm({ messagingUsernames: { ...formState.messagingUsernames, [platform.value]: event.target.value } })} aria-describedby={`usernames-${platform.value}-hint`} placeholder="@username1, @username2" className="form-control" />
                      </Field>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <Field id={`contact-detail-${option.value}`} label={detailLabels[option.value]}>
                  <input id={`contact-detail-${option.value}`} name={`contact-detail-${option.value}`} type="text" inputMode={option.value === "phone" ? "tel" : option.value === "email" ? "email" : option.value === "website" ? "url" : "text"} required maxLength={2000} value={formState.contactMethodDetails[option.value as keyof typeof formState.contactMethodDetails]} onChange={(event) => updateForm({ contactMethodDetails: { ...formState.contactMethodDetails, [option.value]: event.target.value } })} placeholder={placeholders[option.value]} className="form-control" />
                </Field>
              )}
            </div>
          ))}
        </FormSection>

        <FormSection number="02" id="payment-heading" title="Payment details" description="Tell us how the payment was made, if money was involved.">
          <Field id="paymentMethod" label="How was the money sent?">
            <div className="select-wrap">
              <select id="paymentMethod" name="paymentMethod" required className="form-control" value={formState.paymentMethod} onChange={(event) => updateForm({
                paymentMethod: event.target.value,
                ...(event.target.value !== "other" ? { otherPaymentMethod: "" } : {}),
                ...(event.target.value !== "payment-app" ? { paymentApp: "", otherPaymentApp: "" } : {}),
              })}>
                <option value="">Select a payment method</option>
                {paymentMethodOptions.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
              </select>
              <Icon name="chevron" />
            </div>
          </Field>

          {formState.paymentMethod === "payment-app" && (
            <div className="conditional-panel">
              <Field id="paymentApp" label="Which payment app was used?">
                <div className="select-wrap">
                  <select id="paymentApp" name="paymentApp" required className="form-control" value={formState.paymentApp} onChange={(event) => updateForm({ paymentApp: event.target.value, ...(event.target.value !== "other" ? { otherPaymentApp: "" } : {}) })}>
                    <option value="">Select a payment app</option>
                    {paymentApps.map((app) => <option key={app.value} value={app.value}>{app.label}</option>)}
                  </select><Icon name="chevron" />
                </div>
              </Field>
              {formState.paymentApp === "other" && <Field id="otherPaymentApp" label="Other payment app"><input id="otherPaymentApp" name="otherPaymentApp" type="text" required maxLength={200} value={formState.otherPaymentApp} onChange={(event) => updateForm({ otherPaymentApp: event.target.value })} placeholder="Enter the payment app name" className="form-control" /></Field>}
            </div>
          )}
          {formState.paymentMethod === "other" && <Field id="otherPaymentMethod" label="Other payment method"><input id="otherPaymentMethod" name="otherPaymentMethod" type="text" required maxLength={200} value={formState.otherPaymentMethod} onChange={(event) => updateForm({ otherPaymentMethod: event.target.value })} placeholder="Describe the payment method" className="form-control" /></Field>}

          <Field id="paymentHandle" label="Payment handle" optional hint="A bank address, payment username, or cryptocurrency wallet address.">
            <input id="paymentHandle" name="paymentHandle" type="text" maxLength={2000} value={formState.paymentHandle} onChange={(event) => updateForm({ paymentHandle: event.target.value })} placeholder="Enter a handle or address" className="form-control" aria-describedby="paymentHandle-hint" />
          </Field>
          <div className="half-width">
            <Field id="amountLost" label="How much money was lost?" optional hint="Leave blank if unknown or not applicable.">
              <div className="amount-input"><span className="currency-symbol">$</span><input id="amountLost" name="amountLost" type="number" inputMode="decimal" min="0" step="0.01" value={formState.amountLost} onChange={(event) => updateForm({ amountLost: event.target.value })} placeholder="0.00" className="form-control" aria-describedby="amountLost-hint" /><span className="currency-code">USD</span></div>
            </Field>
          </div>
        </FormSection>

        <FormSection number="03" id="story-heading" title="Your experience" description="Add a date and describe the incident in your own words.">
          <div className="half-width"><Field id="incidentDate" label="When did the incident occur?"><input id="incidentDate" name="incidentDate" type="date" required value={formState.incidentDate} onChange={(event) => updateForm({ incidentDate: event.target.value })} className="form-control" /></Field></div>
          <Field id="narrative" label="What happened?" hint="Do not include passwords, authentication codes, full card numbers, or private keys.">
            <textarea id="narrative" name="narrative" required rows={6} maxLength={20000} value={formState.narrative} onChange={(event) => updateForm({ narrative: event.target.value })} placeholder="How did it start? What were you told or asked to do? What happened next?" className="form-control narrative-input" aria-describedby="narrative-hint" />
          </Field>
        </FormSection>

        <div className="form-actions"><span className="next-step-note">Next: supporting evidence</span><button type="submit" className="button button-primary">Continue to evidence<Icon name="arrowRight" /></button></div>
      </form>
    </div>
  );
}
