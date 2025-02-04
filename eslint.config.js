const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const reactPlugin = require("eslint-plugin-react");
const jsdocPlugin = require("eslint-plugin-jsdoc");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/public/**",
      "**/static/**",
      "**/src/renderer/components/common/upload_progress/upload_progress.tsx",
      "**/dependency/**",
      "**/docs/**",
      "**/jest.config.js",
      "**/postcss.config.js",
      "**/tailwind.config.js",
      "**/tsconfig.json",
      "**/tsconfig.node.json",
      "**/webpack.config.js",
      "**/webpack.config.ts",
      "**/webpack.config.tsx",
      "**/notarize.ts"
    ],
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
      "jsdoc": jsdocPlugin,
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
      "@typescript-eslint/no-unused-vars": ["warn", {
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
      
      // JSDoc rules
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-param-type": "off",
      "jsdoc/check-param-names": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-description": "off"
    }
  }
]; 
