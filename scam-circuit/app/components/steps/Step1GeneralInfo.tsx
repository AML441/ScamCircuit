"use client";

export default function Step1GeneralInfo() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Report an Incident
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Step 1 of 4 — Incident Information
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Tell us what happened. You can provide evidence in the next step.
        </p>
      </div>

      <form className="space-y-6">
        {/* Incident type */}
        <div>
          <label
            htmlFor="incidentType"
            className="mb-2 block font-medium text-gray-800"
          >
            What type of incident occurred?
          </label>
          <select
            id="incidentType"
            name="incidentType"
            required
            defaultValue=""
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          >
            <option value="" disabled>
              Select an incident type
            </option>
            <option value="online-shopping">
              Online shopping or marketplace scam
            </option>
            <option value="impersonation">Impersonation scam</option>
            <option value="job">Fake job or employment offer</option>
            <option value="investment">
              Investment or cryptocurrency scam
            </option>
            <option value="romance">Romance scam</option>
            <option value="tech-support">Tech support scam</option>
            <option value="banking">Banking or payment scam</option>
            <option value="identity-theft">Identity theft</option>
            <option value="other">Other</option>
            <option value="unsure">I'm not sure</option>
          </select>
        </div>

        {/* How encountered */}
        <div>
          <label
            htmlFor="contactMethod"
            className="mb-2 block font-medium text-gray-800"
          >
            How did you first encounter this incident?
          </label>
          <select
            id="contactMethod"
            name="contactMethod"
            required
            defaultValue=""
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          >
            <option value="" disabled>
              Select how you encountered it
            </option>
            <option value="website">Website or online marketplace</option>
            <option value="social-media">Social media</option>
            <option value="text">Text or messaging app</option>
            <option value="email">Email</option>
            <option value="phone">Phone call</option>
            <option value="in-person">In person</option>
            <option value="other">Other</option>
            <option value="unknown">Not sure</option>
          </select>
        </div>

        {/* Outcome */}
        <fieldset>
          <legend className="mb-3 font-medium text-gray-800">
            What happened as a result?
          </legend>
          <div className="space-y-3">
            {[
              ["money-lost", "I lost money"],
              [
                "information-exposed",
                "My personal or account information was exposed",
              ],
              [
                "attempted",
                "Someone attempted to scam me, but I prevented it",
              ],
              ["other-harm", "I experienced another type of harm"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="outcome"
                  value={value}
                  required
                  className="mt-1"
                />
                <span className="text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Financial loss */}
        <div>
          <label
            htmlFor="amountLost"
            className="mb-2 block font-medium text-gray-800"
          >
            Approximately how much money was lost? (if applicable)
          </label>
          <div className="flex gap-3">
            <select
              id="currency"
              name="currency"
              aria-label="Currency"
              defaultValue="USD"
              className="rounded-lg border border-gray-300 p-3"
            >
              <option value="USD">USD ($)</option>
              <option value="CAD">CAD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="other">Other</option>
            </select>
            <input
              id="amountLost"
              name="amountLost"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 250.00"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Payment method */}
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
            defaultValue=""
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
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
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            An approximate date is fine.
          </p>
        </div>

        {/* Suspect identifiers */}
        <div>
          <label
            htmlFor="suspectIdentifier"
            className="mb-2 block font-medium text-gray-800"
          >
            Do you have any information about the person or account involved?
          </label>
          <p className="mb-2 text-sm text-gray-500">
            Include any known usernames, phone numbers, email addresses,
            websites, or payment handles.
          </p>
          <textarea
            id="suspectIdentifier"
            name="suspectIdentifier"
            rows={3}
            placeholder="e.g. username, phone number, website URL..."
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Incident description */}
        <div>
          <label
            htmlFor="description"
            className="mb-2 block font-medium text-gray-800"
          >
            Please describe what happened
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            placeholder="Describe how it started, what you were told or asked to do, and what happened next..."
            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            Do not include passwords, authentication codes, full card numbers,
            or private keys.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-end border-t border-gray-200 pt-4">
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
            onClick={() => {
              alert("Connect this button to Step 2: Evidence Upload.");
            }}
          >
            Continue to Evidence Upload →
          </button>
        </div>
      </form>
    </div>
  );
}