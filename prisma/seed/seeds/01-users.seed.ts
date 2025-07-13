import { SeedContext } from "../index";
import bcrypt from "bcryptjs";
import { CONSTANTS } from "../data/constants";
import { getRandomFullName } from "../data/names/last-names";
import { parisAddresses } from "../data/addresses/paris";

const usersByRole = {
  CLIENT: [
    {
      email: "client1@test.com",
      name: "Marie Dubois",
      gender: "female" as const,
    },
    { email: "client2@test.com", name: "Jean Martin", gender: "male" as const },
    {
      email: "client3@test.com",
      name: "Sophie Bernard",
      gender: "female" as const,
    },
    {
      email: "client4@test.com",
      name: "Pierre Leroy",
      gender: "male" as const,
    },
    {
      email: "client5@test.com",
      name: "Emma Petit",
      gender: "female" as const,
    },
  ],
  DELIVERER: [
    {
      email: "livreur1@test.com",
      name: "Thomas Moreau",
      gender: "male" as const,
      status: "VALIDATED",
    },
    {
      email: "livreur2@test.com",
      name: "Lucas Simon",
      gender: "male" as const,
      status: "VALIDATED",
    },
    {
      email: "livreur3@test.com",
      name: "Antoine Michel",
      gender: "male" as const,
      status: "PENDING_VALIDATION",
    },
    {
      email: "livreur4@test.com",
      name: "Maxime Garcia",
      gender: "male" as const,
      status: "VALIDATED",
    },
    {
      email: "livreur5@test.com",
      name: "Nicolas Martinez",
      gender: "male" as const,
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
      gender: "female" as const,
      status: "VALIDATED",
    },
    {
      email: "prestataire2@test.com",
      name: "Marc Rousseau",
      gender: "male" as const,
      status: "VALIDATED",
    },
    {
      email: "prestataire3@test.com",
      name: "Céline Laurent",
      gender: "female" as const,
      status: "VALIDATED",
    },
    {
      email: "prestataire4@test.com",
      name: "David Fournier",
      gender: "male" as const,
      status: "PENDING_DOCUMENTS",
    },
    {
      email: "prestataire5@test.com",
      name: "Sarah Girard",
      gender: "female" as const,
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

export async function seedUsers(ctx: SeedContext) {
  const { prisma } = ctx;

  console.log("   Creating users with NextAuth compatibility...");

  const password = await bcrypt.hash("Test123!", 10);
  const createdUsers = [];

  // Utiliser les adresses de Paris
  const addresses = [...parisAddresses];
  let addressIndex = 0;

  for (const [role, users] of Object.entries(usersByRole)) {
    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const address = addresses[addressIndex % addresses.length];
      addressIndex++;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
        include: { profile: true },
      });

      if (existingUser) {
        console.log(`   User ${userData.email} already exists, skipping...`);
        createdUsers.push({
          ...existingUser,
          ...userData,
          address: address.street,
          city: address.city,
          postalCode: address.postalCode,
          phone: `+336${Math.floor(10000000 + Math.random() * 89999999)}`,
          validationStatus: (userData as any).status || "VALIDATED",
          companyName: (userData as any).company,
        });
        continue;
      }

      // Créer l'utilisateur avec emailVerified pour NextAuth
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password,
          role: role as any,
          name: userData.name, // Nom complet pour NextAuth
          emailVerified: true, // Boolean au lieu de DateTime
          emailVerifiedAt: new Date(), // Date de vérification
          // Selon le cahier des charges EcoDeli
          isActive:
            role === "CLIENT" ||
            role === "ADMIN" ||
            (userData as any).status === "VALIDATED",
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
              isVerified:
                role === "ADMIN" || (userData as any).status === "VALIDATED",
            },
          },
        },
      });

      // Créer les profils spécifiques selon le rôle
      if (role === "CLIENT") {
        const subscriptions = ["FREE", "FREE", "STARTER", "PREMIUM", "FREE"];
        const subscriptionPlan = subscriptions[i]; // Utiliser l'index de la boucle

        await prisma.client.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            subscriptionPlan: subscriptionPlan as any,
            tutorialCompleted: Math.random() > 0.3,
          },
        });
      }

      if (role === "DELIVERER") {
        await prisma.deliverer.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            validationStatus: (userData as any).status || "VALIDATED",
            vehicleType: "BICYCLE",
            isActive: (userData as any).status === "VALIDATED",
          },
        });
      }

      if (role === "MERCHANT") {
        await prisma.merchant.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            companyName: (userData as any).company || userData.name,
            siret: `123456789${Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0")}`,
          },
        });
      }

      if (role === "PROVIDER") {
        await prisma.provider.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            validationStatus: (userData as any).status || "VALIDATED",
            isActive: (userData as any).status === "VALIDATED",
          },
        });
      }

      if (role === "ADMIN") {
        await prisma.admin.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            permissions: ["ALL"],
            department: "Management",
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
        validationStatus: (userData as any).status || "VALIDATED",
        companyName: (userData as any).company,
      });
    }
  }

  console.log(`   ✓ Created ${createdUsers.length} users with profiles`);

  // Stocker les utilisateurs créés pour les autres seeds
  ctx.data.set("users", createdUsers);

  return createdUsers;
}
