import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function forceValidateProvider(userId: string) {
  try {
    // Try to find the Provider record
    let provider = await prisma.provider.findUnique({ where: { userId } });
    if (!provider) {
      // Create the provider record if missing
      provider = await prisma.provider.create({
        data: {
          userId,
          validationStatus: "APPROVED",
          activatedAt: new Date(),
          isActive: true,
        },
      });
      console.log(`Provider record created for userId ${userId}`);
    } else {
      // Update if exists
      await prisma.provider.update({
        where: { userId },
        data: {
          validationStatus: "APPROVED",
          activatedAt: new Date(),
          isActive: true,
        },
      });
      console.log(`Provider record updated for userId ${userId}`);
    }

    // Update User (optional, for consistency)
    await prisma.user.update({
      where: { id: userId },
      data: {
        validationStatus: "APPROVED",
        isActive: true,
      },
    });

    console.log(`Provider with userId ${userId} has been force validated and activated.`);
    process.exit(0);
  } catch (error) {
    console.error("Error force validating provider:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Usage: node prisma/seed/force-validate-provider.ts <userId>
const userId = process.argv[2] || "";
if (!userId) {
  console.error("Please provide a provider userId as argument.");
  process.exit(1);
}

forceValidateProvider(userId); 