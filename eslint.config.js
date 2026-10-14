import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["node_modules", ".next", "data", "public", "drizzle"]
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "scripts/**/*.ts", "tests/**/*.ts"],
    languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: "module" },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
];
