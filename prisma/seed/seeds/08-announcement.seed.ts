import { SeedContext } from "../index";
import { CONSTANTS } from "../data/constants";
import { parisAddresses } from "../data/addresses/paris";
import { generateOrderNumber } from "../utils/generators/code-generator";

const announcementTemplates = {
  PACKAGE_DELIVERY: {
    titles: [
      "Colis urgent à livrer",
      "Envoi de documents importants",
      "Carton de déménagement",
      "Équipement électronique fragile",
      "Cadeau d'anniversaire",
      "Matériel professionnel",
    ],
    descriptions: [
      "Colis de {weight}kg à livrer en toute sécurité",
      "Envoi urgent nécessitant une livraison rapide",
      "Carton fragile, manipulation avec précaution requise",
      "Documents confidentiels à remettre en main propre",
      "Équipement professionnel à transporter avec soin",
    ],
    weights: [0.5, 1, 2, 5, 10, 15, 20],
    prices: [15, 20, 25, 30, 40, 50, 75],
  },
  PERSON_TRANSPORT: {
    titles: [
      "Transport médical",
      "Accompagnement personne âgée",
      "Transport scolaire",
      "Navette entreprise",
      "Transport événement",
    ],
    descriptions: [
      "Transport sécurisé pour rendez-vous médical",
      "Accompagnement avec assistance si nécessaire",
      "Transport régulier domicile-travail",
      "Navette pour événement professionnel",
      "Transport adapté aux personnes à mobilité réduite",
    ],
    prices: [30, 40, 50, 60, 80],
  },
  AIRPORT_TRANSFER: {
    titles: [
      "Transfert CDG",
      "Transfert Orly",
      "Transfert Beauvais",
      "Transfert gare",
      "Transfert groupe",
    ],
    descriptions: [
      "Transfert aéroport Charles de Gaulle - {nbPersons} personne(s)",
      "Navette Orly avec bagages",
      "Transport Beauvais départ matinal",
      "Transfert gare avec assistance bagages",
      "Transport groupe pour vol international",
    ],
    prices: [45, 55, 65, 75, 120],
  },
  SHOPPING: {
    titles: [
      "Courses alimentaires",
      "Shopping vêtements",
      "Achats bricolage",
      "Courses pharmacie",
      "Achats spécialisés",
    ],
    descriptions: [
      "Liste de courses au supermarché du quartier",
      "Achats dans magasins spécifiés avec budget de {budget}€",
      "Matériel de bricolage selon liste fournie",
      "Médicaments sur ordonnance à récupérer",
      "Produits spécialisés dans boutiques partenaires",
    ],
    budgets: [30, 50, 100, 150, 200],
    prices: [10, 15, 20, 25, 30],
  },
  CART_DROP: {
    titles: [
      "Livraison courses Carrefour",
      "Livraison Auchan",
      "Livraison Leclerc",
      "Livraison Super U",
      "Livraison Monoprix",
    ],
    descriptions: [
      "Livraison de vos courses depuis {store} - Chariot plein",
      "Service lâcher de chariot - Livraison dans les 2h",
      "Vos courses livrées directement de la caisse",
      "Service express depuis le magasin",
      "Livraison rapide de vos achats en magasin",
    ],
    stores: ["Carrefour", "Auchan", "Leclerc", "Super U", "Monoprix"],
    prices: [8, 10, 12, 15, 18],
  },
};

export async function seedAnnouncements(ctx: SeedContext) {
  const { prisma, config } = ctx;
  const users = ctx.data.get("users") || [];
  const locations = ctx.data.get("locations") || [];

  console.log("   Creating announcements...");

  const clients = users.filter((u) => u.role === CONSTANTS.roles.CLIENT);
  const merchants = users.filter((u) => u.role === CONSTANTS.roles.MERCHANT);
  const announcements = [];

  // Créer des annonces pour chaque client
  for (const client of clients) {
    const numAnnouncements = Math.floor(2 + Math.random() * 4); // 2 à 5 annonces par client

    for (let i = 0; i < numAnnouncements; i++) {
      const type = Object.keys(announcementTemplates)[
        Math.floor(Math.random() * Object.keys(announcementTemplates).length)
      ];
      const template = announcementTemplates[type];
      const titleIndex = Math.floor(Math.random() * template.titles.length);
      const descIndex = Math.floor(
        Math.random() * template.descriptions.length,
      );
      const priceIndex = Math.floor(Math.random() * template.prices.length);

      // Sélectionner des adresses aléatoires
      const fromAddress =
        parisAddresses[Math.floor(Math.random() * parisAddresses.length)];
      const toAddress =
        parisAddresses[Math.floor(Math.random() * parisAddresses.length)];

      // Calculer la date prévue
      const scheduledDays = Math.floor(1 + Math.random() * 14); // 1 à 14 jours dans le futur
      const scheduledAt = new Date(
        Date.now() + scheduledDays * 24 * 60 * 60 * 1000,
      );

      let description = template.descriptions[descIndex];
      if (type === "PACKAGE_DELIVERY") {
        description = description.replace(
          "{weight}",
          template.weights[
            Math.floor(Math.random() * template.weights.length)
          ].toString(),
        );
      } else if (type === "AIRPORT_TRANSFER") {
        description = description.replace(
          "{nbPersons}",
          Math.floor(1 + Math.random() * 4).toString(),
        );
      } else if (type === "SHOPPING") {
        description = description.replace(
          "{budget}",
          template.budgets[
            Math.floor(Math.random() * template.budgets.length)
          ].toString(),
        );
      } else if (type === "CART_DROP") {
        description = description.replace(
          "{store}",
          template.stores[Math.floor(Math.random() * template.stores.length)],
        );
      }

      const announcement = await prisma.announcement.create({
        data: {
          title: template.titles[titleIndex],
          description,
          type,
          status:
            Math.random() > 0.3
              ? "ACTIVE"
              : Math.random() > 0.5
                ? "IN_PROGRESS"
                : "COMPLETED",
          basePrice: template.prices[priceIndex],
          author: { connect: { id: client.id } },
          pickupAddress: fromAddress.address || "Unknown Address",
          pickupLatitude: fromAddress.lat || 0,
          pickupLongitude: fromAddress.lng || 0,
          deliveryAddress: toAddress.address || "Unknown Address",
          deliveryLatitude: toAddress.lat || 0,
          deliveryLongitude: toAddress.lng || 0,
          pickupDate: scheduledAt,
          isUrgent: Math.random() > 0.7 ? true : false,
          viewCount: Math.floor(Math.random() * 100),
        },
      });

      if (type === "PACKAGE_DELIVERY") {
        await prisma.packageAnnouncement.create({
          data: {
            announcementId: announcement.id,
            weight:
              template.weights[
                Math.floor(Math.random() * template.weights.length)
              ],
            length: Math.floor(20 + Math.random() * 60),
            width: Math.floor(20 + Math.random() * 40),
            height: Math.floor(10 + Math.random() * 30),
            fragile: Math.random() > 0.7,
            requiresInsurance: Math.random() > 0.5,
            insuredValue:
              Math.random() > 0.5 ? Math.floor(50 + Math.random() * 500) : null,
            specialInstructions:
              Math.random() > 0.5 ? "Handle with care" : null,
          },
        });
      }

      announcements.push(announcement);
    }
  }

  // Créer des annonces pour les commerçants (principalement CART_DROP)
  for (const merchant of merchants) {
    const numAnnouncements = Math.floor(3 + Math.random() * 5); // 3 à 7 annonces par commerçant

    for (let i = 0; i < numAnnouncements; i++) {
      const fromAddress =
        parisAddresses[Math.floor(Math.random() * parisAddresses.length)];
      const toAddress =
        parisAddresses[Math.floor(Math.random() * parisAddresses.length)];

      const announcement = await prisma.announcement.create({
        data: {
          title: `Livraison chariot - ${merchant.companyName || "Commerce"}`,
          description: `Service de livraison depuis notre magasin. Chariot complet livré en 2h maximum.`,
          type: "CART_DROP",
          status: "ACTIVE",
          basePrice: 10 + Math.floor(Math.random() * 10),
          author: { connect: { id: merchant.id } },
          pickupAddress: fromAddress.address || "Unknown Address",
          pickupLatitude: fromAddress.lat || 0,
          pickupLongitude: fromAddress.lng || 0,
          deliveryAddress: toAddress.address || "Unknown Address",
          deliveryLatitude: toAddress.lat || 0,
          deliveryLongitude: toAddress.lng || 0,
          pickupDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // Dans 2 heures
          isUrgent: true,
          viewCount: Math.floor(Math.random() * 50),
        },
      });

      announcements.push(announcement);
    }
  }

  console.log(`   ✓ Created ${announcements.length} announcements`);
  console.log(`Number of clients: ${clients.length}`);
  console.log(`Number of merchants: ${merchants.length}`);

  // Stocker pour les autres seeds
  ctx.data.set("announcements", announcements);

  return announcements;
}

/**
 * Injecte une annonce PACKAGE_DELIVERY pour un client précis
 */
export async function injectAnnouncementForUser(prisma: any, userId: string) {
  // Valeurs réalistes pour une annonce de livraison
  const announcement = await prisma.announcement.create({
    data: {
      title: "Livraison Paris-Lyon - Ordinateur portable",
      description: "Je souhaite envoyer un colis fragile de Paris à Lyon, prise en charge rapide.",
      type: "PACKAGE_DELIVERY",
      status: "ACTIVE",
      basePrice: 35.0,
      author: { connect: { id: userId } },
      pickupAddress: "10 rue de Flandre, 75019 Paris",
      pickupLatitude: 48.8841,
      pickupLongitude: 2.3768,
      deliveryAddress: "20 avenue Jean Jaurès, 69007 Lyon",
      deliveryLatitude: 45.7485,
      deliveryLongitude: 4.8521,
      pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // dans 2 jours
      isUrgent: false,
      viewCount: 0,
    },
  });

  await prisma.packageAnnouncement.create({
    data: {
      announcementId: announcement.id,
      weight: 2.5,
      length: 30,
      width: 20,
      height: 15,
      fragile: true,
      requiresInsurance: true,
      insuredValue: 1200,
      specialInstructions: "Manipuler avec soin, fragile.",
    },
  });

  console.log(`✓ Annonce injectée pour l'utilisateur ${userId} (id annonce: ${announcement.id})`);
  return announcement;
}
