#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Correction des conflits de schémas...');

// 1. Renommer le DelivererServiceRoute pour éviter le conflit
let content = fs.readFileSync('prisma/schemas/deliveries/deliveries.prisma', 'utf8');
content = content.replace(/@@map\("deliverer_routes"\)/g, '@@map("deliverer_service_routes")');
fs.writeFileSync('prisma/schemas/deliveries/deliveries.prisma', content);

// 2. Ajouter les relations manquantes dans User
let userContent = fs.readFileSync('prisma/schemas/users/user.prisma', 'utf8');
if (!userContent.includes('merchantAnnouncements')) {
  userContent = userContent.replace(
    /clientAnnouncements\s+Announcement\[\]\s+@relation\("ClientAnnouncements"\)/,
    `clientAnnouncements      Announcement[]                @relation("ClientAnnouncements")
  merchantAnnouncements    Announcement[]                @relation("MerchantAnnouncements")
  relayDelivererAnnouncements Announcement[]             @relation("RelayDelivererAnnouncements")`
  );
  fs.writeFileSync('prisma/schemas/users/user.prisma', userContent);
}

// 3. Supprimer les modèles en conflit de matching.prisma (garder seulement announcements.prisma)
let matchingContent = fs.readFileSync('prisma/schemas/deliveries/matching.prisma', 'utf8');
// Supprimer RouteAnnouncementMatch et PlannedRoute dupliqués
matchingContent = matchingContent.replace(/model RouteAnnouncementMatch\s*\{[\s\S]*?\n\}/g, '');
matchingContent = matchingContent.replace(/model PlannedRoute\s*\{[\s\S]*?\n\}/g, '');
fs.writeFileSync('prisma/schemas/deliveries/matching.prisma', matchingContent);

// 4. Ajouter les relations manquantes dans Announcement
let announcementContent = fs.readFileSync('prisma/schemas/deliveries/announcements.prisma', 'utf8');
if (!announcementContent.includes('routeAnnouncementMatches')) {
  announcementContent = announcementContent.replace(
    /routeMatches\s+PlannedRouteAnnouncement\[\]\s+@relation\("PlannedRouteAnnouncement"\)/,
    `routeMatches      PlannedRouteAnnouncement[]  @relation("PlannedRouteAnnouncement")
  routeAnnouncementMatches RouteAnnouncementMatch[] @relation("RouteAnnouncementToAnnouncement")`
  );
  fs.writeFileSync('prisma/schemas/deliveries/announcements.prisma', announcementContent);
}

console.log('✅ Conflits résolus, régénération du schéma...');

// Régénérer le schéma
require('./merge-quick.cjs');
