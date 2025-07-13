# 📢 Système d'Annonces EcoDeli

## Vue d'ensemble

Le système d'annonces EcoDeli permet la mise en relation entre clients/commerçants et livreurs/prestataires pour tous types de services de livraison et de transport.

## 🏗️ Architecture

### Structure des dossiers

```
src/features/announcements/
├── components/           # Composants UI par rôle
│   ├── client/          # Interface client
│   ├── deliverer/       # Interface livreur
│   ├── merchant/        # Interface commerçant
│   ├── admin/           # Interface admin
│   └── shared/          # Composants partagés
├── services/            # Services métier
├── schemas/             # Validation Zod
├── types/               # Types TypeScript
├── hooks/               # Hooks React
└── utils/               # Utilitaires
```

## 🔄 Flux complet

1. **Création** → Client/Commerçant dépose une annonce
2. **Matching** → Système trouve des livreurs compatibles
3. **Notification** → Livreurs reçoivent une alerte OneSignal
4. **Acceptation** → Livreur accepte l'opportunité
5. **Paiement** → Client paie via Stripe, fonds bloqués
6. **Livraison** → Suivi temps réel avec géolocalisation
7. **Validation** → Code 6 chiffres + photo/signature
8. **Finalisation** → Déblocage paiement + évaluations

## 📋 Types d'annonces supportés

- **PACKAGE_DELIVERY** : Livraison de colis
- **PERSON_TRANSPORT** : Transport de personnes
- **AIRPORT_TRANSFER** : Transfert aéroport
- **SHOPPING** : Courses avec liste fournie
- **INTERNATIONAL_PURCHASE** : Achats internationaux
- **PET_SITTING** : Garde d'animaux
- **HOME_SERVICE** : Services à domicile
- **CART_DROP** : Lâcher de chariot (service phare)

## 🌐 APIs disponibles

### APIs Client

- `GET/POST /api/client/announcements` - Gestion des annonces
- `GET/PUT/DELETE /api/client/announcements/[id]` - CRUD annonce spécifique
- `GET /api/client/announcements/[id]/tracking` - Suivi livraison

### APIs Livreur

- `GET /api/deliverer/opportunities` - Opportunités matchées
- `POST /api/deliverer/opportunities/[id]/accept` - Accepter opportunité
- `POST /api/deliverer/routes` - Déclarer trajets à l'avance
- `POST /api/deliverer/deliveries/[id]/validate` - Valider livraison

### APIs Commerçant

- `GET/POST /api/merchant/announcements/bulk` - Import/Export CSV
- `POST /api/merchant/announcements/bulk` - Import en masse
- `GET /api/merchant/announcements/analytics` - Statistiques

### APIs Admin

- `GET /api/admin/announcements` - Modération
- `GET /api/admin/announcements/analytics` - Analytics globales
- `POST /api/admin/announcements/[id]/moderate` - Actions modération

### APIs Partagées

- `GET /api/shared/announcements/search` - Recherche avancée
- `POST /api/shared/announcements/[id]/match` - Relancer matching
- `GET /api/shared/deliveries/[id]/tracking` - Suivi public

## 🔍 Algorithme de Matching

### Critères de scoring (0-1)

- **Distance** (40%) : Proximité géographique pickup/delivery
- **Timing** (30%) : Compatibilité horaires livreur/annonce
- **Capacité** (20%) : Volume/poids vs capacité véhicule
- **Type** (10%) : Type d'annonce accepté par livreur

### Seuils

- Score minimum : 60% pour notification
- Seuils assouplis après 2h sans match (40%)
- Zone élargie après 4h (+25% rayon)
- Expiration : 24h pour répondre à une opportunité

## 📱 Notifications OneSignal

### Types de notifications

- **MATCH_FOUND** : Nouvelle opportunité trouvée
- **ACCEPTED** : Annonce acceptée par livreur
- **REMINDER** : Rappel avant échéance (30min, 2h, 24h)
- **STATUS_CHANGED** : Changement statut livraison
- **DELIVERED** : Livraison terminée

### Payload standard

```json
{
  "title": "🚚 Nouvelle opportunité",
  "message": "Livraison 25€ - Paris → Versailles",
  "data": {
    "type": "MATCH_FOUND",
    "announcementId": "abc123",
    "score": 85,
    "expiresAt": "2024-12-31T14:00:00Z"
  }
}
```

## 💳 Intégration Stripe

### Workflow paiement

1. Client crée annonce → Paiement en attente
2. Livreur accepte → Fonds bloqués (pre-auth)
3. Livraison validée → Capture paiement
4. Répartition automatique :
   - Livreur : 85%
   - Plateforme : 15%

### Gestion des litiges

- Remboursement partiel/total possible
- Historique des transactions
- Rapports comptables automatiques

## 📊 Système de Cache & Performance

### Cache Redis

- Matching results : 15min
- Géolocalisation : 1h
- Statistics : 30min
- User sessions : 24h

### Optimisations

- Pagination efficace (cursor-based)
- Index géospatiaux Postgres
- Lazy loading des relations
- Compression des payloads API

## 🔐 Sécurité

### Validations

- Anti-spam : Max 10 annonces/jour clients gratuits
- Géofencing : Zones autorisées uniquement
- Blacklist : Mots-clés interdits
- Rate limiting : 100 req/min par IP

### Permissions

- Clients : CRUD propres annonces uniquement
- Livreurs : Lecture opportunités + acceptation
- Commerçants : Bulk operations + analytics
- Admin : Toutes permissions + modération

## 🧪 Tests

### Tests unitaires

- Services métier (matching, notifications)
- Validations schemas Zod
- Hooks React (render testing)

### Tests d'intégration

- Workflow complet création → livraison
- API endpoints avec authentification
- Intégrations Stripe & OneSignal

### Tests de charge

- 1000 annonces simultanées
- 100 matchings/seconde
- Taille base données : 1M+ annonces

## 🚀 Déploiement

### Variables d'environnement requises

```env
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
ONESIGNAL_APP_ID=...
ONESIGNAL_API_KEY=...
REDIS_URL=redis://...
GOOGLE_MAPS_API_KEY=...
```

### Scripts de maintenance

```bash
# Nettoyage données expirées
npm run cleanup:announcements

# Relance matching stagnant
npm run matching:retrigger

# Export analytics mensuel
npm run analytics:export
```

## 📈 Monitoring & Analytics

### Métriques clés

- Taux de matching : >70%
- Temps moyen acceptation : <2h
- Taux de complétion : >95%
- Satisfaction client : >4.5/5

### Alertes automatiques

- Matching rate < 50%
- Temps réponse API > 2s
- Erreurs Stripe ou OneSignal
- Capacité base données > 80%

## 🔮 Roadmap

### Phase 2 (Q1 2025)

- Enchères inversées (livreurs proposent prix)
- Groupage intelligent multi-colis
- IA prédictive pour optimisation trajets
- App mobile React Native

### Phase 3 (Q2 2025)

- Intégration 6 entrepôts physiques
- Service clients chatbot IA
- Blockchain pour traçabilité
- Expansion européenne

---

## 🆘 Support

Pour toute question technique :

- 📧 dev@ecodeli.fr
- 📱 Slack #dev-announcements
- 📚 Documentation complète : `/docs/announcements`
