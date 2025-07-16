# 🌱 Database Seeding pour EcoDeli

Ce document explique comment utiliser le système de seeding automatique pour EcoDeli.

## 🚀 Utilisation locale

### Seeding manuel
```bash
# Seeding complet de la base de données
pnpm run db:seed

# Ou avec Prisma directement
pnpm prisma db seed
```

### Commandes disponibles
```bash
# Générer le client Prisma et seed
pnpm run prisma:generate
pnpm run db:seed

# Réinitialiser la base et seed
pnpm run prisma:reset
pnpm run db:seed
```

## 📦 Déploiement automatique sur Vercel

Le seeding est automatiquement exécuté lors du déploiement sur Vercel grâce à la configuration suivante :

### Configuration Vercel (`vercel.json`)
```json
{
  "buildCommand": "pnpm run prisma:generate && pnpm run build && node scripts/post-build.js"
}
```

### Script post-build (`scripts/post-build.js`)
- Vérifie l'environnement Vercel
- Génère le client Prisma
- Applique le schéma à la base de données
- Exécute le seeding automatiquement

### Variables d'environnement requises
```bash
DATABASE_URL="your-database-url"
NEXTAUTH_URL="your-app-url"
NEXTAUTH_SECRET="your-secret-key"
```

## 🔧 Données créées par le seeding

Le seeding crée automatiquement :

### 👥 Utilisateurs de test (25 au total)
- **Clients** (5) : `client1@test.com` à `client5@test.com`
- **Livreurs** (5) : `livreur1@test.com` à `livreur5@test.com`  
- **Commerçants** (5) : `commercant1@test.com` à `commercant5@test.com`
- **Prestataires** (5) : `prestataire1@test.com` à `prestataire5@test.com`
- **Administrateurs** (5) : `admin1@test.com` à `admin5@test.com`

**Mot de passe pour tous** : `Test123!`

### 📋 Données d'exemple
- **Annonces** : ~40 annonces de livraison
- **Livraisons** : Quelques livraisons en cours
- **Paiements** : Transactions de test
- **Produits** : Produits pour les commerçants
- **Notifications** : Notifications système
- **Contrats** : Contrats marchands
- **Assurances** : Polices d'assurance
- **Certifications** : Certifications prestataires
- **Parrainage** : Codes de parrainage

## 🛠️ Environnements supportés

### Local
- `npm run db:seed` - Seeding manuel
- Variables d'environnement dans `.env.local`

### Vercel Preview
- Seeding automatique lors du déploiement preview
- Base de données séparée recommandée

### Vercel Production
- Seeding automatique lors du déploiement production
- ⚠️ **Attention** : Utilise `--force-reset` qui efface les données existantes

## 📝 Logs et debugging

### Vérifier les logs Vercel
1. Aller dans le dashboard Vercel
2. Sélectionner le déploiement
3. Consulter les logs de build pour voir le seeding

### Logs du script post-build
```bash
🚀 Running post-build script...
📦 Environment: production
🌐 Vercel Environment: production
🔄 Generating Prisma client...
🔄 Pushing database schema...
🌱 Running database seed...
✅ Post-build completed successfully!
📝 Database seeded with test data
```

## 🚨 Avertissements

- **Production** : Le seeding utilise `--force-reset` qui efface toutes les données
- **Données sensibles** : Ne jamais commiter de vraies données sensibles
- **Performance** : Le seeding peut prendre quelques minutes sur Vercel

## 🔧 Personnalisation

Pour modifier les données de seeding :
1. Éditer les fichiers dans `prisma/seed/seeds/`
2. Modifier `prisma/seed/index.ts` pour ajouter/supprimer des étapes
3. Tester localement avec `pnpm run db:seed`

## 📞 Support

En cas de problème :
1. Vérifier les logs Vercel
2. Consulter le fichier `post-build-error.log` si généré
3. Tester le seeding localement d'abord