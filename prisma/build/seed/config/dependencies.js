"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDependencies = exports.seedOrder = void 0;
exports.getExecutionOrder = getExecutionOrder;
// Configuration des dépendances entre les seeds
// Définit l'ordre d'exécution en respectant les dépendances
exports.seedOrder = {
  // Seeds de base - aucune dépendance
  "00-cleanup": [],
  "01-users": ["00-cleanup"],
  "02-auth": ["01-users"],
  "03-client": ["01-users"],
  "04-deliverer": ["01-users"],
  "05-merchant": ["01-users"],
  "06-provider": ["01-users"],
  "07-admin": ["01-users"],
  // Seeds dépendant des utilisateurs
  "08-announcement": ["03-client", "05-merchant"],
  "09-delivery": ["08-announcement", "04-deliverer"],
  "10a-delivery-validation": ["09-delivery"],
  "10-booking": ["06-provider", "03-client"],
  "11-payment": ["09-delivery", "10-booking"],
  "12-invoice": ["11-payment", "10-booking"],
  "13-location": ["01-users"],
  "14-document": ["04-deliverer", "06-provider"],
  // Nouveaux seeds avec leurs dépendances
  "15-notification": ["09-delivery", "10-booking", "14-document"],
  "16-review": ["09-delivery", "10-booking"],
  "17-contract": ["05-merchant"],
  "18-tutorial": ["03-client"],
  "19-tracking": ["09-delivery"],
  "20-support": ["01-users", "09-delivery", "10-booking"],
  "21-certifications": ["06-provider"],
  "22-insurance": ["09-delivery", "11-payment"],
  "23-referral": ["01-users"],
  "24-disputes": ["09-delivery", "10-booking"],
  "25-analytics": ["09-delivery", "10-booking", "11-payment"],
};
// Ordre d'exécution calculé automatiquement
function getExecutionOrder() {
  const visited = new Set();
  const order = [];
  function visit(seed) {
    if (visited.has(seed)) return;
    visited.add(seed);
    const deps = exports.seedOrder[seed] || [];
    for (const dep of deps) {
      visit(dep);
    }
    order.push(seed);
  }
  // Visiter tous les seeds
  Object.keys(exports.seedOrder).forEach(visit);
  return order;
}
// Importation dynamique pour éviter les dépendances circulaires
exports.seedDependencies = [
  {
    name: "00-cleanup",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/00-cleanup.seed"))
      ).cleanDatabase(ctx),
  },
  {
    name: "01-users",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/01-users.seed"))
      ).seedUsers(ctx),
  },
  {
    name: "02-auth",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/02-auth.seed"))
      ).seedAuth(ctx),
  },
  {
    name: "03-client",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/03-client.seed"))
      ).seedClient(ctx),
  },
  {
    name: "04-deliverer",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() =>
          require("../seeds/04-deliverer.seed"),
        )
      ).seedDeliverer(ctx),
  },
  {
    name: "05-merchant",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/05-merchant.seed"))
      ).seedMerchant(ctx),
  },
  {
    name: "06-provider",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/06-provider.seed"))
      ).seedProviders(ctx),
  },
  {
    name: "07-admin",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/07-admin.seed"))
      ).seedAdmin(ctx),
  },
  {
    name: "13-location", // Locations avant les annonces
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/13-location.seed"))
      ).seedLocations(ctx),
  },
  {
    name: "14-document", // Documents pour validation utilisateurs
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/14-document.seed"))
      ).seedDocuments(ctx),
  },
  {
    name: "08-announcement",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() =>
          require("../seeds/08-announcement.seed"),
        )
      ).seedAnnouncements(ctx),
  },
  {
    name: "09-delivery",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/09-delivery.seed"))
      ).seedDeliveries(ctx),
  },
  {
    name: "10a-delivery-validation",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() =>
          require("../seeds/10a-delivery-validation.seed"),
        )
      ).seedDeliveryValidations(ctx),
  },
  {
    name: "10-booking",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/10-booking.seed"))
      ).seedBookings(ctx),
  },
  {
    name: "11-payment",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/11-payment.seed"))
      ).seedPayments(ctx),
  },
  {
    name: "12-invoice",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/12-invoice.seed"))
      ).seedInvoices(ctx),
  },
  {
    name: "15-notification",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() =>
          require("../seeds/15-notification.seed"),
        )
      ).seedNotifications(ctx),
  },
  {
    name: "16-review",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/16-review.seed"))
      ).seedReviews(ctx),
  },
  {
    name: "17-contract",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/17-contract.seed"))
      ).seedContracts(ctx.prisma, ctx),
  },
  {
    name: "18-tutorial",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/18-tutorial.seed"))
      ).seedTutorials(ctx),
  },
  {
    name: "19-tracking",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/19-tracking.seed"))
      ).seedTracking(ctx),
  },
  {
    name: "20-support",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/20-support.seed"))
      ).seedSupport(ctx),
  },
  {
    name: "21-certifications",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() =>
          require("../seeds/21-certifications.seed"),
        )
      ).seedCertifications(ctx),
  },
  {
    name: "22-insurance",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() =>
          require("../seeds/22-insurance.seed"),
        )
      ).seedInsurance(ctx),
  },
  {
    name: "23-referral",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/23-referral.seed"))
      ).seedReferrals(ctx),
  },
  {
    name: "24-disputes",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() => require("../seeds/24-disputes.seed"))
      ).seedDisputes(ctx.prisma, ctx),
  },
  {
    name: "25-analytics",
    fn: async (ctx) =>
      (
        await Promise.resolve().then(() =>
          require("../seeds/25-analytics.seed"),
        )
      ).seedAnalytics(ctx),
  },
];
