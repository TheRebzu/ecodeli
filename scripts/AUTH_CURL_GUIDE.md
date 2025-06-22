# Guide d'Authentification NextAuth avec curl

Ce guide explique comment s'authentifier à l'application EcoDeli en utilisant curl ou d'autres outils HTTP.

## 🔑 Informations de Connexion

### Compte Client Principal de Test
- **Email**: `jean.dupont@orange.fr`
- **Mot de passe**: `password123`
- **Rôle**: CLIENT
- **Statut**: ACTIVE

### Autres Comptes de Test
Tous les comptes de test utilisent le mot de passe `password123`. Les emails sont générés selon le pattern : `prenom.nom@domaine.fr`

## 🚀 Méthodes d'Authentification

### 1. Script Bash Automatisé

```bash
# Exécuter le script d'authentification
./scripts/auth-curl-example.sh

# Sauvegarder le cookie dans un fichier
./scripts/auth-curl-example.sh --save
```

### 2. Script Python

```bash
# Exécuter le script Python
python scripts/auth-curl-example.py

# Sauvegarder le cookie
python scripts/auth-curl-example.py --save
```

### 3. Authentification Manuelle avec curl

#### Étape 1: Obtenir le token CSRF
```bash
# Récupérer le token CSRF
CSRF_TOKEN=$(curl -s http://localhost:3000/api/auth/csrf | grep -o '"csrfToken":"[^"]*' | grep -o '[^"]*$')
echo "CSRF Token: $CSRF_TOKEN"
```

#### Étape 2: Se connecter
```bash
# Connexion avec les credentials
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=jean.dupont@orange.fr&password=password123&csrfToken=$CSRF_TOKEN&callbackUrl=http://localhost:3000/client&json=true" \
  -c cookies.txt \
  -v
```

#### Étape 3: Utiliser le cookie pour les requêtes authentifiées
```bash
# Exemple: Obtenir le profil client
curl -X POST http://localhost:3000/api/trpc/client.getProfile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"input":{}}'
```

## 🍪 Format du Cookie

Le cookie de session NextAuth a l'un des formats suivants :
- **HTTP**: `next-auth.session-token=<token_value>`
- **HTTPS**: `__Secure-next-auth.session-token=<token_value>`

## 📝 Exemples d'Utilisation

### Avec curl
```bash
# Utiliser directement le cookie
curl -H "Cookie: next-auth.session-token=<votre_token>" \
     http://localhost:3000/api/votre-endpoint

# Utiliser un fichier de cookies
curl -b cookies.txt http://localhost:3000/api/votre-endpoint
```

### Avec wget
```bash
wget --header="Cookie: next-auth.session-token=<votre_token>" \
     http://localhost:3000/api/votre-endpoint
```

### Avec HTTPie
```bash
http GET localhost:3000/api/votre-endpoint \
     Cookie:"next-auth.session-token=<votre_token>"
```

### Avec Postman/Insomnia
1. Ajouter un header `Cookie`
2. Valeur: `next-auth.session-token=<votre_token>`

## 🔒 Notes de Sécurité

1. **User-Agent**: Le serveur peut bloquer les requêtes avec des User-Agent suspects (curl, wget). Pour contourner :
   ```bash
   curl -H "User-Agent: Mozilla/5.0" ...
   ```

2. **CSRF Protection**: Toujours inclure le token CSRF pour les requêtes POST

3. **Session Expiration**: Les sessions expirent après 30 jours

4. **2FA**: Si l'authentification à deux facteurs est activée, inclure le code TOTP :
   ```bash
   -d "email=...&password=...&totp=123456&csrfToken=..."
   ```

## 🛠️ Dépannage

### Erreur "Requête non autorisée"
Le serveur détecte et bloque les User-Agent curl/wget. Solution :
```bash
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" ...
```

### Cookie non reçu
Vérifier que :
- L'email est vérifié (`emailVerified` non null)
- Le compte est actif (status = `ACTIVE`)
- Les credentials sont corrects

### Session expirée
Répéter le processus d'authentification pour obtenir un nouveau cookie.

## 📚 Endpoints Utiles

- **CSRF Token**: `GET /api/auth/csrf`
- **Login**: `POST /api/auth/callback/credentials`
- **Session**: `GET /api/auth/session`
- **Logout**: `POST /api/auth/signout`

## 🔗 API TRPC Endpoints

Pour les clients authentifiés :
- `client.getProfile` - Obtenir le profil
- `client.announcements.list` - Lister les annonces
- `client.deliveries.list` - Lister les livraisons
- `client.services.search` - Rechercher des services

Format des requêtes TRPC :
```bash
curl -X POST http://localhost:3000/api/trpc/<procedure> \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"input": { /* paramètres */ }}'
```