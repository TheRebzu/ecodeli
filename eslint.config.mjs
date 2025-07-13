import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends(
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ),
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["prisma/seed/**/*", "prisma/seeds/**/*", "scripts/**/*"],
    rules: {
      // Interdit l'utilisation de 'any'
      "@typescript-eslint/no-explicit-any": "error",
      // Interdit les variables non utilisées
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      // Imposer l'utilisation de types explicites pour les fonctions
      "@typescript-eslint/explicit-function-return-type": "warn",
      // Imposer l'ordre des imports
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
        },
      ],
      // Interdit les imports cycliques
      "import/no-cycle": "error",
      // Imposer les hooks React corrects
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Désactive la règle Next.js sur les images pour éviter le spam
      "@next/next/no-img-element": "off",
      // Désactive la règle sur les props spreading (souvent utile)
      "react/jsx-props-no-spreading": "off",
      // Autorise les commentaires TODO/FIXME
      "no-warning-comments": [
        "warn",
        { terms: ["todo", "fixme", "xxx"], location: "anywhere" },
      ],
    },
  },
  {
    files: ["**/*.{js,jsx}"],
    rules: {
      // Règles pour les fichiers JS
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
];
