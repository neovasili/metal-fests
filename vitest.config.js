import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["**/*.test.js"],
    setupFiles: ["./vitest.setup.js"],
    watch: false,
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["js/**/*.js", "admin/js/**/*.js"],
      exclude: [
        "node_modules/**",
        "build/**",
        "**/test/**",
        "**/*.test.js",
        "**/*.config.js",
        "**/*.setup.js",
        "scripts/**",
        "infra/**",
        "js/error.js",
        "js/map.js",
      ],
    },
  },
});
