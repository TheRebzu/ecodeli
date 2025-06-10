#!/usr/bin/env node

import { PrismaClient, UserRole, UserStatus, ContractStatus, ContractType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed simple...');

  // 1. Créer un utilisateur admin
  console.log('👤 Création de l\'utilisateur admin...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      name: 'Admin Test',
      email: 'admin@test.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
      phoneNumber: '+33123456789',
      locale: 'fr-FR',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      emailVerified: new Date(),
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
        }
      }
    },
  });

  console.log(`✅ Admin créé: ${adminUser.email}`);

  // 2. Créer quelques utilisateurs clients
  console.log('👥 Création des utilisateurs clients...');
  
  const clientUser1 = await prisma.user.upsert({
    where: { email: 'client1@test.com' },
    update: {},
    create: {
      name: 'Jean Dupont',
      email: 'client1@test.com',
      password: await bcrypt.hash('client123', 12),
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      isVerified: true,
      phoneNumber: '+33123456780',
      locale: 'fr-FR',
      emailVerified: new Date(),
    },
  });

  const clientUser2 = await prisma.user.upsert({
    where: { email: 'client2@test.com' },
    update: {},
    create: {
      name: 'Marie Martin',
      email: 'client2@test.com',
      password: await bcrypt.hash('client123', 12),
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      isVerified: true,
      phoneNumber: '+33123456781',
      locale: 'fr-FR',
      emailVerified: new Date(),
    },
  });

  // 3. Créer des utilisateurs commerçants
  console.log('🏪 Création des commerçants...');
  
  const merchantUser1 = await prisma.user.upsert({
    where: { email: 'merchant1@test.com' },
    update: {},
    create: {
      name: 'Pierre Boulanger',
      email: 'merchant1@test.com',
      password: await bcrypt.hash('merchant123', 12),
      role: UserRole.MERCHANT,
      status: UserStatus.ACTIVE,
      isVerified: true,
      phoneNumber: '+33123456782',
      locale: 'fr-FR',
      emailVerified: new Date(),
    },
  });

  const merchant1 = await prisma.merchant.upsert({
    where: { userId: merchantUser1.id },
    update: {},
    create: {
      userId: merchantUser1.id,
      companyName: 'Boulangerie Pierre',
      businessType: 'BAKERY',
      address: '123 Rue de la Paix, 75001 Paris',
      phone: '+33123456782',
      isVerified: true,
      verificationDate: new Date(),
    },
  });

  const merchantUser2 = await prisma.user.upsert({
    where: { email: 'merchant2@test.com' },
    update: {},
    create: {
      name: 'Paul Epicier',
      email: 'merchant2@test.com',
      password: await bcrypt.hash('merchant123', 12),
      role: UserRole.MERCHANT,
      status: UserStatus.ACTIVE,
      isVerified: true,
      phoneNumber: '+33123456783',
      locale: 'fr-FR',
      emailVerified: new Date(),
    },
  });

  const merchant2 = await prisma.merchant.upsert({
    where: { userId: merchantUser2.id },
    update: {},
    create: {
      userId: merchantUser2.id,
      companyName: 'Épicerie Paul',
      businessType: 'GROCERY',
      address: '456 Avenue des Champs, 75008 Paris',
      phone: '+33123456783',
      isVerified: true,
      verificationDate: new Date(),
    },
  });

  // 4. Créer des contrats
  console.log('📄 Création des contrats...');
  
  const contract1 = await prisma.contract.create({
    data: {
      merchantId: merchant1.id,
      contractNumber: 'CT-001-2024',
      title: 'Contrat Standard Boulangerie',
      content: '<p>Contrat standard pour la boulangerie Pierre</p>',
      status: ContractStatus.ACTIVE,
      type: ContractType.STANDARD,
      monthlyFee: 99.99,
      commissionRate: 0.15,
      merchantCategory: 'FOOD',
      deliveryZone: 'Paris 1er',
      effectiveDate: new Date(),
      signedAt: new Date(),
      validatedAt: new Date(),
      signedById: adminUser.id,
    },
  });

  const contract2 = await prisma.contract.create({
    data: {
      merchantId: merchant2.id,
      contractNumber: 'CT-002-2024',
      title: 'Contrat Premium Épicerie',
      content: '<p>Contrat premium pour l\'épicerie Paul</p>',
      status: ContractStatus.ACTIVE,
      type: ContractType.PREMIUM,
      monthlyFee: 149.99,
      commissionRate: 0.12,
      merchantCategory: 'GROCERY',
      deliveryZone: 'Paris 8e',
      effectiveDate: new Date(),
      signedAt: new Date(),
      validatedAt: new Date(),
      signedById: adminUser.id,
    },
  });

  const contract3 = await prisma.contract.create({
    data: {
      merchantId: merchant1.id,
      contractNumber: 'CT-003-2024',
      title: 'Contrat en Brouillon',
      content: '<p>Contrat en cours de négociation</p>',
      status: ContractStatus.DRAFT,
      type: ContractType.STANDARD,
      monthlyFee: 79.99,
      commissionRate: 0.18,
      merchantCategory: 'FOOD',
      deliveryZone: 'Paris Centre',
      signedById: adminUser.id,
    },
  });

  // 5. Créer des livreurs
  console.log('🚚 Création des livreurs...');
  
  const delivererUser1 = await prisma.user.upsert({
    where: { email: 'deliverer1@test.com' },
    update: {},
    create: {
      name: 'Lucas Vélo',
      email: 'deliverer1@test.com',
      password: await bcrypt.hash('deliverer123', 12),
      role: UserRole.DELIVERER,
      status: UserStatus.ACTIVE,
      isVerified: true,
      phoneNumber: '+33123456784',
      locale: 'fr-FR',
      emailVerified: new Date(),
    },
  });

  const deliverer1 = await prisma.deliverer.upsert({
    where: { userId: delivererUser1.id },
    update: {},
    create: {
      userId: delivererUser1.id,
      vehicleType: 'BIKE',
      phone: '+33123456784',
      address: 'Paris, France',
      serviceZones: ['75001', '75002', '75003'],
      isVerified: true,
      verificationDate: new Date(),
    },
  });

  console.log('✅ Seed simple terminé !');
  console.log(`
📊 Données créées:
- 1 Admin: admin@test.com (password: admin123)
- 2 Clients: client1@test.com, client2@test.com (password: client123)
- 2 Commerçants: merchant1@test.com, merchant2@test.com (password: merchant123)
- 1 Livreur: deliverer1@test.com (password: deliverer123)
- 3 Contrats (2 actifs, 1 brouillon)
  `);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 