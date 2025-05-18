# Système de traduction EcoDeli

Ce dossier contient les scripts nécessaires pour gérer les traductions de l'application EcoDeli. Le système est conçu pour automatiser la gestion des clés de traduction, détecter les problèmes et faciliter la maintenance.

## 🚀 Utilisation rapide

Pour une gestion complète des traductions, exécutez :

```bash
pnpm i18n:auto
```

Cette commande exécute l'intégralité du workflow :
1. Extraire les clés des fichiers source
2. Corriger automatiquement les problèmes courants
3. Générer les traductions manquantes
4. Valider l'intégrité des traductions

## 📋 Liste des commandes disponibles

| Commande | Description |
|----------|-------------|
| `pnpm i18n:extract` | Extrait les clés de traduction des fichiers source |
| `pnpm i18n:fix` | Corrige automatiquement les problèmes de clés manquantes |
| `pnpm i18n:generate` | Génère les traductions manquantes |
| `pnpm i18n:validate` | Valide les fichiers de traduction |
| `pnpm i18n:report` | Génère un rapport sur l'état des traductions |
| `pnpm i18n:add-language` | Ajoute une nouvelle langue au projet |
| `pnpm i18n:auto` | Exécute l'ensemble du workflow (avec mode verbeux) |
| `pnpm i18n:full` | Exécute l'ensemble du workflow (sans mode verbeux) |

## 🔧 Workflow de traduction complet

Le workflow complet (`run-workflow.ts`) automatise les tâches suivantes :

1. **Extraction des clés** : Analyse le code source pour identifier toutes les clés de traduction utilisées
2. **Correction des problèmes** : Détecte et corrige les problèmes courants (clés manquantes, namespaces incorrects)
3. **Génération des traductions** : Complète les traductions manquantes pour chaque langue
4. **Validation** : Vérifie l'intégrité et la cohérence des fichiers de traduction

## 🛠️ Options disponibles pour le workflow

Le workflow accepte plusieurs options pour personnaliser son comportement :

```
--verbose, -v       : Affiche des informations détaillées pendant l'exécution
--skip-validation, -s : Ignore l'étape de validation des traductions
--fix-only, -f      : Exécute uniquement la correction des problèmes
--extract-only, -e  : Exécute uniquement l'extraction des clés
--no-color          : Désactive les couleurs dans la sortie
```

Exemple : `pnpm i18n:full --verbose --skip-validation`

## 🧩 Structure des traductions

Les fichiers de traduction sont stockés dans le dossier `src/messages/` au format JSON. Chaque langue a son propre fichier (ex : `fr.json`, `en.json`).

Structure recommandée des fichiers de traduction :

```json
{
  "common": {
    "languageName": "Français",
    "languages": {
      "fr": "Français",
      "en": "Anglais",
      "es": "Espagnol",
      "de": "Allemand",
      "it": "Italien"
    },
    "actions": {
      "save": "Enregistrer",
      "cancel": "Annuler"
    }
  },
  "auth": {
    "login": "Connexion",
    "register": "Inscription"
  }
}
```

## 📐 Bonnes pratiques pour l'utilisation des traductions

### 1. Structure des clés

- Utilisez des namespaces pour organiser les traductions (ex: `common`, `auth`, `dashboard`)
- Gardez une structure cohérente entre les différentes langues
- Évitez les clés trop génériques comme `title` ou `description`

### 2. Dans les composants React

Utilisez toujours la syntaxe suivante pour accéder aux traductions :

```tsx
import { useTranslations } from 'next-intl';

export function MyComponent() {
  // Déclarez le namespace utilisé
  const t = useTranslations('common');
  
  return (
    <div>
      {/* Utilisez les clés de traduction */}
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      
      {/* Pour des clés imbriquées */}
      <button>{t('actions.save')}</button>
    </div>
  );
}
```

### 3. Pour les clés dynamiques

Si vous avez besoin d'utiliser des clés dynamiques, utilisez la syntaxe backtick `` ` `` :

```tsx
// Correct
const action = 'save';
t(`actions.${action}`);

// Incorrect - ne sera pas détecté par l'extracteur
t('actions.' + action);
```

## 🔄 Intégration continue

Le système de traduction est conçu pour s'intégrer dans un workflow CI/CD :

1. Exécutez `pnpm i18n:ci` dans votre pipeline CI pour vérifier que toutes les traductions sont complètes
2. Utilisez l'option `--check` avec l'extraction pour identifier les clés manquantes sans modifier les fichiers

## 📚 Documentation des scripts

### 1. `extract-labels.ts`

Ce script analyse les fichiers source pour extraire les clés de traduction utilisées dans l'application.

### 2. `fix-localization-issues.ts`

Identifie et corrige automatiquement les problèmes courants, comme les clés manquantes ou les références incorrectes.

### 3. `generate-translations.ts`

Génère les traductions manquantes en utilisant les API de traduction automatique ou en copiant les valeurs d'autres langues.

### 4. `run-workflow.ts`

Script principal qui orchestre l'ensemble du processus de gestion des traductions.

### 5. `add-language.ts`

Ajoute une nouvelle langue au projet en créant les fichiers nécessaires et en générant les traductions initiales. 