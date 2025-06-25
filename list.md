# EcoDeli - Rapport de Fonctionnalités Projet Annuel 2024-2025

## 📋 Vue d'ensemble du Projet

**EcoDeli** est une plateforme de crowdshipping avec **3 missions obligatoires** :
- **Mission 1** : Gestion de la société (Application Web)
- **Mission 2** : Services supplémentaires (Java + Android + NFC)
- **Mission 3** : Infrastructure Système, Réseau et Sécurité

---

## 🎯 Mission 1 : Gestion de la Société

### 1.1 Espaces Utilisateur Obligatoires

#### ✅ Espace Livreurs
- [ ] **Inscription et validation** avec pièces justificatives
- [ ] **Gestion des annonces** de livraison
- [ ] **Gestion des trajets** déclarés à l'avance
- [ ] **Matching automatique** avec notifications
- [ ] **Gestion des livraisons** (toutes formes)
- [ ] **Système de paiement** avec portefeuille
- [ ] **Planning et déplacements**
- [ ] **Code de validation** à 6 chiffres pour livraisons
- [ ] **Carte NFC** après validation

#### ✅ Espace Clients
- [ ] **Tutoriel obligatoire** première connexion (overlay bloquant)
- [ ] **Dépôt d'annonces** avec détails
- [ ] **Réservation de services** à la personne
- [ ] **Gestion des paiements** et abonnements
- [ ] **Suivi des livraisons** en temps réel
- [ ] **Accès aux box de stockage** temporaire
- [ ] **Abonnements** : Free (€0), Starter (€9.90), Premium (€19.99)

#### ✅ Espace Commerçants
- [ ] **Gestion des contrats** avec EcoDeli
- [ ] **Création d'annonces** produits
- [ ] **Configuration lâcher de chariot**
- [ ] **Facturation** des services
- [ ] **Gestion des paiements**
- [ ] **Import bulk** d'annonces

#### ✅ Espace Prestataires
- [ ] **Validation avec certifications**
- [ ] **Calendrier de disponibilités**
- [ ] **Gestion des interventions**
- [ ] **Évaluations clients**
- [ ] **Facturation mensuelle automatique** (30 de chaque mois)
- [ ] **Tarifs négociés** avec EcoDeli

#### ✅ Back Office Admin
- [ ] **Validation documents** livreurs/prestataires
- [ ] **Gestion complète utilisateurs**
- [ ] **Monitoring livraisons** et litiges
- [ ] **Gestion financière** globale
- [ ] **Configuration des 6 entrepôts**
- [ ] **Paramètres services cloud**

### 1.2 Services EcoDeli Obligatoires

#### Services de Livraison
- [ ] **Transport de colis** (intégral ou partiel avec relais)
- [ ] **Transport de personnes**
- [ ] **Transfert aéroport**
- [ ] **Courses** (liste fournie au livreur)
- [ ] **Achats internationaux**
- [ ] **Lâcher de chariot** (livraison à domicile)

#### Services à la Personne
- [ ] **Garde d'animaux** à domicile
- [ ] **Services à domicile** (ménage, jardinage)
- [ ] **Transport quotidien** de personnes
- [ ] **Petits travaux** ménagers/jardinage

#### Infrastructure de Stockage
- [ ] **6 entrepôts** : Paris, Marseille, Lyon, Lille, Montpellier, Rennes
- [ ] **Box de stockage temporaire**
- [ ] **Gestion des locations** de box

### 1.3 Intégrations Techniques Obligatoires

#### Paiements
- [ ] **Stripe** pour tous les paiements
- [ ] **Webhooks sécurisés** pour événements
- [ ] **Gestion des abonnements** récurrents
- [ ] **Portefeuille livreur** avec retraits

#### Notifications
- [ ] **OneSignal** pour notifications push
- [ ] **Notifications automatiques** :
  - Nouvelle annonce matchée
  - Livraison acceptée/refusée
  - Code validation reçu
  - Paiement effectué
  - Document validé/rejeté

#### Documents
- [ ] **Génération PDF automatique** des factures
- [ ] **Archive accessible** des documents
- [ ] **Virement bancaire simulé** pour prestataires

#### Multilingue
- [ ] **Support FR/EN obligatoire**
- [ ] **Ajout de langues** sans modification code
- [ ] **Interface complète traduite**

---

## 🛠️ Mission 2 : Services Supplémentaires

### 2.1 Application Java Autonome
- [ ] **Rapport graphique** de l'activité
- [ ] **Récupération données** :
  - Comptes commerçants avec factures
  - Livraisons détaillées (type, contenu, modalités)
  - Prestations détaillées
- [ ] **30 enregistrements minimum** par type
- [ ] **Génération PDF** avec :
  - 4 diagrammes comptes commerçants/clients
  - Top 5 clients les plus fidèles
  - 4 diagrammes statistiques prestations
  - Top 5 prestations les plus demandées
- [ ] **Bonus** : Application Data Mining

### 2.2 Application Android
- [ ] **Accès aux livraisons** et prestations
- [ ] **Validation de livraison**
- [ ] **Gestion des comptes** clients
- [ ] **Interface mobile** optimisée

### 2.3 Carte NFC Livreurs
- [ ] **Reconnaissance** par les clients
- [ ] **Validation** des livraisons
- [ ] **Sécurisation** des échanges

---

## 🏗️ Mission 3 : Infrastructure Système, Réseau et Sécurité

### 3.1 Architecture Réseau EDN (EcoDeli Network)

#### Site Principal Paris
- [ ] **Active Directory** Windows Server 2019/2022/2025
- [ ] **Baie de stockage** (missions 1 et 2 incluses)
- [ ] **DMZ** avec serveur mails Linux (Postfix)
- [ ] **Accès multiples** :
  - Externe clients/prestataires via DMZ
  - Interne salariés sur LAN
  - VPN distant télétravail
- [ ] **5 VLAN** : Direction, Marketing, Commercial, RH, Informatique
- [ ] **2 Firewalls OPNSense**
- [ ] **Outils de supervision** :
  - GLPI (ticketing)
  - Zabbix/Nagios (monitoring)

#### Site Marseille
- [ ] **Serveur Mail de backup**
- [ ] **VPN site-to-site**
- [ ] **VPN client-to-site**

#### Site Lyon
- [ ] **Serveur DHCP** Linux
- [ ] **Serveur DNS** Linux
- [ ] **2 OPNSense** pour filtrage
- [ ] **Backup infrastructure** :
  - Journalier à 23h
  - Mensuel le 30

#### Site Lille
- [ ] **RODC** (Read-Only Domain Controller)
- [ ] **Stockage partagé direction** (chiffré)
- [ ] **Données RGPD**
- [ ] **2 Firewall OPNSense**
- [ ] **VPN utilisateurs distants**

### 3.2 Configuration Réseau EDN
- [ ] **Protocole RIP v2** entre routeurs
- [ ] **VPN IPSec over GRE** inter-sites
- [ ] **ACL** pour gestion flux
- [ ] **Redondance HSRP/VRRP**

### 3.3 Sécurité et Haute Disponibilité
- [ ] **HTTPS SSL/TLS** obligatoire
- [ ] **Règles firewall précises**
- [ ] **Cluster haute disponibilité**
- [ ] **Basculement automatique**
- [ ] **Déploiement Docker** (missions 1 et 2)

---

## 📊 Livrables Obligatoires

### Documentation Technique
- [ ] **Rapports de réunions** (3 fois/mois minimum)
- [ ] **Tableau Kanban Trello**
- [ ] **Estimation budget** avec devis
- [ ] **Planification GANTT**
- [ ] **Analyse des risques RACI**
- [ ] **Document d'Architecture Technique (DAT)**

### Contraintes Techniques
- [ ] **GitHub obligatoire** (compte par membre)
- [ ] **Application Web** JavaScript/PHP/Frameworks/API
- [ ] **Langages variés** : Python, C, Java (pas que web)
- [ ] **Script de déploiement** packagé
- [ ] **Virtualisation** VMware/ProxMox/Eve-NG/GNS3
- [ ] **Budget hébergement** max 40€/mois

---

## 🎯 Priorités de Développement

### Phase 1 : Fondations (Semaines 1-2)
1. ✅ Setup Next.js 15 + Prisma + PostgreSQL
2. ✅ Modèles de données complets
3. ✅ Authentification Better-Auth
4. [ ] Configuration environnements

### Phase 2 : Mission 1 Core (Semaines 3-6)
1. [ ] API Routes complètes
2. [ ] 5 espaces utilisateur
3. [ ] Intégrations Stripe + OneSignal
4. [ ] Tutoriel client overlay
5. [ ] Code validation 6 chiffres

### Phase 3 : Mission 2 (Semaines 7-8)
1. [ ] Application Java avec PDF
2. [ ] Application Android
3. [ ] Système NFC

### Phase 4 : Mission 3 (Semaines 9-12)
1. [ ] Infrastructure réseau EDN
2. [ ] Configuration sites
3. [ ] Sécurité et monitoring
4. [ ] Déploiement production

---

## ⚠️ Points Critiques de Validation

### Fonctionnalités Bloquantes
- [ ] **Tutoriel client** overlay première connexion
- [ ] **Code validation** 6 chiffres livraisons
- [ ] **Facturation automatique** prestataires (30/mois)
- [ ] **Matching trajets/annonces** automatique
- [ ] **Notifications push** OneSignal
- [ ] **Abonnements** 3 niveaux fonctionnels
- [ ] **Multilingue** FR/EN complet

### Intégrations Critiques
- [ ] **Stripe** paiements + webhooks
- [ ] **jsPDF** génération factures
- [ ] **Upload documents** sécurisé
- [ ] **Validation admin** documents
- [ ] **6 entrepôts** configurés

### Tests End-to-End Obligatoires
- [ ] Inscription → validation → activation livreur
- [ ] Création annonce → matching → livraison → paiement
- [ ] Réservation service → intervention → évaluation
- [ ] Upload document → validation admin → notification

---

## 📈 Métriques de Succès

### Technique
- [ ] **100% des API routes** fonctionnelles
- [ ] **0 erreur** validation Prisma
- [ ] **Tous les rôles** authentifiés
- [ ] **Toutes les intégrations** testées

### Fonctionnel
- [ ] **5 espaces utilisateur** opérationnels
- [ ] **Tous les services** EcoDeli implémentés
- [ ] **Infrastructure réseau** complète
- [ ] **Documentation** exhaustive

### Qualité
- [ ] **Code review** systématique
- [ ] **Tests unitaires** critiques
- [ ] **Performance** optimisée
- [ ] **Sécurité** validée

---

## 🚨 Risques et Mitigation

### Risques Techniques
- **Complexité intégrations** → Tests précoces
- **Performance base de données** → Optimisation requêtes
- **Sécurité réseau** → Audit régulier

### Risques Projet
- **Retard développement** → Priorisation features
- **Budget dépassé** → Monitoring coûts
- **Qualité insuffisante** → Reviews fréquentes

Ce rapport doit être mis à jour **hebdomadairement** avec l'avancement réel des fonctionnalités.


