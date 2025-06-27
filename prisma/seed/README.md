# Système de Seed EcoDeli

Système complet de peuplement de base de données pour tester toutes les fonctionnalités de la plateforme EcoDeli.

## Utilisation

### Depuis la racine du projet
```bash
pnpm prisma db seed
```

### Depuis le dossier prisma
```bash
cd prisma
npm run seed
```

### Avec options
```bash
# Nettoyer avant de seeder
CLEAN_FIRST=true npm run seed

# Mode debug
LOG_LEVEL=debug npm run seed

# Limiter le nombre d'enregistrements
MAX_RECORDS=10 npm run seed
```

## Structure

### Configuration
- `config/seed.config.ts` - Configuration globale (variables d'environnement)
- `config/dependencies.ts` - Ordre d'exécution des seeds

### Données
- `data/constants.ts` - Constantes globales (rôles, statuts, etc.)
- `data/addresses/paris.ts` - Adresses réelles de Paris
- `data/addresses/marseille.ts` - Adresses réelles de Marseille
- `data/names/first-names.ts` - Prénoms français
- `data/names/last-names.ts` - Noms de famille français

### Utilitaires
- `utils/generators/code-generator.ts` - Génération de codes (validation, tracking, etc.)
- `utils/generators/reference-generator.ts` - Génération de références

### Seeds (ordre d'exécution)

#### Phase 1 : Base
1. ✅ `00-cleanup.seed.ts` - Nettoyage base de données
2. ✅ `01-users.seed.ts` - Création des 25 utilisateurs (5 par rôle)
3. ✅ `02-auth.seed.ts` - Sessions Better-Auth
4. ✅ `03-client.seed.ts` - Profils clients avec abonnements
5. ✅ `04-deliverer.seed.ts` - Profils livreurs avec véhicules
6. ✅ `05-merchant.seed.ts` - Profils commerçants avec contrats
7. ✅ `06-provider.seed.ts` - Profils prestataires avec services
8. ✅ `07-admin.seed.ts` - Profils administrateurs

#### Phase 2 : Données métier
9. ✅ `08-announcement.seed.ts` - 50+ annonces variées
10. ✅ `09-delivery.seed.ts` - 30+ livraisons avec statuts
11. ✅ `10a-delivery-validation.seed.ts` - Validations avec codes 6 chiffres
12. ✅ `10-booking.seed.ts` - Réservations de services
13. ✅ `11-payment.seed.ts` - Paiements et transactions
14. ✅ `12-invoice.seed.ts` - Factures (incluant mensuelles prestataires)
15. ✅ `13-location.seed.ts` - 6 entrepôts avec box de stockage
16. ✅ `14-document.seed.ts` - Documents utilisateurs (ID, permis, etc.)

#### Phase 3 : Fonctionnalités avancées
17. ✅ `15-notification.seed.ts` - Notifications et préférences
18. ✅ `16-review.seed.ts` - Avis et évaluations
19. ✅ `18-tutorial.seed.ts` - Progression tutoriel client
20. ❌ `19-tracking.seed.ts` - Tracking GPS (non créé - tables manquantes)
21. ❌ `20-support.seed.ts` - Tickets support (non créé - tables manquantes)
22. ❌ `21-certifications.seed.ts` - Certifications prestataires (non créé - tables manquantes)
23. ✅ `22-insurance.seed.ts` - Assurances colis
24. ❌ `23-referral.seed.ts` - Système de parrainage (non créé - tables manquantes)
25. ❌ `24-disputes.seed.ts` - Litiges et résolutions (non créé - tables manquantes)

## Comptes de Test

Tous les comptes utilisent le mot de passe : **Test123!**

### Clients
- `client1@test.com` - Abonnement FREE, tutoriel complété
- `client2@test.com` - Abonnement STARTER
- `client3@test.com` - Abonnement PREMIUM
- `client4@test.com` - Abonnement FREE, tutoriel en cours
- `client5@test.com` - Abonnement STARTER

### Livreurs
- `livreur1@test.com` - Validé, actif à Paris
- `livreur2@test.com` - Validé, actif à Marseille
- `livreur3@test.com` - En attente de validation
- `livreur4@test.com` - Rejeté (documents invalides)
- `livreur5@test.com` - Validé, multi-véhicules

### Commerçants
- `commercant1@test.com` - Carrefour (contrat PREMIUM)
- `commercant2@test.com` - Monoprix (contrat STANDARD)
- `commercant3@test.com` - Franprix (contrat STANDARD)
- `commercant4@test.com` - Picard (contrat PREMIUM)
- `commercant5@test.com` - Naturalia (contrat CUSTOM)

### Prestataires
- `prestataire1@test.com` - Services de ménage
- `prestataire2@test.com` - Jardinage
- `prestataire3@test.com` - Bricolage/Handyman
- `prestataire4@test.com` - Cours particuliers
- `prestataire5@test.com` - Multi-services

### Administrateurs
- `admin1@test.com` - Super Admin
- `admin2@test.com` - Admin Support
- `admin3@test.com` - Admin Finance
- `admin4@test.com` - Admin Opérations
- `admin5@test.com` - Admin Marketing

## Scénarios de Test

### Livraison complète
1. Connexion client : `client1@test.com`
2. Créer une annonce de livraison
3. Connexion livreur : `livreur1@test.com`
4. Accepter la livraison
5. Utiliser le code de validation à 6 chiffres
6. Vérifier le paiement

### Réservation service
1. Connexion client : `client2@test.com`
2. Rechercher un service (ex: ménage)
3. Réserver un créneau
4. Connexion prestataire : `prestataire1@test.com`
5. Valider l'intervention
6. Laisser un avis

### Validation documents
1. Connexion admin : `admin1@test.com`
2. Aller dans la section validation
3. Voir les documents de `livreur3@test.com`
4. Approuver ou rejeter

### Facturation mensuelle
1. Les factures des prestataires sont générées automatiquement
2. Vérifier dans la section factures
3. Les prestataires actifs ont des factures mensuelles

## Données Générées

### Volumes
- 25 utilisateurs (5 par rôle)
- 50+ annonces
- 30+ livraisons
- 20+ réservations de services
- 100+ paiements
- 50+ documents
- 6 entrepôts avec box
- Notifications pour tous les événements
- Avis sur services/livraisons terminés

### Périodes
- Données historiques sur 3 mois
- Mix de statuts (actif, terminé, annulé)
- Progression réaliste dans le temps

## Dépannage

### Erreur "Table not found"
Certaines tables n'existent pas encore dans le schéma Prisma :
- TrackingUpdate, DeliveryHistory, DeliveryEstimate
- SupportTicket, SupportMessage, SupportActivity, SupportTemplate
- Certification, ProviderSkill
- ReferralProgram, Referral, ReferralCode, ReferralReward, ReferralStats
- Dispute, DisputeMessage, DisputeResolution, DisputeStats

Ces seeds sont désactivés jusqu'à ce que les tables soient créées.

### Erreur de contrainte
```bash
# Nettoyer complètement et recommencer
CLEAN_FIRST=true npm run seed
```

### Mode debug
```bash
LOG_LEVEL=debug npm run seed
```

## Extension

Pour ajouter un nouveau seed :
1. Créer le fichier dans `seeds/XX-name.seed.ts`
2. Exporter une fonction `seedName(ctx: SeedContext)`
3. Ajouter dans `config/dependencies.ts`
4. Respecter les dépendances entre seeds

## Notes Importantes

- Les mots de passe sont tous "Test123!" pour faciliter les tests
- Les données sont cohérentes entre elles (relations respectées)
- Les dates sont réparties sur 3 mois pour du réalisme
- Les statuts sont variés pour tester tous les cas
- Les montants et distances sont calculés de manière réaliste 