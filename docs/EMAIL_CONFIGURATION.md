# 📧 Configuration des Emails - EcoDeli

## Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env.local` :

```bash
# Configuration Email SMTP
SMTP_HOST="mail.celian-vf.fr"
SMTP_PORT="587"
SMTP_SECURE="false"
GMAIL_USER="votre-email@domain.com"
GMAIL_APP_PASSWORD="votre-mot-de-passe-app"

# URL de l'application (pour les liens dans les emails)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Configuration avec Gmail

### 1. Activez l'authentification à 2 facteurs sur Gmail
- Allez dans les paramètres de votre compte Google
- Sécurité → Validation en 2 étapes

### 2. Créez un mot de passe d'application
- Allez dans "Mots de passe d'application"
- Sélectionnez "Mail" et votre appareil
- Copiez le mot de passe généré (16 caractères)

### 3. Configurez les variables :
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
GMAIL_USER="votre-email@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"  # Mot de passe d'application
```

## Configuration avec autres fournisseurs

### OVH/Kimsufi
```bash
SMTP_HOST="ssl0.ovh.net"
SMTP_PORT="587"
SMTP_SECURE="false"
GMAIL_USER="contact@votre-domaine.com"
GMAIL_APP_PASSWORD="votre-mot-de-passe"
```

### O2Switch
```bash
SMTP_HOST="mail.o2switch.fr"
SMTP_PORT="587"
SMTP_SECURE="false"
GMAIL_USER="contact@votre-domaine.com"
GMAIL_APP_PASSWORD="votre-mot-de-passe"
```

### Outlook/Hotmail
```bash
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_SECURE="false"
GMAIL_USER="votre-email@outlook.com"
GMAIL_APP_PASSWORD="votre-mot-de-passe"
```

## Test de la configuration

### Via l'interface admin
1. Connectez-vous en tant qu'admin
2. Allez dans **Paramètres → Tests → Emails**
3. Testez l'envoi d'un email

### Via API directe
```bash
curl -X POST http://localhost:3000/api/admin/settings/test-smtp \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.gmail.com",
    "port": 587,
    "user": "votre-email@gmail.com",
    "password": "votre-mot-de-passe-app",
    "secure": false,
    "fromAddress": "votre-email@gmail.com"
  }'
```

## Types d'emails envoyés

### 📅 Réservations de services
- **Client** : Email de confirmation avec détails complets
- **Prestataire** : Notification de nouvelle réservation

### 🔐 Authentification
- Email de vérification d'inscription
- Email de réinitialisation de mot de passe

### 📄 Validation de documents
- Notification d'approbation/rejet de documents

### 💰 Paiements
- Confirmation de paiement
- Notification de revenus

## Templates d'emails

Les emails utilisent des **templates HTML responsives** avec :
- ✅ Design moderne et professionnel
- ✅ Logo et couleurs EcoDeli
- ✅ Informations complètes de la réservation
- ✅ Boutons d'action fonctionnels
- ✅ Compatible mobile et desktop

## Dépannage

### Erreur "Authentication failed"
- Vérifiez que l'authentification 2FA est activée
- Utilisez un mot de passe d'application, pas votre mot de passe normal
- Vérifiez les paramètres SMTP (host, port)

### Erreur "Connection timeout"
- Vérifiez votre connexion internet
- Testez avec un autre port (25, 465, 587)
- Vérifiez que votre firewall n'bloque pas

### Emails non reçus
- ✅ Vérifiez le dossier spam/courrier indésirable
- ✅ Vérifiez que l'adresse email est correcte
- ✅ Testez avec une autre adresse email

### Logs de débogage
Les logs d'envoi sont visibles dans la console du serveur :
```
✅ Email de confirmation envoyé au client: client@example.com
✅ Email de notification envoyé au prestataire: provider@example.com
🎉 Toutes les notifications de réservation envoyées (push + email)
```

## Sécurité

- ❌ **JAMAIS** commitez vos mots de passe dans le code
- ✅ Utilisez toujours des variables d'environnement
- ✅ Activez l'authentification 2FA
- ✅ Utilisez des mots de passe d'application spécifiques
- ✅ Chiffrez la connexion SMTP (TLS/STARTTLS)

## Support

En cas de problème, contactez l'équipe technique avec :
- Les logs d'erreur complets
- Votre configuration SMTP (SANS les mots de passe)
- Le type d'email qui pose problème 