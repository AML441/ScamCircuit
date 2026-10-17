"use client";

import { useIncidentForm } from "../IncidentFormContext";
import FormProgress from "../FormProgress";

import { contactOptions, messagingPlatforms, paymentApps } from "@/lib/report-options";
import { validateReport } from "@/lib/report-validation";
import { useState } from "react";

const fieldClass =
  "w-full rounded-lg text-gray-700 border border-gray-300 p-3 focus:border-blue-500 focus:outline-none";

export default function Step1GeneralInfo() {
  const { formState, updateForm, setCurrentStep } = useIncidentForm();
  const [error, setError] = useState<string | null>(null);

  function toggleContactMethod(value: string, checked: boolean) {
    updateForm({
      contactMethods: checked
        ? [...formState.contactMethods, value]
        : formState.contactMethods.filter((method) => method !== value),
      ...(value === "social-messaging" && !checked
        ? { messagingPlatforms: [], messagingUsernames: {}, otherMessagingPlatform: "" }
        : {}),
    });
  }

  function handleContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) return;

    const result = validateReport({ ...formState, accuracyConfirmed: true, privacyAcknowledged: true });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setCurrentStep(2);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Report an Incident
        </h2>
        <FormProgress />
        <p className="mt-1 text-sm text-gray-500">
          Tell us what happened. You can provide evidence in the next step.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleContinue}>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {/* Contact method checkboxes */}
        <fieldset>
        <legend className="mb-2 block font-medium text-gray-800">
            How were you contacted?
        </legend>

        <p className="mb-3 text-sm text-gray-500">
            Select all that apply. Additional fields will appear for each selection.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {contactOptions
            .map((option) => (
                <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                <input
                    type="checkbox"
                    name="contactMethods"
                    value={option.value}
                    checked={formState.contactMethods.includes(option.value)}
                    onChange={(e) =>
                    toggleContactMethod(option.value, e.target.checked)
                    }
                    className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-gray-900">
                    {option.label}
                </span>
                </label>
            ))}

        </div>

        {contactOptions
            .filter(
            (option) =>
                formState.contactMethods.includes(option.value)
            )
            .map((option) => (
            <div key={option.value} className="mt-4">
                {option.value === "social-messaging" && (
                  <fieldset className="mb-4 rounded-lg border border-gray-200 p-4">
                    <legend className="px-1 text-sm font-medium text-gray-800">
                      Which platforms were used?
                    </legend>
                    <p className="mb-3 text-sm text-gray-500">Select all that apply.</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {messagingPlatforms.map((platform) => (
                        <label key={platform.value} className="flex cursor-pointer items-center gap-3 text-sm text-gray-900">
                          <input
                            type="checkbox"
                            name="messagingPlatforms"
                            value={platform.value}
                            checked={formState.messagingPlatforms.includes(platform.value)}
                            onChange={(event) => updateForm({
                              messagingPlatforms: event.target.checked
                                ? [...formState.messagingPlatforms, platform.value]
                                : formState.messagingPlatforms.filter((value) => value !== platform.value),
                              ...(platform.value === "other" && !event.target.checked
                                ? { otherMessagingPlatform: "" }
                                : {}),
                            })}
                            className="h-4 w-4 accent-blue-600"
                          />
                          {platform.label}
                        </label>
                      ))}
                    </div>
                    {formState.messagingPlatforms.includes("other") && (
                      <div className="mt-4">
                        <label htmlFor="otherMessagingPlatform" className="mb-2 block text-sm font-medium text-gray-800">
                          Please specify the other platform or app
                        </label>
                        <input
                          id="otherMessagingPlatform"
                          name="otherMessagingPlatform"
                          required
                          type="text"
                          value={formState.otherMessagingPlatform}
                          onChange={(event) => updateForm({ otherMessagingPlatform: event.target.value })}
                          placeholder="Enter the platform or app name"
                          className={fieldClass}
                        />
                      </div>
                    )}
                    {messagingPlatforms.filter((platform) => formState.messagingPlatforms.includes(platform.value)).map((platform) => (
                      <div key={platform.value} className="mt-4">
                        <label htmlFor={`usernames-${platform.value}`} className="mb-2 block text-sm font-medium text-gray-800">
                          Usernames or account identifiers for {platform.value === "other" ? formState.otherMessagingPlatform || "the other app" : platform.label}
                        </label>
                        <input
                          id={`usernames-${platform.value}`}
                          name={`usernames-${platform.value}`}
                          type="text"
                          required
                          maxLength={2000}
                          value={formState.messagingUsernames[platform.value] || ""}
                          onChange={(event) => updateForm({
                            messagingUsernames: { ...formState.messagingUsernames, [platform.value]: event.target.value },
                          })}
                          aria-describedby={`usernames-help-${platform.value}`}
                          placeholder="e.g. @username1, @username2"
                          className={fieldClass}
                        />
                        <p id={`usernames-help-${platform.value}`} className="mt-1 text-sm text-gray-600">
                          Separate multiple usernames or phone numbers with commas.
                        </p>
                      </div>
                    ))}
                  </fieldset>
                )}
                {option.value !== "social-messaging" && <>
                <label
                htmlFor={`contact-detail-${option.value}`}
                className="mb-2 block text-sm font-medium text-gray-800"
                >
                {option.value === "other"
                    ? "Please describe the other contact method"
                    : `Provide details for ${option.label.toLowerCase()}`}
                </label>

                <input
                id={`contact-detail-${option.value}`}
                name={`contact-detail-${option.value}`}
                required
                type="text"
                value={formState.contactMethodDetails[option.value as keyof typeof formState.contactMethodDetails]}
                onChange={(e) =>
                    updateForm({
                    contactMethodDetails: {
                        ...formState.contactMethodDetails,
                        [option.value]: e.target.value,
                    },
                    })
                }
                placeholder={
                    option.value === "website"
                    ? "Enter the website URL"
                        : option.value === "email"
                            ? "Enter the email address"
                            : option.value === "phone"
                            ? "Enter the phone number"
                            : "Describe the contact method"
                }
                className={fieldClass}
                />
                </>}
            </div>
            ))}
        </fieldset>

        {/* Payment method dropdown */}
        <div>
          <label
            htmlFor="paymentMethod"
            className="mb-2 block font-medium text-gray-800"
          >
            How was the money sent?
          </label>

          <select
            id="paymentMethod"
            name="paymentMethod"
            required
            value={formState.paymentMethod}
            onChange={(e) => {
              updateForm({ paymentMethod: e.target.value });

              if (e.target.value !== "other") {
                updateForm({ otherPaymentMethod: "" });
              }
              if (e.target.value !== "payment-app") {
                updateForm({ paymentApp: "", otherPaymentApp: "" });
              }
            }}
            className={fieldClass}
          >
            <option value="">Select a payment method</option>
            <option value="bank-transfer">Bank transfer or wire</option>
            <option value="payment-app">Payment app</option>
            <option value="credit-card">Credit card</option>
            <option value="debit-card">Debit card</option>
            <option value="crypto">Cryptocurrency</option>
            <option value="gift-card">Gift card</option>
            <option value="cash-check">Cash or check</option>
            <option value="other">Other</option>
          </select>

          {formState.paymentMethod === "payment-app" && (
            <div className="mt-3">
              <label htmlFor="paymentApp" className="mb-2 block text-sm font-medium text-gray-800">
                Which payment app was used?
              </label>
              <select
                id="paymentApp"
                name="paymentApp"
                required
                value={formState.paymentApp}
                onChange={(event) => updateForm({
                  paymentApp: event.target.value,
                  ...(event.target.value !== "other" ? { otherPaymentApp: "" } : {}),
                })}
                className={fieldClass}
              >
                <option value="">Select a payment app</option>
                {paymentApps.map((app) => (
                  <option key={app.value} value={app.value}>{app.label}</option>
                ))}
              </select>
              {formState.paymentApp === "other" && (
                <div className="mt-3">
                  <label htmlFor="otherPaymentApp" className="mb-2 block text-sm font-medium text-gray-800">
                    Please specify the payment app
                  </label>
                  <input
                    id="otherPaymentApp"
                    name="otherPaymentApp"
                    required
                    type="text"
                    value={formState.otherPaymentApp}
                    onChange={(event) => updateForm({ otherPaymentApp: event.target.value })}
                    placeholder="Enter the payment app name"
                    className={fieldClass}
                  />
                </div>
              )}
            </div>
          )}

          {formState.paymentMethod === "other" && (
            <div className="mt-3">
              <label
                htmlFor="otherPaymentMethod"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Please specify the payment method
              </label>
              <input
                id="otherPaymentMethod"
                name="otherPaymentMethod"
                required
                type="text"
                value={formState.otherPaymentMethod}
                onChange={(e) =>
                  updateForm({ otherPaymentMethod: e.target.value })
                }
                placeholder="Describe the payment method"
                className={fieldClass}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="paymentHandle" className="mb-2 block font-medium text-gray-800">
            Payment handle (optional)
          </label>
          <input
            id="paymentHandle"
            name="paymentHandle"
            type="text"
            value={formState.paymentHandle}
            onChange={(event) => updateForm({ paymentHandle: event.target.value })}
            placeholder="e.g. bank address, PayPal username, or wallet address"
            className={fieldClass}
          />
        </div>

        <div>
            <label
                htmlFor="amountLost"
                className="mb-2 block font-medium text-gray-800"
            >
                How much money was lost? (optional)
            </label>

            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800">
                $
                </span>
                <input
                id="amountLost"
                name="amountLost"
                type="number"
                min="0"
                step="0.01"
                value={formState.amountLost}
                onChange={(e) =>
                    updateForm({ amountLost: e.target.value })
                }
                placeholder="0.00"
                className={`${fieldClass} pl-8`}
                />
            </div>

            <p className="mt-1 text-sm text-gray-800">
                Enter the total amount lost in USD. Leave blank if unknown or not applicable.
            </p>
            </div>

        {/* Incident date */}
        <div>
          <label
            htmlFor="incidentDate"
            className="mb-2 block font-medium text-gray-800"
          >
            When did the incident occur?
          </label>
          <input
            id="incidentDate"
            name="incidentDate"
            required
            type="date"
            value={formState.incidentDate}
            onChange={(e) =>
              updateForm({ incidentDate: e.target.value })
            }
            className={fieldClass}
          />
        </div>

        {/* Incident description */}
        <div>
          <label
            htmlFor="narrative"
            className="mb-2 block font-medium text-gray-800"
          >
            Please describe what happened
          </label>
          <textarea
            id="narrative"
            name="narrative"
            required
            rows={5}
            value={formState.narrative}
            onChange={(e) =>
              updateForm({ narrative: e.target.value })
            }
            placeholder="Describe how it started, what you were told or asked to do, and what happened next..."
            className={fieldClass}
          />
          <p className="mt-1 text-sm text-gray-800">
            Do not include passwords, authentication codes, full card numbers,
            or private keys.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-end border-t border-gray-200 pt-4">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Continue to Evidence Upload →
          </button>
        </div>
      </form>
    </div>
  );
}
