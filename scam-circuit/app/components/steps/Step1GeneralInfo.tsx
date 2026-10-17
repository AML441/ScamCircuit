"use client";

import { useIncidentForm } from "../IncidentFormContext";
import FormProgress from "../FormProgress";

export const contactOptions = [
  { value: "website", label: "Website or online marketplace" },
  { value: "social-media", label: "Social media" },
  { value: "text", label: "Text or messaging app" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "in-person", label: "In person" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Not sure" },
];

const fieldClass =
  "w-full rounded-lg text-gray-700 border border-gray-300 p-3 focus:border-blue-500 focus:outline-none";

export default function Step1GeneralInfo() {
  const { formState, updateForm, setCurrentStep } = useIncidentForm();

  function toggleContactMethod(value: string, checked: boolean) {
    let updated: string[];

    if (value === "unknown" && checked) {
      updated = ["unknown"];
    } else if (checked) {
      updated = [
        ...formState.contactMethods.filter(
          (method) => method !== "unknown"
        ),
        value,
      ];
    } else {
      updated = formState.contactMethods.filter(
        (method) => method !== value
      );
    }

    updateForm({ contactMethods: updated });

    if (!updated.includes("other")) {
      updateForm({ otherContactMethod: "" });
    }
  }

  function handleContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) return;

    setCurrentStep(2);
  }

  return (
    <div className="mx-auto w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
            .filter((option) => option.value !== "unknown")
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

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
            <input
                type="checkbox"
                name="contactMethods"
                value="unknown"
                checked={formState.contactMethods.includes("unknown")}
                onChange={(e) =>
                toggleContactMethod("unknown", e.target.checked)
                }
                className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">Not sure</span>
            </label>
        </div>

        {contactOptions
            .filter(
            (option) =>
                option.value !== "unknown" &&
                formState.contactMethods.includes(option.value)
            )
            .map((option) => (
            <div key={option.value} className="mt-4">
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
                    : option.value === "social-media"
                        ? "Enter the platform or username"
                        : option.value === "text"
                        ? "Enter the messaging app or relevant details"
                        : option.value === "email"
                            ? "Enter the email address"
                            : option.value === "phone"
                            ? "Enter the phone number"
                            : option.value === "in-person"
                                ? "Describe where you met"
                                : "Describe the contact method"
                }
                className={fieldClass}
                />
            </div>
            ))}
        </fieldset>

        {/* Payment method dropdown */}
        <div>
          <label
            htmlFor="paymentMethod"
            className="mb-2 block font-medium text-gray-800"
          >
            How was the money sent? (if applicable)
          </label>

          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formState.paymentMethod}
            onChange={(e) => {
              updateForm({ paymentMethod: e.target.value });

              if (e.target.value !== "other") {
                updateForm({ otherPaymentMethod: "" });
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
            <option value="unknown">Not sure</option>
          </select>

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
            <label
                htmlFor="amountLost"
                className="mb-2 block font-medium text-gray-800"
            >
                How much money was lost? 
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
