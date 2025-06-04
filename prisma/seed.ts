import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a merchant user (or find existing)
  const merchant = await prisma.user.upsert({
    where: { email: 'merchant-seed@example.com' },
    update: {},
    create: {
      email: 'merchant-seed@example.com',
      name: 'Seed Merchant',
      role: 'MERCHANT',
      // ...add other required fields as needed
    },
  });

  // Upload BUSINESS_REGISTRATION document for merchant
  await prisma.document.create({
    data: {
      userId: merchant.id,
      type: 'BUSINESS_REGISTRATION',
      userRole: 'MERCHANT',
      status: 'PENDING', // or 'APPROVED' if you want to test verification
      filePath: '/uploads/seed-business-registration.pdf',
      // ...add other required fields as needed
    },
  });

  // Optionally, print missing documents for this merchant (if you have such logic)
  // This part depends on your backend logic, so you may need to call a service or check manually
  console.log('Seeded BUSINESS_REGISTRATION document for merchant:', merchant.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
