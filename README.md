This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Fonctionnalités

### Authentification

L'application EcoDeli dispose d'un système d'authentification complet avec les fonctionnalités suivantes:

#### Modèle de données

- Utilisateurs avec différents rôles (Client, Marchand, Livreur, Prestataire, Admin)
- Profils spécifiques par rôle
- Jetons de vérification d'email et de réinitialisation de mot de passe
- Support pour l'authentification à deux facteurs (2FA)

#### API et backend

- Service d'authentification avec fonctions pour:

  - Inscription utilisateur par rôle
  - Connexion et déconnexion
  - Vérification d'email
  - Réinitialisation de mot de passe
  - Gestion de l'authentification à deux facteurs

- Router tRPC exposant toutes les fonctionnalités d'authentification
- Validation des données avec Zod
- Protection des routes par middleware

#### Frontend

- Hooks React pour la gestion de l'état d'authentification
- Formulaires d'inscription spécifiques par type d'utilisateur
- Composants pour la connexion, vérification d'email, réinitialisation de mot de passe
- Interface pour la gestion de l'authentification à deux facteurs

#### Tests

- Tests unitaires pour les schémas de validation
- Tests unitaires pour le service d'authentification
- Tests d'intégration à venir

#### Comment utiliser

1. **Inscription**: Les utilisateurs peuvent s'inscrire en tant que client, marchand, livreur ou prestataire
2. **Vérification**: Un email de vérification est envoyé pour confirmer l'adresse email
3. **Connexion**: Les utilisateurs peuvent se connecter avec leur email et mot de passe
4. **Sécurité**: Support pour l'authentification à deux facteurs via TOTP (Google Authenticator, etc.)
5. **Récupération**: Possibilité de réinitialiser le mot de passe en cas d'oubli

#### À venir

- Support pour l'authentification via des fournisseurs sociaux (Google, Facebook, etc.)
- Amélioration de la gestion des permissions par rôle
- Journalisation des activités d'authentification

## Internationalisation

EcoDeli utilise [next-intl](https://next-intl-docs.vercel.app/) pour la gestion des traductions.

### Script d'automatisation des traductions

Un script d'automatisation des traductions est disponible pour faciliter la gestion des chaînes à traduire. Ce script analyse le code source pour trouver les chaînes hardcodées, les extrait dans des fichiers de messages structurés et facilite leur traduction.

#### Commandes disponibles

```bash
# Analyser uniquement (mode dry-run)
pnpm run translate:analyze

# Extraire les traductions et mettre à jour les fichiers de messages
pnpm run translate:extract

# Processus complet avec sauvegarde
pnpm run translate:all --backup

# Vérifier l'état des traductions sans modification
pnpm run translate:check

# Générer un rapport détaillé
pnpm run translate:report
```

#### Options supplémentaires

- `--dry-run` : Exécuter sans modifier les fichiers (simulation)
- `--backup` : Créer une sauvegarde avant toute modification
- `--source-lang <lang>` : Spécifier la langue source (défaut: en)
- `--target-langs <langs>` : Spécifier les langues cibles (séparées par des virgules, défaut: fr)

#### Exemple d'utilisation

```bash
# Extraire les traductions pour anglais et français
pnpm run translate:extract --source-lang en --target-langs fr,es,de

# Analyser avec sauvegarde
pnpm run translate:analyze --backup
```

#### Structure des fichiers de traduction

Les fichiers de traduction sont générés dans `src/messages/` avec une structure hiérarchique basée sur les modules et composants de l'application. Exemple:

```json
{
  "common": {
    "buttons": {
      "save": "Save",
      "cancel": "Cancel"
    }
  },
  "auth": {
    "login": {
      "title": "Log in to your account",
      "emailLabel": "Email address"
    }
  }
}
```

Cette structure permet une organisation claire et facilite la maintenance des traductions au fur et à mesure que l'application évolue.
