import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { cli: "src/cli.ts" },
    format: "esm",
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node20",
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: { bridge: "src/bridge.ts" },
    format: "esm",
    dts: true,
    sourcemap: true,
    target: "node20",
  },
]);
