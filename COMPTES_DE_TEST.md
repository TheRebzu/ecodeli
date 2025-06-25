# 🔑 Comptes de Test EcoDeli

## Informations de Connexion

Tous les comptes utilisent le même mot de passe : **`Test123!`**

---

## 👤 **CLIENT**
- **Email** : `client-complete@test.com`
- **Mot de passe** : `Test123!`
- **Rôle** : CLIENT
- **Dashboard** : `/client/dashboard`
- **Statut** : ✅ Actif (tutoriel à compléter)
- **Fonctionnalités** :
  - Tutoriel obligatoire première connexion
  - Abonnements (Free/Starter/Premium)
  - Création d'annonces
  - Réservation de services
  - Accès aux box de stockage

---

## 🚚 **DELIVERER**
- **Email** : `deliverer-complete@test.com`
- **Mot de passe** : `Test123!`
- **Rôle** : DELIVERER
- **Dashboard** : `/deliverer/dashboard`
- **Statut** : ⏳ PENDING (documents à valider)
- **Fonctionnalités** :
  - Validation documents (identité, permis, assurance)
  - Déclaration de trajets
  - Matching automatique
  - Portefeuille et retraits
  - Code validation 6 chiffres

---

## 🏪 **MERCHANT**
- **Email** : `merchant-complete@test.com`
- **Mot de passe** : `Test123!`
- **Rôle** : MERCHANT
- **Dashboard** : `/merchant/dashboard`
- **Statut** : ⏳ PENDING (contrat à signer)
- **Fonctionnalités** :
  - Gestion des contrats
  - Création d'annonces produits
  - Configuration lâcher de chariot
  - Facturation et paiements
  - Import bulk d'annonces

---

## 🔧 **PROVIDER**
- **Email** : `provider-complete@test.com`
- **Mot de passe** : `Test123!`
- **Rôle** : PROVIDER
- **Dashboard** : `/provider/dashboard`
- **Statut** : ⏳ PENDING (profil à valider)
- **Fonctionnalités** :
  - Validation avec certifications
  - Calendrier de disponibilités
  - Gestion des interventions
  - Facturation mensuelle automatique (30/mois)
  - Tarifs négociés avec EcoDeli

---

## ⚙️ **ADMIN**
- **Email** : `admin-complete@test.com`
- **Mot de passe** : `Test123!`
- **Rôle** : ADMIN
- **Dashboard** : `/admin/dashboard`
- **Statut** : ✅ Actif (toutes permissions)
- **Fonctionnalités** :
  - Validation documents livreurs/prestataires
  - Gestion complète utilisateurs
  - Monitoring livraisons et litiges
  - Gestion financière globale
  - Configuration des 6 entrepôts

---

## 🚀 Comment se connecter

### Méthode 1 : Connexion manuelle
1. Allez sur `/login`
2. Saisissez l'email et le mot de passe
3. Cliquez sur "Se connecter"

### Méthode 2 : Connexion rapide (Mode développement)
1. Allez sur `/login`
2. Dans la section "Comptes de test", cliquez sur "Se connecter" pour le rôle souhaité
3. Vous serez automatiquement connecté et redirigé

---

## 📋 URLs Importantes

- **Connexion** : `http://localhost:3000/login`
- **Inscription** : `http://localhost:3000/register`
- **API Health** : `http://localhost:3000/api/health`
- **API Docs** : `http://localhost:3000/api-docs`

### Dashboards par rôle :
- **Client** : `http://localhost:3000/client`
- **Livreur** : `http://localhost:3000/deliverer`
- **Commerçant** : `http://localhost:3000/merchant`
- **Prestataire** : `http://localhost:3000/provider`
- **Admin** : `http://localhost:3000/admin`

---

## 🔧 Tests API

### Connexion API
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"client-complete@test.com","password":"Test123!"}'
```

### Inscription API
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"Test123!","role":"CLIENT","firstName":"Test","lastName":"User","acceptsTerms":true}'
```

---

## 📊 Statuts des Comptes

| Rôle | Email | Statut | Dashboard | Fonctionnalités |
|------|-------|--------|-----------|-----------------|
| CLIENT | client-complete@test.com | ✅ Actif | `/client` | Tutoriel, Annonces, Services |
| DELIVERER | deliverer-complete@test.com | ⏳ Pending | `/deliverer` | Validation documents |
| MERCHANT | merchant-complete@test.com | ⏳ Pending | `/merchant` | Contrat à signer |
| PROVIDER | provider-complete@test.com | ⏳ Pending | `/provider` | Profil à valider |
| ADMIN | admin-complete@test.com | ✅ Actif | `/admin` | Toutes permissions |

---

## 🎯 Fonctionnalités Critiques Testées

### ✅ Authentification
- [x] Inscription 5 rôles
- [x] Connexion/déconnexion
- [x] Sessions sécurisées
- [x] Redirection par rôle

### ✅ Espaces Utilisateur
- [x] Dashboard client
- [x] Dashboard livreur
- [x] Dashboard commerçant
- [x] Dashboard prestataire
- [x] Dashboard admin

### ⏳ En Cours
- [ ] Tutoriel client obligatoire
- [ ] Validation documents admin
- [ ] Matching trajets/annonces
- [ ] Code validation 6 chiffres
- [ ] Facturation automatique prestataires

---

## 🚨 Notes Importantes

1. **Mode Développement** : Les comptes de test ne sont visibles qu'en mode développement
2. **Base de Données** : Tous les comptes sont créés dans la base PostgreSQL locale
3. **Sécurité** : Les mots de passe sont hashés avec bcrypt
4. **Sessions** : Utilisation de Better-Auth pour la gestion des sessions
5. **Permissions** : Middleware de vérification des rôles sur toutes les routes protégées

---

## 📞 Support

En cas de problème :
1. Vérifiez que le serveur Next.js est en cours d'exécution (`npm run dev`)
2. Vérifiez que PostgreSQL est actif
3. Consultez les logs dans la console
4. Testez l'API avec les endpoints de santé

**Dernière mise à jour** : 25 janvier 2025 