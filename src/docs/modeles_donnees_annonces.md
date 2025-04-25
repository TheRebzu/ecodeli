# Conception des modèles de données pour le système d'annonces d'EcoDeli

## Modèles existants à utiliser

### Modèle Announcement

```prisma
model Announcement {
  id                String               @id @default(cuid())
  title             String
  description       String               @db.Text
  pickupAddress     String
  deliveryAddress   String
  packageSize       PackageSize
  packageWeight     Float
  packageValue      Float
  deadline          DateTime
  price             Float
  requiresInsurance Boolean              @default(false)
  status            AnnouncementStatus   @default(OPEN)
  paymentStatus     PaymentStatus?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  // Relations
  clientId    String
  client      User                @relation("ClientAnnouncements", fields: [clientId], references: [id])
  delivererId String?
  deliverer   User?               @relation("DelivererAnnouncements", fields: [delivererId], references: [id])
  deliveries  Delivery[]
  payments    Payment[]
}
```

### Énumérations existantes

```prisma
enum PackageSize {
  SMALL
  MEDIUM
  LARGE
  EXTRA_LARGE
}

enum AnnouncementStatus {
  OPEN
  ASSIGNED
  IN_TRANSIT
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  PAID_TO_DELIVERER
  REFUNDED
}
```

## Nouveaux modèles à ajouter

### Modèle AnnouncementApplication

Ce modèle représente les candidatures des livreurs pour prendre en charge une annonce.

```prisma
model AnnouncementApplication {
  id            String                    @id @default(cuid())
  message       String?                   @db.Text
  price         Float                     // Prix proposé par le livreur
  status        ApplicationStatus         @default(PENDING)
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  delivererId    String
  deliverer      User                     @relation(fields: [delivererId], references: [id])

  @@unique([announcementId, delivererId])
}

enum ApplicationStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED
}
```

### Modèle AnnouncementReview

Ce modèle représente les évaluations laissées par les clients et les livreurs après une livraison.

```prisma
model AnnouncementReview {
  id            String                    @id @default(cuid())
  rating        Int                       // Note de 1 à 5
  comment       String?                   @db.Text
  reviewType    ReviewType                // Type d'évaluation (client vers livreur ou livreur vers client)
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id])
  reviewerId     String
  reviewer       User                     @relation("ReviewerReviews", fields: [reviewerId], references: [id])
  targetId       String
  target         User                     @relation("TargetReviews", fields: [targetId], references: [id])

  @@unique([announcementId, reviewerId, targetId])
}

enum ReviewType {
  CLIENT_TO_DELIVERER
  DELIVERER_TO_CLIENT
}
```

### Modèle AnnouncementDispute

Ce modèle représente les litiges liés aux annonces.

```prisma
model AnnouncementDispute {
  id            String                    @id @default(cuid())
  reason        String                    @db.Text
  status        DisputeStatus             @default(OPEN)
  resolution    String?                   @db.Text
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id])
  creatorId      String
  creator        User                     @relation("DisputeCreator", fields: [creatorId], references: [id])
  defenderId     String
  defender       User                     @relation("DisputeDefender", fields: [defenderId], references: [id])
  adminId        String?
  admin          User?                    @relation("DisputeAdmin", fields: [adminId], references: [id])
}

enum DisputeStatus {
  OPEN
  IN_MEDIATION
  RESOLVED
  CLOSED
}
```

### Modèle AnnouncementMessage

Ce modèle représente les messages échangés entre le client et le livreur concernant une annonce.

```prisma
model AnnouncementMessage {
  id            String                    @id @default(cuid())
  content       String                    @db.Text
  isRead        Boolean                   @default(false)
  createdAt     DateTime                  @default(now())

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User                     @relation("MessageSender", fields: [senderId], references: [id])
  receiverId     String
  receiver       User                     @relation("MessageReceiver", fields: [receiverId], references: [id])
}
```

### Modèle AnnouncementLocation

Ce modèle représente les coordonnées géographiques des adresses de ramassage et de livraison.

```prisma
model AnnouncementLocation {
  id            String                    @id @default(cuid())
  latitude      Float
  longitude     Float
  locationType  LocationType

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  @@unique([announcementId, locationType])
}

enum LocationType {
  PICKUP
  DELIVERY
}
```

## Modifications à apporter aux modèles existants

### Mise à jour du modèle User

Ajouter des relations pour les nouveaux modèles.

```prisma
model User {
  // Champs existants...

  // Relations existantes...
  clientAnnouncements      Announcement[]           @relation("ClientAnnouncements")
  delivererAnnouncements   Announcement[]           @relation("DelivererAnnouncements")

  // Nouvelles relations
  announcementApplications AnnouncementApplication[] @relation()
  reviewsGiven             AnnouncementReview[]      @relation("ReviewerReviews")
  reviewsReceived          AnnouncementReview[]      @relation("TargetReviews")
  disputesCreated          AnnouncementDispute[]     @relation("DisputeCreator")
  disputesDefended         AnnouncementDispute[]     @relation("DisputeDefender")
  disputesMediated         AnnouncementDispute[]     @relation("DisputeAdmin")
  messagesSent             AnnouncementMessage[]     @relation("MessageSender")
  messagesReceived         AnnouncementMessage[]     @relation("MessageReceiver")
}
```

### Mise à jour du modèle Announcement

Ajouter des relations pour les nouveaux modèles.

```prisma
model Announcement {
  // Champs existants...

  // Relations existantes...

  // Nouvelles relations
  applications  AnnouncementApplication[]
  reviews       AnnouncementReview[]
  disputes      AnnouncementDispute[]
  messages      AnnouncementMessage[]
  locations     AnnouncementLocation[]
}
```

## Nouvelles énumérations à ajouter

```prisma
enum ApplicationStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED
}

enum ReviewType {
  CLIENT_TO_DELIVERER
  DELIVERER_TO_CLIENT
}

enum DisputeStatus {
  OPEN
  IN_MEDIATION
  RESOLVED
  CLOSED
}

enum LocationType {
  PICKUP
  DELIVERY
}
```

## Schéma Prisma complet pour le système d'annonces

```prisma
// Modèles existants avec modifications
model Announcement {
  id                String               @id @default(cuid())
  title             String
  description       String               @db.Text
  pickupAddress     String
  deliveryAddress   String
  packageSize       PackageSize
  packageWeight     Float
  packageValue      Float
  deadline          DateTime
  price             Float
  requiresInsurance Boolean              @default(false)
  status            AnnouncementStatus   @default(OPEN)
  paymentStatus     PaymentStatus?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  // Relations existantes
  clientId    String
  client      User                @relation("ClientAnnouncements", fields: [clientId], references: [id])
  delivererId String?
  deliverer   User?               @relation("DelivererAnnouncements", fields: [delivererId], references: [id])
  deliveries  Delivery[]
  payments    Payment[]

  // Nouvelles relations
  applications  AnnouncementApplication[]
  reviews       AnnouncementReview[]
  disputes      AnnouncementDispute[]
  messages      AnnouncementMessage[]
  locations     AnnouncementLocation[]
}

// Nouveaux modèles
model AnnouncementApplication {
  id            String                    @id @default(cuid())
  message       String?                   @db.Text
  price         Float
  status        ApplicationStatus         @default(PENDING)
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  delivererId    String
  deliverer      User                     @relation(fields: [delivererId], references: [id])

  @@unique([announcementId, delivererId])
}

model AnnouncementReview {
  id            String                    @id @default(cuid())
  rating        Int
  comment       String?                   @db.Text
  reviewType    ReviewType
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id])
  reviewerId     String
  reviewer       User                     @relation("ReviewerReviews", fields: [reviewerId], references: [id])
  targetId       String
  target         User                     @relation("TargetReviews", fields: [targetId], references: [id])

  @@unique([announcementId, reviewerId, targetId])
}

model AnnouncementDispute {
  id            String                    @id @default(cuid())
  reason        String                    @db.Text
  status        DisputeStatus             @default(OPEN)
  resolution    String?                   @db.Text
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id])
  creatorId      String
  creator        User                     @relation("DisputeCreator", fields: [creatorId], references: [id])
  defenderId     String
  defender       User                     @relation("DisputeDefender", fields: [defenderId], references: [id])
  adminId        String?
  admin          User?                    @relation("DisputeAdmin", fields: [adminId], references: [id])
}

model AnnouncementMessage {
  id            String                    @id @default(cuid())
  content       String                    @db.Text
  isRead        Boolean                   @default(false)
  createdAt     DateTime                  @default(now())

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User                     @relation("MessageSender", fields: [senderId], references: [id])
  receiverId     String
  receiver       User                     @relation("MessageReceiver", fields: [receiverId], references: [id])
}

model AnnouncementLocation {
  id            String                    @id @default(cuid())
  latitude      Float
  longitude     Float
  locationType  LocationType

  // Relations
  announcementId String
  announcement   Announcement             @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  @@unique([announcementId, locationType])
}

// Énumérations existantes
enum PackageSize {
  SMALL
  MEDIUM
  LARGE
  EXTRA_LARGE
}

enum AnnouncementStatus {
  OPEN
  ASSIGNED
  IN_TRANSIT
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  PAID_TO_DELIVERER
  REFUNDED
}

// Nouvelles énumérations
enum ApplicationStatus {
  PENDING
  ACCEPTED
  REJECTED
  CANCELLED
}

enum ReviewType {
  CLIENT_TO_DELIVERER
  DELIVERER_TO_CLIENT
}

enum DisputeStatus {
  OPEN
  IN_MEDIATION
  RESOLVED
  CLOSED
}

enum LocationType {
  PICKUP
  DELIVERY
}
```

## Conclusion

Cette conception des modèles de données pour le système d'annonces d'EcoDeli s'appuie sur le modèle `Announcement` existant et ajoute plusieurs nouveaux modèles pour gérer les candidatures, les évaluations, les litiges, les messages et les coordonnées géographiques. Ces modèles permettront d'implémenter toutes les fonctionnalités identifiées dans l'analyse des besoins, tout en maintenant une structure de données cohérente et évolutive.
