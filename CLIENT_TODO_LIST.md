# 📋 TODO - Fonctionnalités Client EcoDeli

## 🚨 **PRIORITÉ URGENTE (Blocant)**

### 1. **Tutoriel Client Première Connexion** ⚠️ **BLOQUANT**
- [ ] **Overlay bloquant obligatoire** à la première connexion
- [ ] **Impossibilité de passer** sans compléter les étapes
- [ ] **Étapes obligatoires** :
  - [ ] Dépôt d'annonce
  - [ ] Réservation de service
  - [ ] Gestion paiement
  - [ ] Suivi livraison
- [ ] **Validation de completion** avant accès à l'interface
- [ ] **Fichiers à modifier** :
  - `src/features/tutorials/components/client-tutorial-overlay.tsx`
  - `src/app/[locale]/(protected)/client/layout.tsx`
  - `src/features/tutorials/hooks/useTutorialState.ts`

### 2. **Code Validation Livraison 6 Chiffres** ⚠️ **CRITIQUE**
- [ ] **Génération automatique** du code à la création de livraison
- [ ] **Interface client** pour afficher le code
- [ ] **Interface livreur** pour saisir le code
- [ ] **Validation et déblocage** du paiement
- [ ] **Fichiers à créer** :
  - `src/features/deliveries/services/validation-code.service.ts`
  - `src/app/api/deliveries/[id]/validate-code/route.ts`
  - `src/features/client/components/validation-code-display.tsx`

### 3. **Suivi Temps Réel Livraisons** ⚠️ **MANQUANT**
- [ ] **Carte interactive** avec géolocalisation
- [ ] **Mise à jour temps réel** des statuts
- [ ] **Notifications push** à chaque étape
- [ ] **Estimation temps d'arrivée** (ETA)
- [ ] **Fichiers à créer** :
  - `src/features/tracking/services/realtime-tracking.service.ts`
  - `src/components/maps/realtime-delivery-map.tsx`
  - `src/app/api/deliveries/[id]/tracking/route.ts`

### 4. **Matching Automatique Trajets/Annonces** ⚠️ **INTÉGRATION**
- [ ] **Interface client** pour voir les matches proposés
- [ ] **Notifications automatiques** des matches
- [ ] **Acceptation/refus** des propositions
- [ ] **Fichiers à modifier** :
  - `src/features/matching/services/smart-matching.service.ts` (existe)
  - `src/features/client/components/matching-proposals.tsx` (à créer)
  - `src/app/api/client/matching/route.ts` (à créer)

---

## 📦 **PRIORITÉ IMPORTANTE**

### 5. **Services à la Personne Complets** ⚠️ **MANQUANT**
- [ ] **Catalogue complet** des services :
  - [ ] Ménage/nettoyage
  - [ ] Jardinage
  - [ ] Bricolage/handyman
  - [ ] Cours particuliers
  - [ ] Soins/beauté
  - [ ] Garde d'animaux
- [ ] **Réservation de créneaux**
- [ ] **Évaluation des prestataires**
- [ ] **Historique des services**
- [ ] **Fichiers à créer** :
  - `src/features/services/components/service-catalog.tsx`
  - `src/features/services/components/service-booking.tsx`
  - `src/app/api/services/route.ts`

### 6. **Abonnements Fonctionnels** ⚠️ **OPÉRATIONNALISATION**
- [ ] **Interface de gestion** des abonnements
- [ ] **Calcul automatique** des réductions
- [ ] **Gestion des assurances** par plan
- [ ] **Facturation automatique**
- [ ] **Fichiers à modifier** :
  - `src/config/subscription.ts` (existe)
  - `src/features/client/components/subscription-manager.tsx` (à créer)
  - `src/app/api/subscriptions/route.ts` (à créer)

### 7. **Notifications Push OneSignal** ⚠️ **MANQUANT**
- [ ] **Configuration OneSignal**
- [ ] **Notifications pour nouvelles annonces** matchées
- [ ] **Notifications de statut** de livraison
- [ ] **Notifications de paiements**
- [ ] **Fichiers à créer** :
  - `src/features/notifications/services/onesignal.service.ts`
  - `src/app/api/notifications/push/route.ts`
  - `src/features/notifications/components/notification-center.tsx`

### 8. **Box de Stockage Temporaire** ⚠️ **FONCTIONNALISATION**
- [ ] **Réservation de box** dans les 6 entrepôts
- [ ] **Calcul des tarifs** selon taille et durée
- [ ] **Codes d'accès** générés automatiquement
- [ ] **Facturation selon durée** d'occupation
- [ ] **Fichiers à modifier** :
  - `src/features/client/components/storage/advanced-storage-manager.tsx` (existe)
  - `src/app/api/storage/boxes/route.ts` (à créer)
  - `src/features/storage/services/box-reservation.service.ts` (à créer)

---

## 💰 **PRIORITÉ MOYENNE**

### 9. **Lâcher de Chariot** ⚠️ **MANQUANT**
- [ ] **Interface pour demander** livraison à domicile
- [ ] **Sélection adresse + créneau**
- [ ] **Paiement de la livraison**
- [ ] **Suivi de la livraison**
- [ ] **Fichiers à créer** :
  - `src/features/client/components/cart-drop-request.tsx`
  - `src/app/api/cart-drop/route.ts`
  - `src/features/cart-drop/services/cart-drop.service.ts`

### 10. **Achats Internationaux** ⚠️ **MANQUANT**
- [ ] **Interface pour commander** des produits internationaux
- [ ] **Gestion des douanes** et taxes
- [ ] **Suivi international**
- [ ] **Fichiers à créer** :
  - `src/features/client/components/international-shopping.tsx`
  - `src/app/api/international/orders/route.ts`
  - `src/features/international/services/customs.service.ts`

### 11. **Portefeuille Client** ⚠️ **MANQUANT**
- [ ] **Interface de gestion** du portefeuille
- [ ] **Historique des transactions**
- [ ] **Rechargement du portefeuille**
- [ ] **Remboursements**
- [ ] **Fichiers à créer** :
  - `src/features/client/components/wallet-manager.tsx`
  - `src/app/api/client/wallet/route.ts`
  - `src/features/wallet/services/wallet.service.ts`

### 12. **Interface Mobile Optimisée** ⚠️ **MANQUANT**
- [ ] **Design responsive** pour mobile
- [ ] **Navigation tactile** optimisée
- [ ] **Notifications push** natives
- [ ] **Mode hors ligne**
- [ ] **Fichiers à modifier** :
  - `src/app/[locale]/(protected)/client/layout.tsx`
  - `src/components/layout/mobile-navigation.tsx` (à créer)
  - `src/features/client/components/mobile-optimized-dashboard.tsx` (à créer)

---

## 📊 **PRIORITÉ FAIBLE**

### 13. **Tableau de Bord Analytique** ⚠️ **MANQUANT**
- [ ] **Statistiques détaillées** des livraisons
- [ ] **Historique des économies** réalisées
- [ ] **Graphiques d'évolution**
- [ ] **Export des données**
- [ ] **Fichiers à créer** :
  - `src/features/client/components/analytics-dashboard.tsx`
  - `src/app/api/client/analytics/route.ts`
  - `src/features/analytics/services/client-analytics.service.ts`

### 14. **Gestion des Litiges** ⚠️ **MANQUANT**
- [ ] **Interface de signalement** de problèmes
- [ ] **Système de résolution** des litiges
- [ ] **Support client** intégré
- [ ] **Remboursements automatiques**
- [ ] **Fichiers à créer** :
  - `src/features/client/components/dispute-form.tsx`
  - `src/app/api/disputes/route.ts`
  - `src/features/disputes/services/dispute-resolution.service.ts`

### 15. **Système d'Évaluation** ⚠️ **COMPLÉTION**
- [ ] **Évaluation des livreurs**
- [ ] **Évaluation des prestataires**
- [ ] **Système de notation** global
- [ ] **Historique des évaluations**
- [ ] **Fichiers à modifier** :
  - `src/features/client/components/delivery-validation.tsx` (existe)
  - `src/features/reviews/services/review.service.ts` (à créer)
  - `src/app/api/reviews/route.ts` (à créer)

---

## 🔧 **CORRECTIONS TECHNIQUES**

### 16. **Correction Messages Traduction** ⚠️ **URGENT**
- [ ] **Ajouter les messages manquants** pour `merchant.products`
- [ ] **Vérifier toutes les traductions** client
- [ ] **Fichiers à modifier** :
  - `src/messages/fr.json`
  - `src/messages/en.json`

### 17. **Tests API Client** ⚠️ **MANQUANT**
- [ ] **Tests cURL** pour toutes les routes client
- [ ] **Tests d'intégration** pour les fonctionnalités critiques
- [ ] **Tests de performance** pour le matching
- [ ] **Fichiers à créer** :
  - `tests/client-api.test.js`
  - `scripts/test-client-features.sh`

---

## 📈 **MÉTRIQUES DE SUCCÈS**

### **Fonctionnalités Critiques (100% requis)**
- [ ] Tutoriel overlay bloquant fonctionnel
- [ ] Code validation 6 chiffres opérationnel
- [ ] Suivi temps réel avec carte
- [ ] Matching automatique intégré

### **Fonctionnalités Importantes (80% requis)**
- [ ] Services à la personne complets
- [ ] Abonnements fonctionnels
- [ ] Notifications push OneSignal
- [ ] Box de stockage fonctionnelles

### **Fonctionnalités Secondaires (60% requis)**
- [ ] Lâcher de chariot
- [ ] Achats internationaux
- [ ] Portefeuille client
- [ ] Interface mobile optimisée

---

## 🎯 **PLANNING DE DÉVELOPPEMENT**

### **Semaine 1-2 : Fonctionnalités Critiques**
1. Tutoriel overlay bloquant
2. Code validation 6 chiffres
3. Suivi temps réel
4. Matching automatique

### **Semaine 3-4 : Fonctionnalités Importantes**
1. Services à la personne
2. Abonnements fonctionnels
3. Notifications push
4. Box de stockage

### **Semaine 5-6 : Fonctionnalités Secondaires**
1. Lâcher de chariot
2. Achats internationaux
3. Portefeuille client
4. Interface mobile

### **Semaine 7-8 : Finalisation**
1. Analytics détaillées
2. Gestion litiges
3. Système évaluation
4. Tests complets

---

## 📝 **NOTES TECHNIQUES**

### **Stack Technique Utilisée**
- Next.js 15 + TypeScript
- Prisma + PostgreSQL
- Better Auth pour l'authentification
- Tailwind CSS + shadcn/ui
- Stripe pour les paiements
- OneSignal pour les notifications

### **Architecture Client**
- Features modulaires dans `src/features/client/`
- Composants réutilisables dans `src/components/`
- API Routes dans `src/app/api/client/`
- Hooks personnalisés dans `src/features/client/hooks/`

### **Base de Données**
- Modèles existants dans `prisma/schema.prisma`
- Migrations automatiques avec `npx prisma migrate dev`
- Seeds de test dans `prisma/seed/`

---

**Total : 17 tâches majeures** à implémenter pour compléter les fonctionnalités client selon les spécifications EcoDeli. 