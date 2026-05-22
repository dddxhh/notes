import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat();

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...compat.extends("plugin:react-hooks/recommended"),
  prettier,
  {
    files: ["packages/web/**/*.{ts,tsx}"],
  },
  {
    ignores: ["**/*.d.ts"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
);
