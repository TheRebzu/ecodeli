// eslint.config.js - Configuration ESLint v9 pour EcoDeli
// Version simplifiée fonctionnelle

export default [
  // === Configuration de base pour JavaScript ===
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: "readonly",
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
      },
    },
    
    rules: {
      // === Règles de base ===
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^React$",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      "object-shorthand": "error",
      "no-useless-return": "error",
      "no-useless-escape": "warn",
      "no-case-declarations": "error",
      "curly": ["error", "all"],
      "eqeqeq": ["error", "always"],
      "no-throw-literal": "error",
      "arrow-spacing": "error",
      "no-duplicate-imports": "error",
      "no-useless-constructor": "error",
      "prefer-destructuring": [
        "error",
        {
          array: false,
          object: true,
        },
      ],
      "consistent-return": "off", // Problématique avec React
      "default-case": "error",
      "dot-notation": "error",
      "no-empty-function": "warn",
      "no-lonely-if": "error",
      "no-multi-assign": "error",
      "no-nested-ternary": "warn",
      "no-unneeded-ternary": "error",
      "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
      "prefer-object-spread": "error",
      "spaced-comment": ["error", "always", { exceptions: ["-", "+", "*"] }],
      
      // Règles spécifiques pour React
      "no-undef": "off", // Next.js gère cela
    },
  },
  
  // === Configuration pour TypeScript (sans parser spécialisé) ===
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: "readonly",
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        NodeJS: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      // Règles de base pour TypeScript
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^React$",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      "object-shorthand": "error",
      "no-useless-return": "error",
      "no-useless-escape": "warn",
      "curly": ["error", "all"],
      "eqeqeq": ["error", "always"],
      "no-throw-literal": "error",
      "no-undef": "off", // TypeScript gère cela
      "no-redeclare": "off", // TypeScript gère cela
      "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
    },
  },
  
  // === Configuration pour les fichiers de configuration ===
  {
    files: [
      "*.config.{js,ts}",
      "next.config.js",
      "tailwind.config.js",
      "postcss.config.js",
      "prettier.config.js",
      "eslint.config.js",
    ],
    rules: {
      "no-anonymous-default-export": "off",
      "import/no-anonymous-default-export": "off",
      "no-console": "off",
      "no-unused-vars": "off",
      "prefer-const": "off",
    },
  },
  
  // === Configuration pour les scripts ===
  {
    files: ["scripts/**/*"],
    rules: {
      "no-console": "off",
      "no-process-exit": "off",
      "no-unused-vars": "warn",
      "prefer-const": "off",
    },
  },
  
  // === Configuration pour les tests ===
  {
    files: [
      "**/*.{test,spec}.{ts,tsx,js,jsx}",
      "**/__tests__/**/*",
      "**/test/**/*",
    ],
    rules: {
      "no-unused-expressions": "off",
      "no-console": "off",
      "no-unused-vars": "warn",
    },
  },
  
  // === Configuration pour Prisma ===
  {
    files: ["prisma/**/*"],
    rules: {
      "no-console": "off",
      "no-unused-vars": "warn",
    },
  },
  
  // === Configuration pour le serveur ===
  {
    files: ["src/server/**/*"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  
  // === Fichiers à ignorer ===
  {
    ignores: [
      // Build et dépendances
      ".next/",
      ".turbo/",
      "dist/",
      "build/",
      "out/",
      "node_modules/",
      
      // Fichiers générés
      "*.generated.{ts,js}",
      ".env*",
      "next-env.d.ts",
      
      // Cache et logs
      ".eslintcache",
      "*.log",
      "*-debug.log*",
      "*-error.log*",
      
      // Prisma
      "prisma/migrations/",
      "prisma/generated/",
      
      // Documentation et coverage
      "docs/api/",
      "coverage/",
      "*.tsbuildinfo",
      
      // Tests et build
      "__tests__/",
      "jest.config.js",
      "setupTests.js",
      
      // Temporaires
      ".tmp/",
      "temp/",
      "tmp/",
      
      // IDE
      ".vscode/",
      ".idea/",
      
      // OS
      ".DS_Store",
      "Thumbs.db",
      
      // Storybook
      ".storybook/",
      "storybook-static/",
      
      // Scripts temporaires
      "scripts/temp/",
      "scripts/backup/",
      
      // Anciennes configurations
      ".eslintrc.*",
    ],
  },
]; 