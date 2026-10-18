import { createServer } from "node:http";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { createHandler } from "./handler.mjs";

export function createSimulatorServer(options = {}) {
  const handle = createHandler(options);
  return createServer(async (incoming, outgoing) => {
    try {
      const headers = new Headers();
      for (let index = 0; index < incoming.rawHeaders.length; index += 2) headers.append(incoming.rawHeaders[index], incoming.rawHeaders[index + 1]);
      const request = new Request(new URL(incoming.url || "/", "http://localhost"), {
        method: incoming.method, headers,
        ...(!["GET", "HEAD"].includes(incoming.method) ? { body: Readable.toWeb(incoming), duplex: "half" } : {}),
      });
      const response = await handle(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!outgoing.headersSent) outgoing.writeHead(500, { "Content-Type": "application/json" });
      outgoing.end(JSON.stringify({ error: "The simulator could not complete this request." }));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
  const server = createSimulatorServer({ lookupBaseUrl: process.env.SCAMCIRCUIT_API_URL || "http://127.0.0.1:3000" });
  server.on("error", (error) => {
    console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use. Choose another PORT.` : `Could not start simulator (${error.code || "UNKNOWN"}).`);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => console.log(`Payment simulator: http://localhost:${port}\nScamCircuit lookup: ${process.env.SCAMCIRCUIT_API_URL || "http://127.0.0.1:3000"}`));
  const stop = () => server.close(() => { process.exitCode = 0; });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
