export interface TestUser {
  email: string;
  password: string;
  role: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';
  name: string;
  description: string;
}

// Test users for each role
export const testUsers: Record<string, TestUser> = {
  // Client users
  client: {
    email: 'test.client@ecodeli.test',
    password: 'TestClient123!',
    role: 'CLIENT',
    name: 'Test Client',
    description: 'Client de test standard'
  },
  clientPremium: {
    email: 'test.client.premium@ecodeli.test',
    password: 'TestClientPremium123!',
    role: 'CLIENT',
    name: 'Test Client Premium',
    description: 'Client de test avec abonnement premium'
  },

  // Deliverer users
  deliverer: {
    email: 'test.deliverer@ecodeli.test',
    password: 'TestDeliverer123!',
    role: 'DELIVERER',
    name: 'Test Deliverer',
    description: 'Livreur de test standard'
  },
  delivererVerified: {
    email: 'test.deliverer.verified@ecodeli.test',
    password: 'TestDelivererVerified123!',
    role: 'DELIVERER',
    name: 'Test Deliverer Verified',
    description: 'Livreur de test vérifié'
  },

  // Merchant users
  merchant: {
    email: 'test.merchant@ecodeli.test',
    password: 'TestMerchant123!',
    role: 'MERCHANT',
    name: 'Test Merchant',
    description: 'Commerçant de test standard'
  },
  merchantPro: {
    email: 'test.merchant.pro@ecodeli.test',
    password: 'TestMerchantPro123!',
    role: 'MERCHANT',
    name: 'Test Merchant Pro',
    description: 'Commerçant de test avec contrat pro'
  },

  // Provider users
  provider: {
    email: 'test.provider@ecodeli.test',
    password: 'TestProvider123!',
    role: 'PROVIDER',
    name: 'Test Provider',
    description: 'Prestataire de test standard'
  },
  providerCertified: {
    email: 'test.provider.certified@ecodeli.test',
    password: 'TestProviderCertified123!',
    role: 'PROVIDER',
    name: 'Test Provider Certified',
    description: 'Prestataire de test certifié'
  },

  // Admin users
  admin: {
    email: 'test.admin@ecodeli.test',
    password: 'TestAdmin123!',
    role: 'ADMIN',
    name: 'Test Admin',
    description: 'Administrateur de test'
  },
  superAdmin: {
    email: 'test.superadmin@ecodeli.test',
    password: 'TestSuperAdmin123!',
    role: 'ADMIN',
    name: 'Test Super Admin',
    description: 'Super administrateur de test'
  }
};

// Helper to get users by role
export function getUsersByRole(role: TestUser['role']): TestUser[] {
  return Object.values(testUsers).filter(user => user.role === role);
}

// Helper to get a specific test user
export function getTestUser(key: keyof typeof testUsers): TestUser {
  return testUsers[key];
}

// Default users for quick access
export const defaultUsers = {
  client: testUsers.client,
  deliverer: testUsers.deliverer,
  merchant: testUsers.merchant,
  provider: testUsers.provider,
  admin: testUsers.admin
};