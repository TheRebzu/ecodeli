# Guide d'Authentification et Cookies - EcoDeli

## 🔐 Système d'Authentification

EcoDeli utilise NextAuth.js pour gérer l'authentification avec des sessions JWT sécurisées.

### Configuration
- **Strategy**: JWT (JSON Web Tokens)
- **Durée de session**: 30 jours
- **Mise à jour**: Toutes les 24h
- **Algorithme**: HS256 avec secret sécurisé

## 👤 Compte Client Test Principal

```
Email: jean.dupont@orange.fr
Mot de passe: password123
Rôle: CLIENT
Statut: ACTIVE
```

### Détails du compte
- **Nom**: Jean Dupont
- **Téléphone**: Généré automatiquement (format français)
- **Adresse**: 110 rue de Flandre, 75019 Paris, France
- **Préférences**: 
  - Notifications activées (email, push, SMS)
  - Produits écologiques préférés
  - Instructions de livraison: "Appeler avant de livrer. Interphone Dupont au rez-de-chaussée."

## 🍪 Cookies d'Authentification

### Nom du Cookie
- **HTTP**: `next-auth.session-token`
- **HTTPS**: `__Secure-next-auth.session-token`

### Structure du Token JWT
Le cookie contient un JWT avec les informations suivantes:
```json
{
  "id": "user-id",
  "name": "Jean Dupont",
  "email": "jean.dupont@orange.fr",
  "role": "CLIENT",
  "status": "ACTIVE",
  "isVerified": true,
  "profileId": "client-profile-id"
}
```

## 🚀 Obtenir le Cookie d'Authentification

### Méthode 1: Script Automatisé
```bash
# Installer les dépendances
npm install node-fetch @types/node-fetch

# Exécuter le script
npx tsx scripts/get-auth-cookie.ts
```

### Méthode 2: Via l'Interface Web
1. Ouvrir http://localhost:3000/login
2. Se connecter avec les credentials du compte test
3. Ouvrir les DevTools (F12)
4. Aller dans l'onglet Application > Cookies
5. Copier la valeur du cookie `next-auth.session-token`

### Méthode 3: Via API REST
```bash
# 1. Obtenir le token CSRF
CSRF_TOKEN=$(curl -s http://localhost:3000/api/auth/csrf | jq -r '.csrfToken')

# 2. Se connecter
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=jean.dupont@orange.fr&password=password123&csrfToken=$CSRF_TOKEN&json=true" \
  -c cookies.txt

# 3. Extraire le cookie
cat cookies.txt | grep "next-auth.session-token"
```

## 📡 Utiliser le Cookie dans les Requêtes

### Dans le Navigateur (Console)
```javascript
// Définir le cookie
document.cookie = "next-auth.session-token=VOTRE_TOKEN_ICI; path=/";

// Faire une requête authentifiée
fetch('/api/trpc/client.getProfile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input: {} })
}).then(res => res.json()).then(console.log);
```

### Avec cURL
```bash
curl -X POST http://localhost:3000/api/trpc/client.getProfile \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=VOTRE_TOKEN_ICI" \
  -d '{"input":{}}'
```

### Avec Postman/Insomnia
1. Ajouter un header `Cookie`
2. Valeur: `next-auth.session-token=VOTRE_TOKEN_ICI`

### Avec Node.js/TypeScript
```typescript
import fetch from 'node-fetch';

const response = await fetch('http://localhost:3000/api/trpc/client.getProfile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'next-auth.session-token=VOTRE_TOKEN_ICI'
  },
  body: JSON.stringify({ input: {} })
});

const data = await response.json();
console.log(data);
```

## 🛡️ Routes Protégées

### Routes Client
- `/client/*` - Dashboard et fonctionnalités client
- `/api/trpc/client.*` - API endpoints client

### Routes API Publiques
- `/api/auth/*` - Endpoints d'authentification
- `/api/health` - Health check
- `/api/webhooks/stripe` - Webhooks Stripe

## ⚠️ Sécurité

### Headers de Protection
Le middleware ajoute automatiquement ces headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (configuration complète)

### Rate Limiting
- Routes d'auth: 10 requêtes/minute
- Routes tRPC: 60 requêtes/minute
- Routes admin: 30 requêtes/minute
- Autres: 100 requêtes/minute

## 🔍 Débogage

### Vérifier l'État de la Session
```javascript
// Dans le navigateur
fetch('/api/auth/session').then(res => res.json()).then(console.log);
```

### Logs du Serveur
Les tentatives de connexion sont loggées côté serveur:
- ✅ Connexions réussies
- 🚨 Tentatives échouées
- ⚠️ Requêtes suspectes bloquées

### Problèmes Courants

1. **Cookie non défini**: Vérifier que NEXTAUTH_SECRET est défini
2. **Session expirée**: Le token a une durée de vie de 30 jours
3. **HTTPS requis**: En production, utiliser `__Secure-next-auth.session-token`
4. **CORS**: Vérifier les origines autorisées pour les requêtes cross-origin