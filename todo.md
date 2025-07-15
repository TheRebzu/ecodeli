# TODO - Suivi en Temps Réel des Livraisons & Chat Générique (détaillé)

---

## 1. Tracking temps réel côté livreur

### 1.1 Frontend (Livreur)
- [x] Créer le composant React `DeliveryTrackingSender.tsx` :
  - [x] Utiliser `navigator.geolocation.watchPosition` pour récupérer la position GPS.
  - [x] Envoyer la position à l'API `/api/deliveries/[id]/tracking` toutes les 10-30 secondes (fetch POST).
  - [x] Afficher un message d'avertissement si la géolocalisation n'est pas activée/refusée.
  - [x] Bloquer la navigation tant que la livraison n'est pas terminée (ou afficher un avertissement).
  - [x] Gérer l'arrêt du tracking si la livraison passe à DELIVERED/CANCELLED.

### 1.2 Backend (API Tracking)
- [x] Créer l'API route POST `/api/deliveries/[id]/tracking` :
  - [x] Authentifier le livreur (middleware/session).
  - [x] Valider les données reçues (Zod : latitude, longitude).
  - [x] Vérifier que le livreur est bien assigné à la livraison.
  - [x] Stocker la position dans la table `TrackingUpdate` (Prisma).
  - [x] Retourner un statut de succès ou d'erreur.
- [x] Créer l'API route GET `/api/deliveries/[id]/tracking` :
  - [x] Authentifier le client ou le livreur.
  - [x] Vérifier l'accès à la livraison.
  - [x] Retourner l'historique des positions (trié par date).

### 1.3 Sécurité & Permissions
- [x] Vérifier que seul le livreur assigné peut envoyer sa position.
- [x] Vérifier que seuls le client concerné et le livreur peuvent accéder au tracking.
- [x] Utiliser le middleware d'authentification et vérifier les rôles/ids.

### 1.4 Tests & Documentation
- [ ] Tester l'envoi de position (cURL, navigateur).
- [ ] Tester l'affichage côté client.
- [ ] Documenter le flux et les limitations (ex : tracking s'arrête si l'onglet est fermé).

---

## 2. Page de suivi côté client

### 2.1 Frontend (Client)
- [x] Créer la page React `/deliveries/[id]/tracking` :
  - [x] Afficher une carte interactive (Leaflet/Mapbox) avec la position actuelle du livreur.
  - [x] Récupérer l'historique des positions via GET `/api/deliveries/[id]/tracking` (poll toutes les 10-30s ou WebSocket).
  - [x] Afficher la trajectoire (polyline) et la position en temps réel.
  - [x] Afficher l'état de la livraison, ETA, etc.
  - [x] Afficher le module de chat (voir section 3).

### 2.2 Sécurité & Permissions
- [ ] Vérifier que seul le client concerné ou le livreur peut accéder à la page.
- [ ] Cacher/afficher les composants selon le rôle connecté.

### 2.3 Tests & Documentation
- [ ] Tester l'affichage de la carte et du tracking.
- [ ] Documenter l'expérience utilisateur.

---

## 3. Module de chat GÉNÉRIQUE (réutilisable)

### 3.1 Modélisation Prisma
- [x] Ajouter le modèle `ChatMessage` :
  - [x] Champs : id, contextType (enum : DELIVERY, BOOKING, SUPPORT, CONTRACT, GENERAL), contextId, senderId, message, createdAt
  - [x] Enum `ChatContextType`.

### 3.2 Backend (API Chat)
- [x] Créer l'API route POST `/api/chat` :
  - [x] Authentifier l'utilisateur (middleware/session).
  - [x] Valider les données (Zod : contextType, contextId, message).
  - [x] Vérifier que l'utilisateur a le droit d'accéder au contexte (ex : livraison, support, etc.).
  - [x] Stocker le message dans la table `ChatMessage`.
  - [x] Retourner le message créé.
- [x] Créer l'API route GET `/api/chat?contextType=DELIVERY&contextId=xxxx` :
  - [x] Authentifier l'utilisateur.
  - [x] Vérifier l'accès au contexte.
  - [x] Retourner l'historique des messages (trié par date).
  - [ ] (Optionnel) Mettre en place un WebSocket pour le chat temps réel.

### 3.3 Frontend (Composant Chat)
- [x] Créer un composant React Chat réutilisable :
  - [x] Prendre en props le contextType et le contextId.
  - [x] Afficher la liste des messages (avec expéditeur, date, etc.).
  - [x] Permettre d'envoyer un message (formulaire).
  - [x] Rafraîchir la liste en temps réel (polling ou WebSocket).
  - [x] UI : scroll auto, différencier client/livreur/admin, gestion des erreurs.

### 3.4 Sécurité & Permissions
- [ ] Vérifier côté API que l'utilisateur a le droit d'accéder au contexte.
- [ ] Cacher/afficher le chat selon le rôle et le contexte.

### 3.5 Réutilisation
- [x] Prévoir la réutilisation du chat pour :
  - [x] Livraison (DELIVERY)
  - [ ] Réservation (BOOKING)
  - [ ] Support (SUPPORT)
  - [ ] Contrat (CONTRACT)
  - [ ] Général (GENERAL)

### 3.6 Tests & Documentation
- [ ] Tester l'envoi et la réception de messages (cURL, UI).
- [ ] Documenter l'intégration du composant chat sur différentes pages.

---

## 4. Sécurisation globale & UX
- [x] Utiliser le middleware d'authentification partout.
- [ ] Vérifier dynamiquement les droits d'accès selon le contexte (livraison, réservation, etc.).
- [ ] Gérer les erreurs et afficher des messages clairs à l'utilisateur.
- [ ] Documenter tous les points de sécurité et d'UX.

---

## 5. Documentation & Tests finaux
- [ ] Lister tous les fichiers créés/modifiés (API, composants, schémas Prisma, validation Zod).
- [ ] Documenter les limitations techniques (tracking navigateur, WebSocket, etc.).
- [ ] Écrire des scénarios de tests (cURL, navigation, UX, sécurité).
- [ ] Vérifier la conformité avec les règles EcoDeli (pas de mock, sécurité, etc.). 