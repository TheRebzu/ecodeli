# Différence entre les pages Client et Provider - Demandes de Services

## Vue d'ensemble

Les pages `/fr/client/service-requests` et `/fr/provider/service-requests` ont des objectifs différents et affichent des données différentes. C'est **normal** qu'elles ne montrent pas les mêmes informations.

## Page Client (`/fr/client/service-requests`)

### Objectif
Le client voit **ses propres demandes de services** qu'il a créées.

### API utilisée
- **Endpoint** : `/api/client/service-requests`
- **Méthode** : GET
- **Authentification** : Client connecté

### Filtres appliqués
```typescript
const where = {
  authorId: user.id,        // Seulement les annonces créées par ce client
  type: 'HOME_SERVICE'      // Seulement les demandes de services
}
```

### Données affichées
- ✅ Demandes de services créées **par le client connecté**
- ✅ Statut de chaque demande (ACTIVE, IN_PROGRESS, COMPLETED, etc.)
- ✅ Informations sur le prestataire assigné (si applicable)
- ✅ Historique des demandes du client

### Exemple d'utilisation
- Client crée une demande "Ménage complet appartement"
- Client voit cette demande dans sa liste
- Client peut suivre le statut de sa demande

---

## Page Provider (`/fr/provider/service-requests`)

### Objectif
Le prestataire voit **toutes les demandes de services disponibles** pour qu'il puisse les accepter.

### API utilisée
- **Endpoint** : `/api/provider/service-requests`
- **Méthode** : GET
- **Authentification** : Prestataire connecté

### Filtres appliqués
```typescript
const where = {
  type: 'HOME_SERVICE',           // Seulement les demandes de services
  status: 'ACTIVE',               // Seulement les demandes actives
  // Filtrage par spécialités du prestataire
  OR: providerServiceTypes.map(serviceType => ({
    serviceDetails: {
      path: ['serviceType'],
      equals: serviceType
    }
  }))
}
```

### Données affichées
- ✅ **Toutes** les demandes de services actives de **tous les clients**
- ✅ Filtrées selon les spécialités du prestataire
- ✅ Informations sur les clients (anonymisées)
- ✅ Demandes disponibles pour acceptation

### Exemple d'utilisation
- Prestataire spécialisé en "HOME_SERVICE" voit toutes les demandes de ménage
- Prestataire peut accepter les demandes qui l'intéressent
- Prestataire voit les détails (budget, durée, exigences)

---

## Pourquoi des données différentes ?

### 1. Rôles différents
- **Client** : Crée des demandes et suit ses propres demandes
- **Provider** : Consulte les demandes disponibles et accepte celles qui l'intéressent

### 2. Sécurité et confidentialité
- **Client** : Ne voit que ses propres données
- **Provider** : Voir les demandes publiques mais pas les données privées des clients

### 3. Workflow métier
- **Client** : Workflow de création et suivi
- **Provider** : Workflow de consultation et acceptation

---

## Flux typique

### 1. Client crée une demande
```
Client → Page client → Créer demande → API POST /api/client/service-requests
```

### 2. Demande visible pour les prestataires
```
Demande → Base de données → API GET /api/provider/service-requests → Page provider
```

### 3. Prestataire accepte la demande
```
Provider → Page provider → Accepter → API POST /api/provider/service-requests/[id]/accept
```

### 4. Client voit le statut mis à jour
```
Client → Page client → Voir statut "ACCEPTED" → API GET /api/client/service-requests
```

---

## Résolution des problèmes

### Problème : "Je ne vois pas les mêmes services"

**Solution** : C'est normal ! Les deux pages ont des objectifs différents.

### Problème : "Aucune demande visible pour le prestataire"

**Vérifications** :
1. ✅ Des annonces `HOME_SERVICE` existent dans la base
2. ✅ Les annonces ont le statut `ACTIVE`
3. ✅ Le prestataire a des services de type `HOME_SERVICE`
4. ✅ Les `serviceDetails.serviceType` correspondent aux types de services du prestataire

### Problème : "Client ne voit pas ses demandes"

**Vérifications** :
1. ✅ Le client est bien connecté
2. ✅ Le client a créé des demandes de type `HOME_SERVICE`
3. ✅ Les demandes ont bien `authorId` = ID du client connecté

---

## Tests recommandés

### Test Client
1. Se connecter en tant que client
2. Créer une nouvelle demande de service
3. Vérifier qu'elle apparaît dans `/fr/client/service-requests`

### Test Provider
1. Se connecter en tant que prestataire
2. Vérifier que la demande du client apparaît dans `/fr/provider/service-requests`
3. Tester l'acceptation de la demande

### Test End-to-End
1. Client crée demande
2. Provider voit et accepte la demande
3. Client voit le statut mis à jour 