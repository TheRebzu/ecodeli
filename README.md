# EcoDeli - Plateforme de Crowdshipping

EcoDeli est une plateforme de crowdshipping éco-responsable qui met en relation des particuliers pour la livraison de colis et des services à la personne.

## 🚀 Fonctionnalités

### 5 Espaces Utilisateurs

- **Client** : Envoi de colis, réservation de services, suivi en temps réel
- **Livreur** : Gestion des trajets, livraisons, portefeuille électronique
- **Commerçant** : Catalogue produits, lâcher de chariot, analytics
- **Prestataire** : Services à la personne, calendrier, facturation automatique
- **Admin** : Gestion complète de la plateforme

### Services Principaux

- 📦 **Livraison de colis** (intégrale ou partielle)
- 🚗 **Transport de personnes** (trajets occasionnels)
- 🛒 **Services à domicile** (courses, garde d'animaux, travaux)
- 📍 **Stockage temporaire** (box dans nos entrepôts)
- 🛒 **Lâcher de chariot** (livraison depuis les magasins partenaires)

## 🛠️ Stack Technique

- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript
- **Base de données** : PostgreSQL + Prisma
- **Authentification** : NextAuth.js
- **API** : Next.js API Routes
- **État global** : Zustand
- **Formulaires** : React Hook Form + Zod
- **UI** : Radix UI + Tailwind CSS
- **Paiements** : Stripe
- **Notifications** : OneSignal
- **PDF** : jsPDF
- **Internationalisation** : next-intl
- **Tests** : Jest + React Testing Library

## 📁 Architecture

```
ecodeli/
├── prisma/                 # Schema et migrations base de données
├── src/
│   ├── app/                # Routes Next.js avec i18n
│   │   ├── [locale]/       # Routes internationalisées
│   │   └── api/            # API Routes
│   ├── features/           # Logique métier par domaine
│   │   ├── auth/
│   │   ├── announcements/
│   │   ├── deliveries/
│   │   ├── payments/
│   │   └── ...
│   ├── components/         # Composants UI réutilisables
│   ├── lib/               # Configuration et utilitaires
│   ├── types/             # Types TypeScript globaux
│   └── messages/          # Traductions (fr/en)
```

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+
- PostgreSQL
- pnpm (recommandé)

### Installation

1. **Cloner le projet**

```bash
git clone https://github.com/your-org/ecodeli.git
cd ecodeli
```

2. **Installer les dépendances**

```bash
pnpm install
```

3. **Configuration environnement**

```bash
cp .env.example .env.local
# Modifier .env.local avec vos valeurs
```

4. **Base de données**

```bash
# Générer le client Prisma
pnpm db:generate

# Créer et appliquer les migrations
pnpm db:migrate

# (Optionnel) Peupler avec des données de test
pnpm db:seed
```

5. **Lancer le serveur de développement**

```bash
pnpm dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📝 Scripts Disponibles

```bash
# Développement
pnpm dev              # Serveur de développement
pnpm build            # Build de production
pnpm start            # Serveur de production
pnpm lint             # Linting ESLint
pnpm type-check       # Vérification TypeScript

# Base de données
pnpm db:generate      # Générer le client Prisma
pnpm db:push          # Synchroniser le schema (dev)
pnpm db:migrate       # Créer/appliquer migrations
pnpm db:studio        # Interface Prisma Studio
pnpm db:seed          # Peupler la base de données

# Tests
pnpm test             # Lancer les tests
pnpm test:watch       # Tests en mode watch
```

## 🌍 Internationalisation

Le projet support le français et l'anglais :

- `/fr/*` - Version française
- `/en/*` - Version anglaise

Les traductions sont dans `src/messages/` et peuvent être étendues facilement.

## 🔐 Authentification

EcoDeli utilise NextAuth.js avec 5 rôles utilisateurs :

- `CLIENT` - Clients particuliers
- `DELIVERER` - Livreurs occasionnels
- `MERCHANT` - Commerçants partenaires
- `PROVIDER` - Prestataires de services
- `ADMIN` - Administrateurs plateforme

## 💳 Paiements

Intégration Stripe complète :

- Paiements sécurisés
- Abonnements clients (Free, Starter, Premium)
- Portefeuilles électroniques
- Commissions automatiques
- Facturation PDF

## 📱 Notifications

Système de notifications en temps réel via OneSignal :

- Push notifications web/mobile
- Emails transactionnels
- Alertes de matching automatique
- Mises à jour de livraison

## 🏗️ Développement

### Conventions de Code

- **Fichiers/Dossiers** : kebab-case (`user-profile.tsx`)
- **Composants** : PascalCase (`UserProfile`)
- **Hooks** : camelCase avec prefix `use` (`useUserProfile`)
- **Services** : camelCase avec suffix `Service` (`userService`)
- **Types** : PascalCase (`UserProfile`)
- **Constantes** : UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)

### Structure des Features

Chaque feature suit cette structure :

```
features/[feature-name]/
├── components/          # Composants UI
├── hooks/              # Hooks React personnalisés
├── services/           # Logique métier et API
├── schemas/            # Validation Zod
├── types.ts            # Types TypeScript
├── constants.ts        # Constantes
└── utils.ts           # Fonctions utilitaires
```

### Composants par Rôle

Les composants sont organisés par rôle utilisateur avec suffixes :

- `component-client.tsx` - Pour les clients
- `component-deliverer.tsx` - Pour les livreurs
- `component-merchant.tsx` - Pour les commerçants
- `component-provider.tsx` - Pour les prestataires
- `component-admin.tsx` - Pour les admins
- `component.tsx` - Partagé entre rôles

## 🚀 Déploiement

### Variables d'Environnement Requises

Voir `.env.example` pour la liste complète.

Minimales pour la production :

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `ONESIGNAL_API_KEY`

### Build de Production

```bash
pnpm build
pnpm start
```

## 📄 Documentation

- [Architecture détaillée](docs/ARCHITECTURE.md)
- [Guide API](docs/API.md)
- [Guide déploiement](docs/DEPLOYMENT.md)
- [Contribution](docs/CONTRIBUTING.md)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📞 Support

- 📧 Email : contact@ecodeli.com
- 📚 Documentation : [docs.ecodeli.com](https://docs.ecodeli.com)
- 🐛 Issues : [GitHub Issues](https://github.com/your-org/ecodeli/issues)

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

**EcoDeli** - La révolution du crowdshipping éco-responsable 🌱
