# EcoDeli - Plateforme de livraison collaborative écologique

EcoDeli est une plateforme de livraison collaborative qui met en relation des personnes ayant besoin de faire livrer un colis avec des livreurs indépendants, des commerçants locaux et des prestataires de services, dans une démarche écologique et solidaire.

## 🌱 Vision

Notre vision est de révolutionner le secteur de la livraison en:
- Réduisant l'empreinte carbone des livraisons
- Créant des opportunités économiques locales
- Favorisant l'entraide et le lien social
- Proposant des prix équitables et transparents

## 🚀 Fonctionnalités principales

- **Livraisons collaboratives**: Les utilisateurs peuvent poster des annonces de livraison et des livreurs indépendants peuvent les accepter
- **Marketplace de commerçants**: Les commerçants locaux peuvent créer leur boutique et proposer leurs produits
- **Services de proximité**: Des prestataires peuvent proposer des services à domicile
- **Système de paiement sécurisé**: Intégration avec Stripe pour des transactions sécurisées
- **Système de notation**: Évaluation des livreurs, clients, commerçants et prestataires
- **Suivi en temps réel**: Suivi de la position du livreur pendant la livraison

## 🛠️ Technologies utilisées

- **Frontend**: Next.js, React, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, tRPC
- **Base de données**: PostgreSQL avec Prisma ORM
- **Authentification**: NextAuth.js
- **Paiement**: Stripe
- **Déploiement**: Vercel

## 📦 Structure du projet

```
ecodeli/
├── src/
│   ├── app/               # Routage et pages Next.js App Router
│   │   ├── (auth)/        # Pages liées à l'authentification
│   │   ├── (dashboard)/   # Pages du tableau de bord
│   │   ├── (public)/      # Pages publiques
│   │   └── api/           # Routes API Next.js
│   ├── components/        # Composants React
│   ├── hooks/             # Hooks React personnalisés
│   ├── lib/               # Utilitaires et configurations
│   ├── server/            # Logique côté serveur
│   │   └── api/routers/   # Routeurs tRPC
│   └── types/             # Types TypeScript
├── prisma/                # Schéma et migrations Prisma
│   └── schema.prisma      # Modèles de données
├── public/                # Fichiers statiques
└── docs/                  # Documentation
    └── api-documentation.md # Documentation de l'API
```

## 🚦 Installation et démarrage

### Prérequis

- Node.js 18+
- PostgreSQL
- Un compte Stripe pour les paiements

### Installation

1. Cloner le dépôt
```bash
git clone https://github.com/TheRebzu/ecodeli.git
cd ecodeli
```

2. Installer les dépendances
```bash
npm install
# ou
pnpm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env
# Remplir les variables dans .env
```

4. Configurer la base de données
```bash
npx prisma migrate dev
npx prisma db seed
```

5. Lancer le serveur de développement
```bash
npm run dev
# ou
pnpm dev
```

6. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur

## 📝 Documentation

- La documentation de l'API est disponible dans [docs/api-documentation.md](docs/api-documentation.md)
- Des exemples d'utilisation sont disponibles dans le répertoire `examples/`

## 🧪 Tests

```bash
# Exécuter les tests unitaires
npm run test
# ou
pnpm test

# Exécuter les tests d'intégration
npm run test:integration
# ou
pnpm test:integration
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour plus d'informations.

## 📜 Licence

Ce projet est sous licence [MIT](LICENSE).

## 📞 Contact

Pour toute question, vous pouvez nous contacter à [contact@ecodeli.com](mailto:contact@ecodeli.com).
