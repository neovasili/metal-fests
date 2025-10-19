// ESLint v9+ Flat Configuration
import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        L: "readonly",
        UIUtils: "readonly",
        FavoritesManager: "readonly",
        FilterManager: "readonly",
        BandsFilterManager: "readonly",
        HeaderManager: "readonly",
        FestivalTimeline: "readonly",
        FestivalMap: "readonly",
        Router: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      indent: ["error", 2],
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "no-undef": ["off", { typeof: true }],
      "no-unused-vars": ["off", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "space-before-function-paren": ["error", "never"],
      "comma-dangle": ["error", "never"],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "max-len": ["error", { code: 120, ignoreUrls: true, ignoreStrings: true }],
    },
  },
  {
    ignores: ["node_modules/", "build/", "*.min.js", "infra/cdk.out/**"],
  },
  eslintPluginPrettierRecommended,
];
