# 🔧 Guide de Configuration Stripe - EcoDeli

## ✅ Problème Résolu

L'erreur **"No such price: 'price_test_starter_dev'"** a été corrigée. Les produits Stripe ont été créés et la configuration a été mise à jour.

## 🎯 Produits Stripe Créés

Le script a généré les produits suivants dans votre compte Stripe :

### STARTER Plan
- **Price ID**: `price_1RiXwZGhcgIsYtVUxr7wg44d`
- **Prix**: €9.90/mois
- **Features**: Assurance jusqu'à 115€, 5% de réduction

### PREMIUM Plan  
- **Price ID**: `price_1RiXwZGhcgIsYtVUnNUIAomh`
- **Prix**: €19.99/mois
- **Features**: Assurance jusqu'à 3000€, 9% de réduction, 3 envois prioritaires gratuits

## 🔑 Configuration Recommandée

### Option 1: Utiliser les Price IDs par défaut (Rapide)
Les price IDs sont maintenant codés en dur dans `src/config/subscription.ts`. L'application fonctionnera immédiatement.

### Option 2: Configuration via Variables d'Environnement (Recommandé)
Pour une configuration plus flexible, créez un fichier `.env.local` :

```bash
# ========================================
# STRIPE CONFIGURATION
# ========================================
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Produits créés par le script
STRIPE_STARTER_PRICE_ID=price_1RiXwZGhcgIsYtVUxr7wg44d
STRIPE_PREMIUM_PRICE_ID=price_1RiXwZGhcgIsYtVUnNUIAomh

# ========================================
# DATABASE & AUTH
# ========================================
DATABASE_URL="postgresql://postgres:password@localhost:5432/ecodeli"
BETTER_AUTH_SECRET=your-secret-key-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 Test des Abonnements

1. **Démarrez le serveur** : `pnpm dev`
2. **Connectez-vous** comme client : http://localhost:3000/login
3. **Accédez aux abonnements** : http://localhost:3000/client/subscription
4. **Testez un abonnement** STARTER ou PREMIUM

## 🔍 Vérification Stripe Dashboard

Accédez à votre [Stripe Dashboard](https://dashboard.stripe.com/test/products) pour voir les produits créés :

- **Produits** : https://dashboard.stripe.com/test/products
- **Prix** : https://dashboard.stripe.com/test/prices
- **Abonnements** : https://dashboard.stripe.com/test/subscriptions

## 🛠️ Recréer les Produits (Si Nécessaire)

Si vous devez recréer les produits Stripe :

```bash
# Exécuter le script de création
node scripts/create-stripe-products.js

# Le script affichera les nouveaux Price IDs à copier
```

## 🎮 Cartes de Test Stripe

Pour tester les paiements, utilisez ces cartes de test :

```
✅ Succès : 4242 4242 4242 4242
❌ Échec : 4000 0000 0000 0002
🔄 3D Secure : 4000 0000 0000 3220
```

**Date d'expiration** : N'importe quelle date future  
**CVC** : N'importe quel code à 3 chiffres

## 🚨 Points d'Attention

1. **Environnement de Test** : Les price IDs commencent par `price_test_`
2. **Production** : Vous devrez recréer les produits en mode live
3. **Webhooks** : Configurez les webhooks pour les événements d'abonnement
4. **Sécurité** : Ne commitez jamais les clés Stripe dans Git

## 📞 Support

Si vous rencontrez encore des problèmes :

1. Vérifiez que votre compte Stripe est actif
2. Confirmez que les clés API sont correctes
3. Vérifiez que les produits existent dans le dashboard
4. Consultez les logs du serveur pour plus de détails

---

**✅ Status**: Configuration Stripe complétée et fonctionnelle 