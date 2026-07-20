import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  let base;
  if (specifier.startsWith("@/")) {
    base = fileURLToPath(new URL(`../../src/${specifier.slice(2)}`, import.meta.url));
  } else if (specifier.startsWith(".") && context.parentURL) {
    base = fileURLToPath(new URL(specifier, context.parentURL));
  } else {
    return nextResolve(specifier, context);
  }
  const candidates = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  const match = candidates.find(existsSync);
  if (!match) return nextResolve(specifier, context);
  return { url: pathToFileURL(match).href, shortCircuit: true };
}
