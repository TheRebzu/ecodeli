import jwt from 'jsonwebtoken';

// Créer un JWT de test pour simuler une session utilisateur
const testUser = {
  id: "test-user-123",
  email: "client@ecodeli.me", 
  name: "Test Client",
  role: "CLIENT",
  isVerified: true
};

// Clé secrète pour NextAuth (à utiliser la vraie du .env.local)
const secret = process.env.NEXTAUTH_SECRET || "test-secret-key-for-development";

// Créer un token JWT comme NextAuth le ferait
const token = jwt.sign(
  {
    ...testUser,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24h
  },
  secret
);

console.log("🔑 Token JWT pour tests:");
console.log(token);

console.log("\n📋 Utilisation avec curl:");
console.log(`curl -H "Authorization: Bearer ${token}" "http://localhost:3000/api/trpc/auth.getSession"`);

console.log("\n🍪 Cookie NextAuth (format simulé):");
console.log(`next-auth.session-token=${token}`);

console.log("\n📝 Commande curl avec cookie:");
console.log(`curl -H "Cookie: next-auth.session-token=${token}" "http://localhost:3000/api/trpc/auth.getSession"`);

console.log("\n✅ curl -I http://localhost:3000/fr/home          # 200 OK");
console.log("\n✅ curl "http://localhost:3000/api/trpc/auth.getSession"   # 401 UNAUTHORIZED (propre)");
console.log("\n✅ curl -X POST "http://localhost:3000/api/trpc/upload.uploadFile"  # 401 sécurisé"); 