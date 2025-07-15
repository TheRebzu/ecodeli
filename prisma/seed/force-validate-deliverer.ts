import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function forceValidateDeliverer(userId: string) {
  try {
    // Try to find the Deliverer record
    let deliverer = await prisma.deliverer.findUnique({ where: { userId } });
    if (!deliverer) {
      // Create the deliverer record if missing
      deliverer = await prisma.deliverer.create({
        data: {
          userId,
          validationStatus: "APPROVED",
          activatedAt: new Date(),
          isActive: true,
        },
      });
      console.log(`Deliverer record created for userId ${userId}`);
    } else {
      // Update if exists
      await prisma.deliverer.update({
        where: { userId },
        data: {
          validationStatus: "APPROVED",
          activatedAt: new Date(),
          isActive: true,
        },
      });
      console.log(`Deliverer record updated for userId ${userId}`);
    }

    // Update User (optional, for consistency)
    await prisma.user.update({
      where: { id: userId },
      data: {
        validationStatus: "APPROVED",
        isActive: true,
      },
    });

    console.log(`Deliverer with userId ${userId} has been force validated and activated.`);
    process.exit(0);
  } catch (error) {
    console.error("Error force validating deliverer:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Usage: node prisma/seed/force-validate-deliverer.js <userId>
const userId = process.argv[2] || "cmd4d7kzt000kplnc10i5ojre"; // Default: your provided userId
if (!userId) {
  console.error("Please provide a deliverer userId as argument.");
  process.exit(1);
}

forceValidateDeliverer(userId); 