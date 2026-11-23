import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(root, "..", "server", "vercel-bundle.mjs");

await esbuild.build({
  entryPoints: [path.join(root, "..", "server", "vercel-entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: outFile,
  packages: "external",
  banner: {
    js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
  },
});

console.log("bundled", outFile);
