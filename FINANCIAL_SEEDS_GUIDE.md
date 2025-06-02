# 💰 Guide des Seeds Financiers EcoDeli

## 📋 Vue d'ensemble

Le système financier EcoDeli comprend 5 modules principaux qui gèrent tous les aspects monétaires de la plateforme : portefeuilles, paiements, factures, commissions et cycles de facturation.

## 🏗️ Architecture

```
prisma/seeds/financial/
├── wallets-seed.ts          # Portefeuilles et transactions
├── payments-seed.ts         # Paiements Stripe et méthodes
├── invoices-seed.ts         # Factures et lignes de détail
├── commissions-seed.ts      # Taux de commission et promotions
└── billing-cycles-seed.ts   # Cycles de facturation et rappels
```

## 🎯 Modules Implémentés

### 1. 💳 Portefeuilles (Wallets)
**Fichier:** `wallets-seed.ts`

#### Fonctionnalités
- Wallets pour livreurs et prestataires avec soldes variés
- Historique détaillé des transactions (6 mois)
- Virements en attente et demandes de retrait
- Limites de retrait configurables
- Statuts de vérification des comptes

#### Données créées
- **150+ wallets** avec balances réalistes
- **1000+ transactions** de tous types
- **Soldes variés** : 0-2000 EUR selon l'activité
- **Taux de vérification** : 80% des comptes vérifiés

#### Types de transactions
- `DEPOSIT` : Dépôts de gains
- `WITHDRAWAL` : Retraits vers compte bancaire
- `EARNING` : Commissions gagnées
- `PLATFORM_FEE` : Frais de plateforme
- `BONUS` : Bonus exceptionnels
- `ADJUSTMENT` : Ajustements manuels

### 2. 💰 Paiements (Payments)
**Fichier:** `payments-seed.ts`

#### Fonctionnalités
- Paiements Stripe avec statuts réalistes
- Différentes méthodes de paiement européennes
- Commissions EcoDeli automatiquement calculées
- Gestion des échecs et remboursements
- Métadonnées complètes pour audit

#### Données créées
- **500+ paiements** sur 6 mois
- **Taux de réussite** : 85% (réaliste)
- **Méthodes** : CB, SEPA, Bancontact, iDEAL
- **Montants** : 3,50€ à 400€ selon service

#### Répartition par service
- **Livraisons** : 3,50€ - 25€ (15% commission)
- **Plomberie** : 45€ - 300€ (12% commission)
- **Électricité** : 60€ - 400€ (12% commission)
- **Nettoyage** : 25€ - 120€ (10% commission)
- **Support IT** : 40€ - 200€ (15% commission)
- **Jardinage** : 35€ - 180€ (10% commission)

### 3. 📄 Factures (Invoices)
**Fichier:** `invoices-seed.ts`

#### Fonctionnalités
- Factures mensuelles pour prestataires/commerçants
- Factures ponctuelles pour clients
- Statuts : payée, en attente, en retard, annulée
- Lignes de détail avec TVA calculée
- Génération de PDFs (URLs mockées)

#### Données créées
- **300+ factures** avec périodes variées
- **Taux de paiement** : 75% (réaliste)
- **TVA** : 20% correctement calculée
- **Numérotation** : ECO-YYYY-XXXXXX

#### Types de factures
- **SERVICE** : Prestations ponctuelles clients
- **DELIVERY** : Frais de livraison
- **COMMISSION** : Commissions plateforme
- **SUBSCRIPTION** : Abonnements professionnels
- **ADVERTISING** : Campagnes publicitaires
- **CERTIFICATION** : Frais de certification

### 4. 📊 Commissions (Commissions)
**Fichier:** `commissions-seed.ts`

#### Fonctionnalités
- Taux de commission réalistes par service
- Commissions dégressives par volume
- Promotions temporaires historiques
- Abonnements à prix fixe
- Historique des anciens taux

#### Données créées
- **10 commissions actives** par service
- **5 promotions historiques** terminées
- **3 taux historiques** inactifs
- **Seuils de volume** pour réductions

#### Taux de commission
- **Livraisons** : 15% → 12% → 10% (dégressif)
- **Services** : 10-15% selon spécialité
- **Abonnements** : 19,99€ - 29,99€/mois
- **Publicité** : 2,50€ par boost 24h
- **Stripe** : 2,9% + 0,30€ minimum

### 5. 🔄 Cycles de Facturation (Billing Cycles)
**Fichier:** `billing-cycles-seed.ts`

#### Fonctionnalités
- Facturation hebdomadaire pour livreurs
- Facturation mensuelle pour prestataires/commerçants
- Rappels automatiques pour impayés
- Exports comptables avec métadonnées
- Calcul des revenus récurrents

#### Données créées
- **50+ cycles actifs** selon l'activité utilisateur
- **20+ rappels** pour factures en retard
- **15+ exports comptables** récents
- **Statistiques** de revenus mensuels

#### Fréquences
- **Livreurs** : Hebdomadaire (lundi)
- **Prestataires** : Mensuel (1er du mois)
- **Commerçants** : Mensuel (15 du mois)

## 🚀 Utilisation

### Installation complète
```bash
# Installer tous les seeds financiers
pnpm run seed:financial

# Installer uniquement les wallets
pnpm run seed:financial --seeds=wallets

# Forcer la recréation
pnpm run seed:financial --force
```

### Tests et validation
```bash
# Tester l'intégrité financière
pnpm run test:financial

# Valider sans créer
pnpm run seed:financial --validate

# Aperçu sans exécuter
pnpm run seed:financial --dry-run
```

### Scripts spécialisés
```bash
# Nettoyer et recréer
pnpm run seed:reset --categories=financial

# Mode verbose pour debug
pnpm run seed:financial --verbose

# Catégories multiples
pnpm run seed:all --categories=users,financial
```

## 📊 Statistiques Générées

### Métriques Financières
- **Chiffre d'affaires** : 15 000€ - 25 000€ (6 mois)
- **Commissions totales** : 1 800€ - 3 500€
- **Taux de réussite paiements** : 85%
- **Balance totale wallets** : 8 000€ - 12 000€
- **Revenus récurrents** : 2 500€ - 4 000€/mois

### Répartition Utilisateurs
- **150 wallets** (livreurs/prestataires actifs)
- **200 clients** effectuant des paiements
- **80% taux de vérification** des comptes
- **90% taux d'activité** récente (30 jours)

## 🔍 Tests d'Intégrité

Le système inclut des tests automatiques pour vérifier :

### Cohérence des Données
- ✅ Balances wallet = somme des transactions
- ✅ Totaux facture = lignes + TVA
- ✅ Toutes les relations FK valides
- ✅ Dates cohérentes (émission < échéance)

### Logique Métier
- ✅ Paiements réussis ont Stripe ID
- ✅ Factures payées ont date de paiement
- ✅ Commissions dans fourchettes réalistes
- ✅ Cycles de facturation complets

### Performance
- ✅ Index sur champs critiques
- ✅ Requêtes optimisées
- ✅ Pagination pour gros volumes
- ✅ Transactions atomiques

## 🎯 Scénarios Couverts

### Cas d'Usage Réels
1. **Livreur débutant** : Wallet vide → premières courses → premiers gains
2. **Prestataire expert** : Gros volume → commission dégressive → retrait régulier
3. **Client fidèle** : Multiples paiements → méthodes variées → tout réussi
4. **Échec de paiement** : Carte expirée → retry → succès final
5. **Facture en retard** : Émission → rappel → paiement tardif

### Cas Limites
1. **Problème Stripe** : Service indisponible → paiements en attente
2. **Fraude détectée** : Paiement bloqué → remboursement
3. **Wallet suspendu** : Compte non vérifié → retrait impossible
4. **Commission négative** : Remboursement client → ajustement wallet
5. **Facture annulée** : Erreur de facturation → avoir émis

## 📈 Évolutivité

### Optimisations Futures
- **Partitioning** des transactions par date
- **Archivage** des anciennes factures
- **Cache** des commissions fréquentes
- **Webhook** Stripe en temps réel

### Nouvelles Fonctionnalités
- **Multi-devises** (EUR, USD, GBP)
- **Crypto-paiements** (Bitcoin, Ethereum)
- **Facturation automatique** avancée
- **Analytics** financières temps réel

## ⚙️ Configuration

### Variables d'Environnement
```env
# Stripe (production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Base de données
DATABASE_URL=postgresql://...

# Paramètres financiers
MIN_WITHDRAWAL_AMOUNT=10.00
MAX_COMMISSION_RATE=0.30
DEFAULT_PAYMENT_TERM_DAYS=30
```

### Fichier de Configuration
```typescript
// prisma/seeds/seed.config.ts
export const financialConfig = {
  wallets: {
    verificationRate: 0.80,    // 80% vérifiés
    avgBalance: 250.00,        // Balance moyenne
    transactionHistory: 180    // 6 mois d'historique
  },
  payments: {
    successRate: 0.85,         // 85% de réussite
    avgAmount: 75.00,          // Montant moyen
    monthsHistory: 6           // Historique
  },
  commissions: {
    deliveryRate: 0.15,        // 15% livraisons
    serviceRate: 0.12,         // 12% services
    subscriptionPrice: 29.99   // Abonnement
  }
};
```

## 🤝 Contribution

### Guidelines
1. **Montants réalistes** selon le marché français
2. **TVA 20%** sur tous les montants TTC
3. **Dates cohérentes** dans les 6 derniers mois
4. **Performance** maintenue avec gros volumes
5. **Tests** systématiques pour nouvelles features

### Pull Requests
- ✅ Tests d'intégrité passés
- ✅ Documentation mise à jour
- ✅ Performance vérifiée
- ✅ Données réalistes validées

---

**💡 Ce système financier fournit une base solide et réaliste pour développer et tester toutes les fonctionnalités monétaires d'EcoDeli en toute confiance.** 