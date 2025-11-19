import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["**/*.test.js"],
    setupFiles: ["./vitest.setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "build/**",
        "**/test/**",
        "**/*.test.js",
        "**/*.config.js",
        "scripts/**",
        "infra/**",
        "admin/**",
      ],
    },
  },
});
