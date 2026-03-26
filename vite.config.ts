import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    lib: {
      entry: "packages/editor/src/index.ts",
      formats: ["es"],
      fileName: "jano",
    },
    rollupOptions: {
      external: [/^node:/],
    },
    target: "node22",
    ssr: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignore: ["packages/test-large.yml", "packages/test.*"],
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ["packages/test-large.yml", "packages/test.*"],
  },
});
