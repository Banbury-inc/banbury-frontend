const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const reactPlugin = require("eslint-plugin-react");
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      // Build and distribution directories
      "**/dist/**/*",
      "**/build/**",
      "**/node_modules/**",
      "**/dependency/**",
      // Specific files to ignore
      "**/src/renderer/components/common/upload_progress/upload_progress.tsx",
      "**/src/tests/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        // Node.js globals
        process: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react": reactPlugin,
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      // React rules
      "react/react-in-jsx-scope": 0,
      "react/display-name": 0,
      "react/prop-types": 0,

      // TypeScript rules
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-console": ["error", {
        allow: ["warn", "error", "info"]
      }],
      "@typescript-eslint/no-unused-vars": ["error", {
        "vars": "all",
        "args": "after-used",
        "ignoreRestSiblings": true,
        "varsIgnorePattern": "^_",
        "argsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-var-requires": "off",

      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true
        }
      ],
    },
  },
]; 
