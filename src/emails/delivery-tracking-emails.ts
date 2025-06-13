/**
 * Templates d'emails pour les notifications de suivi de livraison
 * Ces templates sont utilisés par le service de notification pour envoyer des emails aux clients
 */

/**
 * Template d'email pour la mise à jour du statut de livraison
 */
export const deliveryStatusUpdateTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mise à jour de votre livraison</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      background-color: #f5f5f5;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 20px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 15px;
      border-radius: 4px;
      font-weight: bold;
      color: white;
      background-color: {{statusColor}};
      margin: 15px 0;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{appUrl}}/images/logo.png" alt="EcoDeli" class="logo">
      <h1>Mise à jour de votre livraison</h1>
    </div>
    
    <div class="content">
      <p>Bonjour {{name}},</p>
      
      <p>{{message}}</p>
      
      <div class="status-badge">{{status}}</div>
      
      <p>Date: {{date}}</p>
      
      <p>Vous pouvez suivre votre livraison en temps réel en cliquant sur le bouton ci-dessous.</p>
      
      <a href="{{trackingUrl}}" class="button">Suivre ma livraison</a>
    </div>
    
    <div class="footer">
      <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
      <p>© {{year}} EcoDeli. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template d'email pour notifier que le livreur approche
 */
export const deliveryApproachingTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre livraison arrive bientôt</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      background-color: #f5f5f5;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 20px 0;
    }
    .eta {
      font-size: 24px;
      font-weight: bold;
      color: #4CAF50;
      margin: 15px 0;
      text-align: center;
    }
    .deliverer-info {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{appUrl}}/images/logo.png" alt="EcoDeli" class="logo">
      <h1>Votre livraison arrive bientôt !</h1>
    </div>
    
    <div class="content">
      <p>Bonjour {{name}},</p>
      
      <p>Votre livreur est en chemin et arrivera très prochainement à votre adresse.</p>
      
      <div class="eta">Arrivée estimée dans {{etaText}}</div>
      
      <div class="deliverer-info">
        <p><strong>Livreur :</strong> {{delivererName}}</p>
        <p><strong>Téléphone :</strong> {{delivererPhone}}</p>
      </div>
      
      <p>Vous pouvez suivre votre livraison en temps réel en cliquant sur le bouton ci-dessous.</p>
      
      <a href="{{trackingUrl}}" class="button">Suivre ma livraison</a>
    </div>
    
    <div class="footer">
      <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
      <p>© {{year}} EcoDeli. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template d'email pour notifier d'un retard de livraison
 */
export const deliveryDelayedTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Retard de votre livraison</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      background-color: #f5f5f5;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 20px 0;
    }
    .delay-info {
      background-color: #fff3cd;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #ffc107;
    }
    .eta {
      font-size: 18px;
      font-weight: bold;
      margin: 15px 0;
    }
    .reason {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{appUrl}}/images/logo.png" alt="EcoDeli" class="logo">
      <h1>Retard de votre livraison</h1>
    </div>
    
    <div class="content">
      <p>Bonjour {{name}},</p>
      
      <p>Nous vous informons que votre livraison sera retardée.</p>
      
      <div class="delay-info">
        <p>Retard estimé : <strong>{{delayText}}</strong></p>
      </div>
      
      <div class="eta">
        <p>Nouvelle heure d'arrivée estimée : <strong>{{newEta}}</strong></p>
      </div>
      
      <div class="reason">
        <p><strong>Raison du retard :</strong> {{reason}}</p>
      </div>
      
      <p>Vous pouvez suivre votre livraison en temps réel en cliquant sur le bouton ci-dessous.</p>
      
      <a href="{{trackingUrl}}" class="button">Suivre ma livraison</a>
      
      <p>Si vous avez des questions, n'hésitez pas à contacter notre service client à l'adresse <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>
    </div>
    
    <div class="footer">
      <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
      <p>© {{year}} EcoDeli. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template d'email pour notifier qu'un point de passage a été atteint
 */
export const checkpointReachedTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Point de passage de votre livraison</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      background-color: #f5f5f5;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 20px 0;
    }
    .checkpoint-info {
      background-color: #e8f4fd;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #2196F3;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{appUrl}}/images/logo.png" alt="EcoDeli" class="logo">
      <h1>{{title}}</h1>
    </div>
    
    <div class="content">
      <p>Bonjour {{name}},</p>
      
      <div class="checkpoint-info">
        <p>{{message}}</p>
        <p>Date : {{date}}</p>
      </div>
      
      <p>Vous pouvez suivre votre livraison en temps réel en cliquant sur le bouton ci-dessous.</p>
      
      <a href="{{trackingUrl}}" class="button">Suivre ma livraison</a>
    </div>
    
    <div class="footer">
      <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
      <p>© {{year}} EcoDeli. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template d'email pour notifier que la livraison est terminée
 */
export const deliveryCompletedTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre colis a été livré</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      background-color: #f5f5f5;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 20px 0;
    }
    .success-badge {
      background-color: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #28a745;
      text-align: center;
      font-weight: bold;
      font-size: 18px;
    }
    .proof-images {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
    }
    .proof-image {
      width: 48%;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 10px 10px 0 0;
    }
    .button-secondary {
      background-color: #6c757d;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="{{appUrl}}/images/logo.png" alt="EcoDeli" class="logo">
      <h1>Votre colis a été livré</h1>
    </div>
    
    <div class="content">
      <p>Bonjour {{name}},</p>
      
      <div class="success-badge">Livraison réussie !</div>
      
      <p>Votre colis a été livré avec succès par {{delivererName}}.</p>
      
      {{#if photoProofUrl}}
      <p><strong>Preuve de livraison :</strong></p>
      <div class="proof-images">
        {{#if photoProofUrl}}
        <img src="{{photoProofUrl}}" alt="Photo du colis livré" class="proof-image">
        {{/if}}
        
        {{#if signatureProofUrl}}
        <img src="{{signatureProofUrl}}" alt="Signature de réception" class="proof-image">
        {{/if}}
      </div>
      {{/if}}
      
      {{#if requireConfirmation}}
      <p>Veuillez confirmer la bonne réception de votre colis en cliquant sur le bouton ci-dessous :</p>
      
      <a href="{{confirmationUrl}}" class="button">Confirmer la réception</a>
      {{/if}}
      
      <a href="{{detailsUrl}}" class="button {{#if requireConfirmation}}button-secondary{{/if}}">Voir les détails</a>
      
      <p style="margin-top: 20px;">Nous vous remercions de votre confiance et espérons que vous êtes satisfait(e) de notre service de livraison.</p>
      
      <p>N'hésitez pas à nous faire part de vos commentaires en cliquant <a href="{{feedbackUrl}}">ici</a>.</p>
    </div>
    
    <div class="footer">
      <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
      <p>© {{year}} EcoDeli. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

// Fonction helper pour remplacer les variables dans les templates
export const renderTemplate = (
  template: string,
  data: Record<string, string | number | undefined>,
) => {
  // Ajouter l'année courante si non fournie
  if (!data.year) {
    data.year = new Date().getFullYear();
  }

  // Ajouter l'URL de base de l'application si non fournie
  if (!data.appUrl) {
    data.appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ecodeli.me";
  }

  // Remplacer les variables {{var}} dans le template
  let renderedTemplate = template;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const regex = new RegExp(`{{${key}}}`, "g");
      renderedTemplate = renderedTemplate.replace(regex, String(value));
    }
  }

  // Traitement des conditionnels {{#if var}}...{{/if}}
  Object.keys(data).forEach((key) => {
    const ifRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{/if}}`, "g");
    renderedTemplate = renderedTemplate.replace(ifRegex, (match, content) => {
      return data[key] ? content : "";
    });
  });

  return renderedTemplate;
};
