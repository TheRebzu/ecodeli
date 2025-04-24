import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // Création d'utilisateurs de test
  const adminPassword = await hash('admin123', 10);
  const userPassword = await hash('user123', 10);
  const delivererPassword = await hash('deliverer123', 10);
  const merchantPassword = await hash('merchant123', 10);
  const providerPassword = await hash('provider123', 10);

  // Administrateur
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecodeli.me' },
    update: {},
    create: {
      email: 'admin@ecodeli.me',
      name: 'Admin',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  // Client
  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      name: 'Client Test',
      password: userPassword,
      role: UserRole.CLIENT,
    },
  });

  // Livreur
  const deliverer = await prisma.user.upsert({
    where: { email: 'deliverer@example.com' },
    update: {},
    create: {
      email: 'deliverer@example.com',
      name: 'Livreur Test',
      password: delivererPassword,
      role: UserRole.DELIVERER,
    },
  });

  // Commerçant
  const merchant = await prisma.user.upsert({
    where: { email: 'merchant@example.com' },
    update: {},
    create: {
      email: 'merchant@example.com',
      name: 'Commerçant Test',
      password: merchantPassword,
      role: UserRole.MERCHANT,
    },
  });

  // Prestataire
  const provider = await prisma.user.upsert({
    where: { email: 'provider@example.com' },
    update: {},
    create: {
      email: 'provider@example.com',
      name: 'Prestataire Test',
      password: providerPassword,
      role: UserRole.PROVIDER,
    },
  });

  // Création d'annonces de test
  const announcement1 = await prisma.announcement.create({
    data: {
      title: 'Livraison de colis urgent',
      description: 'Besoin de livrer un petit colis dans Paris avant demain',
      pickupAddress: '23 Rue de Rivoli, 75001 Paris',
      deliveryAddress: '15 Avenue des Champs-Élysées, 75008 Paris',
      packageSize: 'SMALL',
      packageWeight: 2.5,
      packageValue: 150,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24), // +24h
      price: 15.99,
      requiresInsurance: true,
      status: 'OPEN',
      clientId: client.id,
    },
  });

  const announcement2 = await prisma.announcement.create({
    data: {
      title: 'Livraison de documents importants',
      description: 'Documents à livrer rapidement entre deux bureaux',
      pickupAddress: '1 Place de la Bourse, 75002 Paris',
      deliveryAddress: '7 Rue de Madrid, 75008 Paris',
      packageSize: 'SMALL',
      packageWeight: 0.5,
      packageValue: 50,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 12), // +12h
      price: 12.50,
      status: 'ASSIGNED',
      clientId: client.id,
      delivererId: deliverer.id,
    },
  });

  // Création d'un magasin de test
  const store = await prisma.store.create({
    data: {
      name: 'Boutique Test',
      description: 'Une boutique de test pour EcoDeli',
      address: '10 Rue du Commerce, 75015 Paris',
      phoneNumber: '0123456789',
      status: 'APPROVED',
      merchantId: merchant.id,
    },
  });

  // Création d'un service de test
  const service = await prisma.service.create({
    data: {
      title: 'Service de courses',
      description: 'Je vous fais vos courses et vous les livre à domicile',
      category: 'SHOPPING',
      price: 25.00,
      duration: 60, // 60 minutes
      providerId: provider.id,
    },
  });

  // Création d'un rendez-vous de test
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const appointmentEnd = new Date(tomorrow);
  appointmentEnd.setHours(15, 0, 0, 0);

  const appointment = await prisma.appointment.create({
    data: {
      startTime: tomorrow,
      endTime: appointmentEnd,
      status: 'SCHEDULED',
      price: service.price,
      notes: 'Merci de sonner à l\'interphone',
      clientId: client.id,
      providerId: provider.id,
      serviceId: service.id,
    },
  });

  console.log({ admin, client, deliverer, merchant, provider, announcement1, announcement2, store, service, appointment });
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 