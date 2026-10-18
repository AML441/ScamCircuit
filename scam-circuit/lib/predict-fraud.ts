import { execFile } from "node:child_process";
import { join } from "node:path";
import { parseRecipientLookupPayload } from "./find-reported-recipients";

const MODEL_FIELDS = [
  "transaction_amount", "hour_of_day", "is_weekend", "num_items", "customer_age",
  "prev_transactions", "distance_from_home", "device_type", "network_quality",
  "is_first_transaction", "store_type", "velocity_score",
] as const;

export class ModelInputError extends Error {}

export interface FraudPrediction {
  fraud_probability: number;
  is_fraud: boolean;
  top_factors: Record<string, number>;
}

export function validatePrediction(value: unknown): value is FraudPrediction {
  if (!value || typeof value !== "object") return false;
  const prediction = value as FraudPrediction;
  return Number.isFinite(prediction.fraud_probability) && prediction.fraud_probability >= 0
    && prediction.fraud_probability <= 1 && typeof prediction.is_fraud === "boolean"
    && !!prediction.top_factors && typeof prediction.top_factors === "object"
    && !Array.isArray(prediction.top_factors)
    && Object.values(prediction.top_factors).every((factor) => typeof factor === "number" && Number.isFinite(factor));
}

export async function predictFraud(payload: unknown): Promise<FraudPrediction> {
  const transaction = parseRecipientLookupPayload(payload);
  const record: Record<string, number | null> = {};
  for (const field of MODEL_FIELDS) {
    const value = transaction[field];
    if (value === undefined) throw new ModelInputError(`Provide ${field} for the fraud model (use null if unknown).`);
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new ModelInputError(`${field} must be a finite number or null. Use the training category code for device_type and store_type.`);
    }
    record[field] = value;
  }
  const modelDir = join(process.cwd(), "app", "data-analysis");
  const python = process.env.FRAUD_MODEL_PYTHON || join(modelDir, ".venv", "bin", "python");
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = execFile(python, [join(modelDir, "predict.py"), "--stdin"], {
      timeout: 10000, maxBuffer: 64 * 1024,
    }, (error, output, stderr) => {
      // Python reserves stdout for JSON and stderr for debug output/tracebacks.
      if (stderr.trim()) console.error("Fraud model:", stderr.trim());
      if (error) reject(new Error("Fraud model unavailable. Check the Python environment and dependencies."));
      else resolve(output);
    });
    child.stdin?.on("error", () => {});
    child.stdin?.end(JSON.stringify(record));
  });
  const prediction: unknown = JSON.parse(stdout);
  if (!validatePrediction(prediction)) throw new Error("Invalid fraud model response.");
  return prediction;
}
