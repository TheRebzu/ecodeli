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

# EcoDeli

EcoDeli est une plateforme de livraison écologique.

## Docker

EcoDeli peut être exécuté avec Docker, ce qui facilite la configuration de l'environnement de développement et de production.

### Prérequis

- Docker et Docker Compose installés sur votre machine
- Git pour cloner le dépôt

### Développement avec Docker

Pour démarrer l'environnement de développement :

```bash
# Cloner le dépôt
git clone https://github.com/therebzu/ecodeli.git
cd ecodeli

# Créer un fichier .env à partir du modèle
cp .env.example .env
# Modifier les variables d'environnement selon vos besoins

# Démarrer les conteneurs
docker compose -f docker/docker-compose.yml up -d

# Le serveur de développement sera accessible à l'adresse http://localhost:3000
# PgAdmin sera accessible à l'adresse http://localhost:5050
```

### Production avec Docker

Pour déployer en production :

```bash
# Créer un fichier .env.production
cp .env.example .env.production
# Configurer les variables d'environnement pour la production

# Démarrer les conteneurs de production
docker compose -f docker/docker-compose.prod.yml up -d

# L'application sera accessible via HTTPS à l'adresse configurée
```

### Variables d'environnement Docker

Pour la production, assurez-vous de définir ces variables :

- `NEXTAUTH_SECRET` : Clé secrète pour NextAuth
- `POSTGRES_PASSWORD` : Mot de passe pour la base de données PostgreSQL

## Testing

The project uses Jest for testing both the frontend components and backend API endpoints.

### Running Tests

- Run all tests: `npm test`
- Run API tests only: `npm run test:api` 
- Run unit tests only: `npm run test:unit`
- Run tests in watch mode: `npm run test:watch`
- Generate test coverage: `npm run test:coverage`

### Test Structure

- `/tests/unit`: Unit tests for individual components and functions
- `/tests/integration`: Integration tests for API endpoints and more complex functionality
  - `/tests/integration/api`: Tests for API endpoints

### Mock Configuration

The test suite uses Jest mocks for several dependencies:

- `next-auth` for authentication
- `@/lib/prisma` for database access
- `next/navigation` for routing
- `bcryptjs` for password hashing

Most mocks are configured globally in `jest.setup.js`.
