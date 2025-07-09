# 🏪 EcoDeli - Merchant Side TODO List

## 📋 Vue d'ensemble
Liste complète des fonctionnalités manquantes pour l'espace commerçant EcoDeli, basée sur l'analyse des 404 et la navigation existante.

---

## 🚨 **PRIORITÉ CRITIQUE - 404 Bloquants**

### 1. **Produits (Products) - FONCTIONNALITÉ CORE**
- [ ] **`/merchant/products/`** - Page principale produits
- [ ] **`/merchant/products/list`** - Liste des produits
- [ ] **`/merchant/products/add`** - Ajouter un produit
- [ ] **`/merchant/products/import`** - Import bulk CSV/Excel
- [ ] **`/merchant/products/[id]`** - Détail produit
- [ ] **`/merchant/products/[id]/edit`** - Éditer produit

**API Routes nécessaires :**
- [ ] `GET /api/merchant/products` - Liste produits
- [ ] `POST /api/merchant/products` - Créer produit
- [ ] `GET /api/merchant/products/[id]` - Détail produit
- [ ] `PUT /api/merchant/products/[id]` - Modifier produit
- [ ] `DELETE /api/merchant/products/[id]` - Supprimer produit
- [ ] `POST /api/merchant/products/bulk-import` - Import bulk

### 2. **Commandes (Orders) - GESTION COMMANDES**
- [ ] **`/merchant/orders/`** - Page principale commandes
- [ ] **`/merchant/orders/new`** - Nouvelles commandes
- [ ] **`/merchant/orders/active`** - Commandes en cours
- [ ] **`/merchant/orders/history`** - Historique commandes
- [ ] **`/merchant/orders/[id]`** - Détail commande

**API Routes nécessaires :**
- [ ] `GET /api/merchant/orders` - Liste commandes
- [ ] `GET /api/merchant/orders/[id]` - Détail commande
- [ ] `PUT /api/merchant/orders/[id]/status` - Mettre à jour statut

### 3. **Lâcher de Chariot (Cart Drop) - SERVICE PHARE**
- [ ] **`/merchant/cart-drop/`** - Page principale lâcher de chariot
- [ ] **`/merchant/cart-drop/settings`** - Configuration
- [ ] **`/merchant/cart-drop/zones`** - Zones de livraison
- [ ] **`/merchant/cart-drop/schedules`** - Créneaux horaires

**API Routes nécessaires :**
- [ ] `GET /api/merchant/cart-drop/settings` - Configuration
- [ ] `PUT /api/merchant/cart-drop/settings` - Sauvegarder config
- [ ] `GET /api/merchant/cart-drop/zones` - Zones de livraison
- [ ] `POST /api/merchant/cart-drop/zones` - Créer zone
- [ ] `GET /api/merchant/cart-drop/schedules` - Créneaux
- [ ] `POST /api/merchant/cart-drop/schedules` - Créer créneau

---

## ⚠️ **PRIORITÉ HAUTE - Fonctionnalités Importantes**

### 4. **Contrats (Contracts) - GESTION CONTRATS**
- [ ] **`/merchant/contracts/current`** - Contrat actuel
- [ ] **`/merchant/contracts/negotiation`** - Négociation
- [ ] **`/merchant/contracts/history`** - Historique contrats

**API Routes nécessaires :**
- [ ] `GET /api/merchant/contracts/current` - Contrat actuel
- [ ] `GET /api/merchant/contracts/history` - Historique
- [ ] `POST /api/merchant/contracts/negotiate` - Négocier

### 5. **Finances (Finances) - GESTION FINANCIÈRE**
- [ ] **`/merchant/finances/revenue`** - Revenus détaillés
- [ ] **`/merchant/finances/payments`** - Paiements
- [ ] **`/merchant/finances/invoices`** - Factures

**API Routes nécessaires :**
- [ ] `GET /api/merchant/finances/revenue` - Revenus
- [ ] `GET /api/merchant/finances/payments` - Paiements
- [ ] `GET /api/merchant/finances/invoices` - Factures

### 6. **Analytics (Analytics) - ANALYTICS AVANCÉES**
- [ ] **`/merchant/analytics/sales`** - Ventes détaillées
- [ ] **`/merchant/analytics/customers`** - Analytics clients
- [ ] **`/merchant/analytics/deliveries`** - Analytics livraisons

**API Routes nécessaires :**
- [ ] `GET /api/merchant/analytics/sales` - Données ventes
- [ ] `GET /api/merchant/analytics/customers` - Données clients
- [ ] `GET /api/merchant/analytics/deliveries` - Données livraisons

---

## 📊 **PRIORITÉ MOYENNE - Fonctionnalités Complémentaires**

### 7. **Clients (Customers) - GESTION CLIENTS**
- [ ] **`/merchant/customers/segments`** - Segmentation clients
- [ ] **`/merchant/customers/communication`** - Communication clients

**API Routes nécessaires :**
- [ ] `GET /api/merchant/customers/segments` - Segments clients
- [ ] `POST /api/merchant/customers/communication` - Envoyer message

### 8. **Inventaire (Inventory) - GESTION STOCK**
- [ ] **`/merchant/inventory/stock`** - Gestion du stock
- [ ] **`/merchant/inventory/suppliers`** - Fournisseurs

**API Routes nécessaires :**
- [ ] `GET /api/merchant/inventory/stock` - État du stock
- [ ] `PUT /api/merchant/inventory/stock` - Mettre à jour stock
- [ ] `GET /api/merchant/inventory/suppliers` - Fournisseurs

### 9. **Autres Pages**
- [ ] **`/merchant/documents`** - Documents
- [ ] **`/merchant/profile`** - Profil commerçant

**API Routes nécessaires :**
- [ ] `GET /api/merchant/documents` - Documents
- [ ] `GET /api/merchant/profile` - Profil
- [ ] `PUT /api/merchant/profile` - Modifier profil

---

## 🗄️ **Base de Données - Modèles Prisma**

### Modèles à Créer/Compléter
- [ ] **`Product`** - Produits commerçants
- [ ] **`Order`** - Commandes clients
- [ ] **`CartDropSettings`** - Configuration lâcher de chariot
- [ ] **`DeliveryZone`** - Zones de livraison
- [ ] **`DeliverySchedule`** - Créneaux de livraison
- [ ] **`MerchantContract`** - Contrats commerçants
- [ ] **`Revenue`** - Revenus détaillés
- [ ] **`CustomerSegment`** - Segments clients

---

## 🎨 **Composants React - Interface Utilisateur**

### Composants Produits
- [ ] `ProductList.tsx` - Liste des produits
- [ ] `ProductForm.tsx` - Formulaire produit
- [ ] `ProductCard.tsx` - Carte produit
- [ ] `BulkImportModal.tsx` - Modal import bulk

### Composants Commandes
- [ ] `OrderList.tsx` - Liste commandes
- [ ] `OrderCard.tsx` - Carte commande
- [ ] `OrderStatusBadge.tsx` - Badge statut
- [ ] `OrderTimeline.tsx` - Timeline commande

### Composants Lâcher de Chariot
- [ ] `CartDropSettings.tsx` - Configuration
- [ ] `DeliveryZoneMap.tsx` - Carte zones
- [ ] `ScheduleManager.tsx` - Gestion créneaux
- [ ] `ZoneEditor.tsx` - Éditeur zones

### Composants Contrats
- [ ] `ContractViewer.tsx` - Visualiseur contrat
- [ ] `ContractNegotiation.tsx` - Négociation
- [ ] `ContractHistory.tsx` - Historique

### Composants Finances
- [ ] `RevenueChart.tsx` - Graphique revenus
- [ ] `PaymentList.tsx` - Liste paiements
- [ ] `InvoiceGenerator.tsx` - Générateur factures

---

## 🔧 **Services Backend - Logique Métier**

### Services Produits
- [ ] `product.service.ts` - CRUD produits
- [ ] `bulk-import.service.ts` - Import bulk
- [ ] `product-validation.service.ts` - Validation produits

### Services Commandes
- [ ] `order.service.ts` - Gestion commandes
- [ ] `order-status.service.ts` - Gestion statuts
- [ ] `order-notification.service.ts` - Notifications

### Services Lâcher de Chariot
- [ ] `cart-drop.service.ts` - Configuration
- [ ] `delivery-zone.service.ts` - Zones de livraison
- [ ] `schedule.service.ts` - Créneaux horaires

### Services Contrats
- [ ] `contract.service.ts` - Gestion contrats
- [ ] `negotiation.service.ts` - Négociation
- [ ] `contract-pdf.service.ts` - Génération PDF

### Services Finances
- [ ] `revenue.service.ts` - Calcul revenus
- [ ] `payment.service.ts` - Gestion paiements
- [ ] `invoice.service.ts` - Génération factures

---

## 📱 **Hooks React - Logique Frontend**

### Hooks Produits
- [ ] `useProducts.ts` - Gestion produits
- [ ] `useProductForm.ts` - Formulaire produit
- [ ] `useBulkImport.ts` - Import bulk

### Hooks Commandes
- [ ] `useOrders.ts` - Gestion commandes
- [ ] `useOrderStatus.ts` - Statuts commandes
- [ ] `useOrderNotifications.ts` - Notifications

### Hooks Lâcher de Chariot
- [ ] `useCartDropSettings.ts` - Configuration
- [ ] `useDeliveryZones.ts` - Zones de livraison
- [ ] `useSchedules.ts` - Créneaux

### Hooks Contrats
- [ ] `useContracts.ts` - Gestion contrats
- [ ] `useNegotiation.ts` - Négociation

### Hooks Finances
- [ ] `useRevenue.ts` - Revenus
- [ ] `usePayments.ts` - Paiements
- [ ] `useInvoices.ts` - Factures

---

## 🧪 **Tests - Validation Fonctionnelle**

### Tests Produits
- [ ] `product.test.ts` - Tests CRUD produits
- [ ] `bulk-import.test.ts` - Tests import bulk
- [ ] `product-validation.test.ts` - Tests validation

### Tests Commandes
- [ ] `order.test.ts` - Tests commandes
- [ ] `order-status.test.ts` - Tests statuts
- [ ] `order-notification.test.ts` - Tests notifications

### Tests Lâcher de Chariot
- [ ] `cart-drop.test.ts` - Tests configuration
- [ ] `delivery-zone.test.ts` - Tests zones
- [ ] `schedule.test.ts` - Tests créneaux

### Tests Contrats
- [ ] `contract.test.ts` - Tests contrats
- [ ] `negotiation.test.ts` - Tests négociation

### Tests Finances
- [ ] `revenue.test.ts` - Tests revenus
- [ ] `payment.test.ts` - Tests paiements
- [ ] `invoice.test.ts` - Tests factures

---

## 📊 **Statistiques de Progression**

### Pages (35 total)
- ✅ **Existantes :** 9 (26%)
- ❌ **Manquantes :** 26 (74%)

### API Routes (45 total)
- ✅ **Existantes :** ~15 (33%)
- ❌ **Manquantes :** ~30 (67%)

### Composants (25 total)
- ✅ **Existants :** ~5 (20%)
- ❌ **Manquants :** ~20 (80%)

---

## 🎯 **Plan de Développement Recommandé**

### **Phase 1 (Semaine 1-2) - CRITIQUE**
1. **Produits** - Fonctionnalité core
2. **Commandes** - Gestion commandes
3. **Lâcher de chariot** - Service phare

### **Phase 2 (Semaine 3-4) - IMPORTANT**
1. **Contrats** - Gestion contrats
2. **Finances** - Gestion financière
3. **Analytics** - Analytics avancées

### **Phase 3 (Semaine 5-6) - COMPLÉMENTAIRE**
1. **Clients** - Segmentation
2. **Inventaire** - Gestion stock
3. **Documents** - Gestion documents

---

## 🚨 **404 Actuels Confirmés par Logs**
```
GET /fr/merchant/products/list 404
GET /fr/merchant/products/add 404
```

**Prochaines étapes :**
1. Créer les pages produits manquantes
2. Implémenter les API routes correspondantes
3. Tester avec les comptes commerçants existants

---

## 📝 **Notes de Développement**

### Comptes de Test Commerçants
- `commercant1@test.com` - Commerçant validé
- `commercant2@test.com` - Commerçant en attente (PENDING)

### Intégrations Requises
- **Stripe** - Paiements commerçants
- **Upload** - Images produits
- **PDF** - Factures et contrats
- **Notifications** - Commandes et paiements

### Sécurité
- Validation rôles MERCHANT
- Protection routes commerçants
- Validation documents obligatoires

---

*Dernière mise à jour : $(date)*
*Statut : En cours de développement* 