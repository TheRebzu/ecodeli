# Analyse des besoins pour le système d'annonces d'EcoDeli

## Contexte
Le système d'annonces est une fonctionnalité essentielle de la plateforme EcoDeli qui permet aux utilisateurs de publier des demandes de livraison de colis. Ce système doit faciliter la mise en relation entre les clients qui ont besoin de faire livrer des colis et les livreurs qui peuvent effectuer ces livraisons.

## Modèle de données existant
Le schéma Prisma contient déjà un modèle `Announcement` avec les champs suivants :
- `id`: Identifiant unique de l'annonce
- `title`: Titre de l'annonce
- `description`: Description détaillée de l'annonce
- `pickupAddress`: Adresse de ramassage du colis
- `deliveryAddress`: Adresse de livraison du colis
- `packageSize`: Taille du colis (SMALL, MEDIUM, LARGE, EXTRA_LARGE)
- `packageWeight`: Poids du colis
- `packageValue`: Valeur du colis
- `deadline`: Date limite pour la livraison
- `price`: Prix proposé pour la livraison
- `requiresInsurance`: Indique si une assurance est requise
- `status`: Statut de l'annonce (OPEN, ASSIGNED, IN_TRANSIT, DELIVERED, CANCELLED)
- `paymentStatus`: Statut du paiement
- `createdAt`: Date de création de l'annonce
- `updatedAt`: Date de dernière mise à jour de l'annonce
- Relations :
  - `client`: Utilisateur qui a créé l'annonce
  - `deliverer`: Livreur assigné à l'annonce (optionnel)
  - `deliveries`: Livraisons associées à l'annonce
  - `payments`: Paiements associés à l'annonce

## Besoins fonctionnels

### 1. Gestion des annonces
- **Création d'annonces** : Les clients doivent pouvoir créer des annonces en spécifiant tous les détails nécessaires.
- **Modification d'annonces** : Les clients doivent pouvoir modifier leurs annonces tant qu'elles n'ont pas été assignées.
- **Suppression d'annonces** : Les clients doivent pouvoir supprimer leurs annonces tant qu'elles n'ont pas été assignées.
- **Consultation d'annonces** : Les clients doivent pouvoir consulter leurs annonces et leur statut.
- **Annulation d'annonces** : Les clients doivent pouvoir annuler leurs annonces (avec des règles spécifiques selon le statut).

### 2. Recherche et filtrage d'annonces
- **Recherche par localisation** : Les livreurs doivent pouvoir rechercher des annonces par proximité géographique.
- **Filtrage par critères** : Les livreurs doivent pouvoir filtrer les annonces par taille de colis, poids, prix, date limite, etc.
- **Tri des résultats** : Les résultats doivent pouvoir être triés par différents critères (prix, date, proximité).
- **Carte interactive** : Affichage des annonces sur une carte pour visualiser les trajets.

### 3. Processus de candidature et d'assignation
- **Candidature** : Les livreurs doivent pouvoir postuler pour prendre en charge une annonce.
- **Sélection du livreur** : Les clients doivent pouvoir choisir un livreur parmi les candidats.
- **Assignation automatique** : Option pour assigner automatiquement l'annonce au premier livreur qui postule.
- **Notification** : Les utilisateurs doivent être notifiés des changements de statut des annonces.

### 4. Suivi des livraisons
- **Mise à jour du statut** : Les livreurs doivent pouvoir mettre à jour le statut de la livraison.
- **Géolocalisation** : Option pour suivre la position du livreur en temps réel.
- **Confirmation de livraison** : Le client doit confirmer la réception du colis.
- **Évaluation** : Les clients et livreurs doivent pouvoir s'évaluer mutuellement après la livraison.

### 5. Système de paiement
- **Paiement à la création** : Option pour payer lors de la création de l'annonce.
- **Paiement à l'assignation** : Option pour payer lorsqu'un livreur est assigné.
- **Paiement à la livraison** : Option pour payer à la livraison.
- **Remboursement** : Processus de remboursement en cas d'annulation.
- **Commission** : Gestion des commissions prélevées par la plateforme.

### 6. Gestion des litiges
- **Signalement de problèmes** : Les utilisateurs doivent pouvoir signaler des problèmes.
- **Médiation** : Processus de médiation pour résoudre les litiges.
- **Remboursement partiel** : Option pour des remboursements partiels en cas de livraison partielle ou endommagée.

## Besoins non fonctionnels

### 1. Performance
- Le système doit pouvoir gérer un grand nombre d'annonces simultanément.
- Les recherches et filtrages doivent être rapides et efficaces.

### 2. Sécurité
- Protection des données personnelles des utilisateurs.
- Sécurisation des transactions financières.
- Prévention des fraudes et des abus.

### 3. Expérience utilisateur
- Interface intuitive et conviviale pour la création et la gestion des annonces.
- Processus de recherche et de candidature fluide pour les livreurs.
- Notifications claires et pertinentes pour tenir les utilisateurs informés.

### 4. Évolutivité
- Le système doit pouvoir évoluer pour intégrer de nouvelles fonctionnalités.
- L'architecture doit permettre l'ajout de nouveaux types d'annonces ou de services.

## Intégrations nécessaires

1. **Système de géolocalisation** : Pour la recherche par proximité et le suivi des livraisons.
2. **Système de paiement** : Intégration avec le système de paiement existant (Stripe).
3. **Système de notification** : Pour informer les utilisateurs des changements de statut.
4. **Système d'évaluation** : Pour permettre aux utilisateurs de s'évaluer mutuellement.

## Conclusion

Le système d'annonces d'EcoDeli doit être conçu pour faciliter la mise en relation entre clients et livreurs, tout en assurant la sécurité des transactions et la qualité du service. L'implémentation doit se baser sur le modèle de données existant tout en ajoutant les fonctionnalités nécessaires pour répondre aux besoins identifiés.
