import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runtimeRequire = createRequire(import.meta.url);

// Compile the actual server modules in memory, replacing only mocked boundaries.
export function loadTs(filename, mocks = {}, cache = new Map()) {
  filename = path.resolve(projectRoot, filename);
  if (cache.has(filename)) return cache.get(filename);
  const compiledModule = { exports: {} };
  cache.set(filename, compiledModule.exports);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const target = specifier.startsWith("@/")
        ? path.resolve(projectRoot, specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      return loadTs(`${target}.ts`, mocks, cache);
    }
    return runtimeRequire(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, compiledModule, compiledModule.exports);
  cache.set(filename, compiledModule.exports);
  return compiledModule.exports;
}
