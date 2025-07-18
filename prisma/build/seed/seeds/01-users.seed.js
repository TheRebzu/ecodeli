"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedUsers = seedUsers;
const bcryptjs_1 = require("bcryptjs");
const paris_1 = require("../data/addresses/paris");
const usersByRole = {
  CLIENT: [
    { email: "client1@test.com", name: "Marie Dubois", gender: "female" },
    { email: "client2@test.com", name: "Jean Martin", gender: "male" },
    { email: "client3@test.com", name: "Sophie Bernard", gender: "female" },
    { email: "client4@test.com", name: "Pierre Leroy", gender: "male" },
    { email: "client5@test.com", name: "Emma Petit", gender: "female" },
  ],
  DELIVERER: [
    {
      email: "livreur1@test.com",
      name: "Thomas Moreau",
      gender: "male",
      status: "VALIDATED",
    },
    {
      email: "livreur2@test.com",
      name: "Lucas Simon",
      gender: "male",
      status: "VALIDATED",
    },
    {
      email: "livreur3@test.com",
      name: "Antoine Michel",
      gender: "male",
      status: "PENDING_VALIDATION",
    },
    {
      email: "livreur4@test.com",
      name: "Maxime Garcia",
      gender: "male",
      status: "VALIDATED",
    },
    {
      email: "livreur5@test.com",
      name: "Nicolas Martinez",
      gender: "male",
      status: "REJECTED",
    },
  ],
  MERCHANT: [
    {
      email: "commercant1@test.com",
      name: "Carrefour City",
      company: "Carrefour City Flandre",
    },
    {
      email: "commercant2@test.com",
      name: "Monoprix",
      company: "Monoprix République",
    },
    {
      email: "commercant3@test.com",
      name: "Franprix",
      company: "Franprix Bellecour",
    },
    {
      email: "commercant4@test.com",
      name: "Auchan",
      company: "Auchan Lille Centre",
    },
    {
      email: "commercant5@test.com",
      name: "Super U",
      company: "Super U Rennes Centre",
    },
  ],
  PROVIDER: [
    {
      email: "prestataire1@test.com",
      name: "Julie Durand",
      gender: "female",
      status: "VALIDATED",
    },
    {
      email: "prestataire2@test.com",
      name: "Marc Rousseau",
      gender: "male",
      status: "VALIDATED",
    },
    {
      email: "prestataire3@test.com",
      name: "Céline Laurent",
      gender: "female",
      status: "VALIDATED",
    },
    {
      email: "prestataire4@test.com",
      name: "David Fournier",
      gender: "male",
      status: "PENDING_DOCUMENTS",
    },
    {
      email: "prestataire5@test.com",
      name: "Sarah Girard",
      gender: "female",
      status: "VALIDATED",
    },
  ],
  ADMIN: [
    { email: "admin1@test.com", name: "Admin Principal" },
    { email: "admin2@test.com", name: "Admin Support" },
    { email: "admin3@test.com", name: "Admin Finance" },
    { email: "admin4@test.com", name: "Admin Opérations" },
    { email: "admin5@test.com", name: "Admin Marketing" },
  ],
};
async function seedUsers(ctx) {
  const { prisma } = ctx;
  console.log("   Creating users...");
  const password = await bcryptjs_1.default.hash("Test123!", 10);
  const createdUsers = [];
  // Utiliser les adresses de Paris
  const addresses = [...paris_1.parisAddresses];
  let addressIndex = 0;
  for (const [role, users] of Object.entries(usersByRole)) {
    for (const userData of users) {
      const address = addresses[addressIndex % addresses.length];
      addressIndex++;
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password,
          role: role,
          // Selon le cahier des charges EcoDeli
          isActive:
            role === "CLIENT" ||
            role === "ADMIN" ||
            userData.status === "VALIDATED",
          validationStatus:
            role === "CLIENT" || role === "ADMIN" ? "VALIDATED" : "PENDING",
          createdAt: new Date(
            Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
          ), // 6 derniers mois
          profile: {
            create: {
              firstName: userData.name.split(" ")[0],
              lastName: userData.name.split(" ")[1],
              phone: `+336${Math.floor(10000000 + Math.random() * 89999999)}`,
              address: address.street,
              city: address.city,
              postalCode: address.postalCode,
              country: "FR",
              isVerified: role === "ADMIN" || userData.status === "VALIDATED",
            },
          },
        },
      });
      // Créer les profils spécifiques selon le rôle
      if (role === "CLIENT") {
        const subscriptions = ["FREE", "FREE", "STARTER", "PREMIUM", "FREE"];
        const subIndex = users.indexOf(userData);
        await prisma.client.create({
          data: {
            userId: user.id,
            subscriptionPlan: subscriptions[subIndex],
            tutorialCompleted: Math.random() > 0.3,
          },
        });
      }
      // On stocke aussi les infos supplémentaires pour utilisation dans d'autres seeds
      createdUsers.push({
        ...user,
        ...userData,
        address: address.street,
        city: address.city,
        postalCode: address.postalCode,
        phone: `+336${Math.floor(10000000 + Math.random() * 89999999)}`,
        validationStatus: userData.status || "VALIDATED",
        companyName: userData.company,
      });
    }
  }
  console.log(`   ✓ Created ${createdUsers.length} users`);
  // Stocker les utilisateurs créés pour les autres seeds
  ctx.data.set("users", createdUsers);
  return createdUsers;
}
