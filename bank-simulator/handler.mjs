import { validateTransactionCheck } from "./public/transaction.mjs";
import { readFile } from "node:fs/promises";

const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.mjs", ["app.mjs", "text/javascript; charset=utf-8"]],
  ["/transaction.mjs", ["transaction.mjs", "text/javascript; charset=utf-8"]],
]);
const MAX_BODY_BYTES = 64 * 1024;
const jsonHeaders = { "Cache-Control": "no-store" };

export function createHandler({ lookupBaseUrl = "http://127.0.0.1:3000", fetchImpl = fetch } = {}) {
  const lookupUrl = new URL("/api/reports/check-recipient", lookupBaseUrl);
  if (!["http:", "https:"].includes(lookupUrl.protocol)) throw new Error("SCAMCIRCUIT_API_URL must be an HTTP or HTTPS URL.");

  return async function handle(request) {
    const url = new URL(request.url);
    if (["/api/check-recipient", "/api/check-transaction"].includes(url.pathname)) {
      const transactionCheck = url.pathname === "/api/check-transaction";
      if (request.method !== "POST") return Response.json({ error: "Use POST to check a transaction." }, { status: 405, headers: { ...jsonHeaders, Allow: "POST" } });
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return Response.json({ error: "Send a JSON transaction." }, { status: 415, headers: jsonHeaders });
      if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return Response.json({ error: "The transaction is too large." }, { status: 413, headers: jsonHeaders });
      let payload;
      try {
        const reader = request.body?.getReader();
        if (!reader) throw new Error("Missing body");
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BODY_BYTES) {
              await reader.cancel();
              return Response.json({ error: "The transaction is too large." }, { status: 413, headers: jsonHeaders });
            }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!payload || Array.isArray(payload) || typeof payload !== "object") throw new Error("Invalid transaction");
        if (typeof payload.payment_handle !== "string" || !payload.payment_handle.trim()) return Response.json({ error: "A recipient payment handle is required." }, { status: 400, headers: jsonHeaders });
      } catch {
        return Response.json({ error: "Provide a valid transaction object." }, { status: 400, headers: jsonHeaders });
      }

      try {
        const upstream = await fetchImpl(transactionCheck ? new URL("/api/transactions/check", lookupBaseUrl) : lookupUrl, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(25000),
        });
        let result;
        try { result = await upstream.json(); } catch {
          return Response.json({ error: "ScamCircuit returned an unreadable response. Check that the reporting app is running on the configured port." }, { status: 502, headers: jsonHeaders });
        }
        if (!upstream.ok) return Response.json({ error: typeof result?.error === "string" ? result.error : "The recipient lookup failed. Please retry." }, { status: upstream.status, headers: jsonHeaders });
        if (transactionCheck) {
          if (!validateTransactionCheck(result)) return Response.json({ error: "ScamCircuit returned an invalid transaction decision. The payment was not completed." }, { status: 502, headers: jsonHeaders });
          return Response.json(result, { headers: jsonHeaders });
        }
        if (!Array.isArray(result) || result.some((row) => !row || typeof row !== "object" || Array.isArray(row) || !Number.isInteger(row.match_count) || row.match_count < 1 || row.match_count > 3)) {
          return Response.json({ error: "ScamCircuit returned an unexpected result. The payment check could not be completed." }, { status: 502, headers: jsonHeaders });
        }
        return Response.json(result, { headers: jsonHeaders });
      } catch {
        return Response.json({ error: "ScamCircuit could not be reached. Make sure the reporting app is running on port 3000, then try again." }, { status: 502, headers: jsonHeaders });
      }
    }

    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    const asset = staticFiles.get(url.pathname);
    if (!asset) return new Response("Not found", { status: 404 });
    const [filename, contentType] = asset;
    const body = request.method === "HEAD" ? null : await readFile(new URL(`./public/${filename}`, import.meta.url));
    return new Response(body, { headers: { "Content-Type": contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  };
}
