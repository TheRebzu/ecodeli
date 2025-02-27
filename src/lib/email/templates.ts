/**
 * Templates d'emails pour les différentes notifications de l'application
 * Permet de centraliser et standardiser le contenu des emails
 */

/**
 * Génère le template HTML pour un email
 */
export function generateEmailTemplate(options: {
  title: string;
  preheader?: string;
  content: string;
  footerLinks?: Array<{ text: string; url: string }>;
  showSocialLinks?: boolean;
  year?: number;
  accentColor?: string;
}): string {
  const {
    title,
    preheader = '',
    content,
    footerLinks = [],
    showSocialLinks = true,
    year = new Date().getFullYear(),
    accentColor = '#4CAF50',
  } = options;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <title>${title}</title>
        ${preheader ? `<meta name="description" content="${preheader}">` : ''}
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
          }
          .wrapper {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            box-sizing: border-box;
          }
          .logo {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo h1 {
            color: ${accentColor};
            margin: 0;
            font-size: 28px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
          }
          .button {
            display: inline-block;
            background-color: ${accentColor};
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-weight: bold;
            margin: 15px 0;
            text-align: center;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #777;
          }
          .footer p {
            margin: 5px 0;
          }
          .footer-links {
            margin: 10px 0;
          }
          .footer-links a {
            color: #777;
            text-decoration: underline;
            margin: 0 10px;
          }
          .social-links {
            margin: 15px 0;
          }
          .social-links a {
            display: inline-block;
            margin: 0 5px;
          }
          .alert-box {
            background-color: #fff8e1;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
          }
          .alert-box.error {
            background-color: #ffebee;
            border-left-color: #f44336;
          }
          .alert-box.success {
            background-color: #e8f5e9;
            border-left-color: #4caf50;
          }
          .divider {
            height: 1px;
            background-color: #eee;
            margin: 20px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          th {
            font-weight: bold;
            background-color: #f9f9f9;
          }
          @media screen and (max-width: 480px) {
            .container {
              padding: 20px 15px;
            }
            .button {
              display: block;
              text-align: center;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="logo">
            <h1>EcoDeli</h1>
          </div>
          <div class="container">
            <h2>${title}</h2>
            ${content}
          </div>
          <div class="footer">
            ${footerLinks.length > 0 
              ? `<div class="footer-links">
                  ${footerLinks.map(link => `<a href="${link.url}">${link.text}</a>`).join(' | ')}
                </div>` 
              : ''
            }
            ${showSocialLinks 
              ? `<div class="social-links">
                  <a href="https://facebook.com/ecodeli" aria-label="Facebook"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" alt="Facebook" width="24" height="24"></a>
                  <a href="https://twitter.com/ecodeli" aria-label="Twitter"><img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" alt="Twitter" width="24" height="24"></a>
                  <a href="https://instagram.com/ecodeli" aria-label="Instagram"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384063.png" alt="Instagram" width="24" height="24"></a>
                  <a href="https://linkedin.com/company/ecodeli" aria-label="LinkedIn"><img src="https://cdn-icons-png.flaticon.com/32/3536/3536505.png" alt="LinkedIn" width="24" height="24"></a>
                </div>`
              : ''
            }
            <p>&copy; ${year} EcoDeli. Tous droits réservés.</p>
            <p>110, rue de Flandre, 75019 Paris, France</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Template pour l'email de bienvenue
 */
export function welcomeEmailTemplate(options: {
  firstName: string;
  verificationLink: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, verificationLink } = options;

  const subject = 'Bienvenue sur EcoDeli - Confirmez votre adresse email';

  const content = `
    <p>Bonjour ${firstName} !</p>
    <p>Nous sommes ravis de vous accueillir sur EcoDeli, la solution de livraison collaborative et de services à la personne.</p>
    <p>Pour finaliser votre inscription et accéder à tous nos services, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
    
    <div style="text-align: center;">
      <a href="${verificationLink}" class="button">Confirmer mon email</a>
    </div>
    
    <p>Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte sur EcoDeli, veuillez ignorer cet email.</p>
    
    <p>Pour toute question, n'hésitez pas à contacter notre équipe de support à <a href="mailto:support@ecodeli.me">support@ecodeli.me</a>.</p>
  `;

  const html = generateEmailTemplate({
    title: 'Bienvenue sur EcoDeli',
    preheader: 'Finalisez votre inscription et commencez à utiliser nos services.',
    content,
    footerLinks: [
      { text: 'Conditions d\'utilisation', url: 'https://ecodeli.me/terms' },
      { text: 'Politique de confidentialité', url: 'https://ecodeli.me/privacy' }
    ]
  });

  const text = `
    Bonjour ${firstName} !
    
    Nous sommes ravis de vous accueillir sur EcoDeli, la solution de livraison collaborative et de services à la personne.
    
    Pour finaliser votre inscription et accéder à tous nos services, veuillez confirmer votre adresse email en cliquant sur le lien ci-dessous :
    
    ${verificationLink}
    
    Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte sur EcoDeli, veuillez ignorer cet email.
    
    Pour toute question, n'hésitez pas à contacter notre équipe de support à support@ecodeli.me.
    
    © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
    110, rue de Flandre, 75019 Paris, France
  `;

  return { subject, html, text };
}

/**
 * Template pour l'email de réinitialisation de mot de passe
 */
export function passwordResetEmailTemplate(options: {
  firstName: string;
  resetLink: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, resetLink } = options;

  const subject = 'EcoDeli - Réinitialisation de votre mot de passe';

  const content = `
    <p>Bonjour ${firstName},</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe sur EcoDeli.</p>
    <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
    
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
    </div>
    
    <div class="alert-box error">
      <p><strong>Attention :</strong> Si vous n'êtes pas à l'origine de cette demande, nous vous conseillons de sécuriser votre compte immédiatement en contactant notre support.</p>
    </div>
    
    <p>Ce lien expirera dans 1 heure. Si vous n'avez pas demandé de réinitialisation de mot de passe, veuillez ignorer cet email.</p>
  `;

  const html = generateEmailTemplate({
    title: 'Réinitialisation de votre mot de passe',
    preheader: 'Suivez ces instructions pour réinitialiser votre mot de passe EcoDeli.',
    content,
    accentColor: '#2196F3',
    footerLinks: [
      { text: 'Aide', url: 'https://ecodeli.me/help' },
      { text: 'Support', url: 'https://ecodeli.me/support' }
    ]
  });

  const text = `
    Bonjour ${firstName},
    
    Vous avez demandé la réinitialisation de votre mot de passe sur EcoDeli.
    
    Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :
    
    ${resetLink}
    
    ATTENTION : Si vous n'êtes pas à l'origine de cette demande, nous vous conseillons de sécuriser votre compte immédiatement.
    
    Ce lien expirera dans 1 heure. Si vous n'avez pas demandé de réinitialisation de mot de passe, veuillez ignorer cet email.
    
    © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
    110, rue de Flandre, 75019 Paris, France
  `;

  return { subject, html, text };
}

/**
 * Template pour l'email de confirmation de livraison
 */
export function deliveryUpdateEmailTemplate(options: {
  firstName: string;
  deliveryInfo: {
    id: string;
    trackingCode?: string;
    status: string;
    estimatedDelivery?: string;
    origin: string;
    destination: string;
    details?: string;
    trackingLink?: string;
  }
}): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, deliveryInfo } = options;

  const subject = `EcoDeli - Mise à jour de votre livraison #${deliveryInfo.id}`;

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (status: string): string => {
    const statusMap: Record<string, string> = {
      'PENDING': '#FFC107',
      'ACCEPTED': '#2196F3',
      'IN_PREPARATION': '#9C27B0',
      'PICKED_UP': '#FF9800',
      'IN_TRANSIT': '#3F51B5',
      'AT_WAREHOUSE': '#795548',
      'READY_FOR_PICKUP': '#009688',
      'DELIVERED': '#4CAF50',
      'CANCELLED': '#F44336',
      'FAILED': '#E91E63'
    };

    return statusMap[status] || '#2196F3';
  };

  const content = `
    <p>Bonjour ${firstName},</p>
    <p>Votre livraison ${deliveryInfo.trackingCode ? `avec le code de suivi <strong>${deliveryInfo.trackingCode}</strong>` : `#${deliveryInfo.id}`} a été mise à jour.</p>
    
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Statut:</strong> <span style="color: ${getStatusColor(deliveryInfo.status)}; font-weight: bold;">${deliveryInfo.status}</span></p>
      ${deliveryInfo.estimatedDelivery ? `<p><strong>Livraison estimée:</strong> ${deliveryInfo.estimatedDelivery}</p>` : ''}
      <p><strong>Origine:</strong> ${deliveryInfo.origin}</p>
      <p><strong>Destination:</strong> ${deliveryInfo.destination}</p>
      ${deliveryInfo.details ? `<p><strong>Détails:</strong> ${deliveryInfo.details}</p>` : ''}
    </div>
    
    ${deliveryInfo.trackingLink ? `
      <div style="text-align: center;">
        <a href="${deliveryInfo.trackingLink}" class="button">Suivre ma livraison</a>
      </div>
    ` : ''}
    
    <p>Pour toute question concernant votre livraison, n'hésitez pas à contacter notre service client à <a href="mailto:support@ecodeli.me">support@ecodeli.me</a>.</p>
  `;

  const html = generateEmailTemplate({
    title: 'Mise à jour de votre livraison',
    preheader: `Votre livraison #${deliveryInfo.id} est maintenant ${deliveryInfo.status}`,
    content,
    accentColor: getStatusColor(deliveryInfo.status),
    footerLinks: [
      { text: 'Mes livraisons', url: 'https://ecodeli.me/deliveries' },
      { text: 'Support', url: 'https://ecodeli.me/support' }
    ]
  });

  const text = `
    Bonjour ${firstName},
    
    Votre livraison ${deliveryInfo.trackingCode ? `avec le code de suivi ${deliveryInfo.trackingCode}` : `#${deliveryInfo.id}`} a été mise à jour.
    
    Statut: ${deliveryInfo.status}
    ${deliveryInfo.estimatedDelivery ? `Livraison estimée: ${deliveryInfo.estimatedDelivery}` : ''}
    Origine: ${deliveryInfo.origin}
    Destination: ${deliveryInfo.destination}
    ${deliveryInfo.details ? `Détails: ${deliveryInfo.details}` : ''}
    
    ${deliveryInfo.trackingLink ? `Suivre ma livraison: ${deliveryInfo.trackingLink}` : ''}
    
    Pour toute question concernant votre livraison, n'hésitez pas à contacter notre service client à support@ecodeli.me.
    
    © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
    110, rue de Flandre, 75019 Paris, France
  `;

  return { subject, html, text };
}

/**
 * Template pour l'email d'alerte de sécurité
 */
export function securityAlertEmailTemplate(options: {
  firstName: string;
  alertInfo: {
    type: string;
    details: string;
    time: string;
    location?: string;
    device?: string;
    ip?: string;
    actionLink?: string;
    actionText?: string;
  }
}): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, alertInfo } = options;

  const subject = `EcoDeli - Alerte de sécurité importante`;

  const content = `
    <p>Bonjour ${firstName},</p>
    <p>Nous avons détecté une activité inhabituelle sur votre compte EcoDeli.</p>
    
    <div class="alert-box error">
      <p><strong>Type d'alerte:</strong> ${alertInfo.type}</p>
      <p><strong>Détails:</strong> ${alertInfo.details}</p>
      <p><strong>Date et heure:</strong> ${alertInfo.time}</p>
      ${alertInfo.location ? `<p><strong>Localisation:</strong> ${alertInfo.location}</p>` : ''}
      ${alertInfo.device ? `<p><strong>Appareil:</strong> ${alertInfo.device}</p>` : ''}
      ${alertInfo.ip ? `<p><strong>Adresse IP:</strong> ${alertInfo.ip}</p>` : ''}
    </div>
    
    ${alertInfo.actionLink && alertInfo.actionText ? `
      <div style="text-align: center;">
        <a href="${alertInfo.actionLink}" class="button">${alertInfo.actionText}</a>
      </div>
    ` : ''}
    
    <p><strong>Si cette activité ne provient pas de vous</strong>, veuillez sécuriser votre compte immédiatement en modifiant votre mot de passe et en contactant notre équipe de support à <a href="mailto:support@ecodeli.me">support@ecodeli.me</a>.</p>
  `;

  const html = generateEmailTemplate({
    title: 'Alerte de sécurité',
    preheader: 'Activité inhabituelle détectée sur votre compte EcoDeli',
    content,
    accentColor: '#E53935',
    footerLinks: [
      { text: 'Sécurité', url: 'https://ecodeli.me/security' },
      { text: 'Support', url: 'https://ecodeli.me/support' }
    ]
  });

  const text = `
    Bonjour ${firstName},
    
    Nous avons détecté une activité inhabituelle sur votre compte EcoDeli.
    
    Type d'alerte: ${alertInfo.type}
    Détails: ${alertInfo.details}
    Date et heure: ${alertInfo.time}
    ${alertInfo.location ? `Localisation: ${alertInfo.location}` : ''}
    ${alertInfo.device ? `Appareil: ${alertInfo.device}` : ''}
    ${alertInfo.ip ? `Adresse IP: ${alertInfo.ip}` : ''}
    
    ${alertInfo.actionLink && alertInfo.actionText ? `${alertInfo.actionText}: ${alertInfo.actionLink}` : ''}
    
    Si cette activité ne provient pas de vous, veuillez sécuriser votre compte immédiatement en modifiant votre mot de passe et en contactant notre équipe de support à support@ecodeli.me.
    
    © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
    110, rue de Flandre, 75019 Paris, France
  `;

  return { subject, html, text };
}

/**
 * Template pour les factures
 */
export function invoiceEmailTemplate(options: {
  firstName: string;
  invoiceInfo: {
    invoiceNumber: string;
    date: string;
    dueDate: string;
    amount: number;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    downloadLink: string;
  }
}): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, invoiceInfo } = options;

  const subject = `EcoDeli - Facture #${invoiceInfo.invoiceNumber}`;

  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const content = `
    <p>Bonjour ${firstName},</p>
    <p>Veuillez trouver ci-joint votre facture #${invoiceInfo.invoiceNumber}.</p>
    
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Détails de la facture</h3>
      <p><strong>Numéro de facture:</strong> ${invoiceInfo.invoiceNumber}</p>
      <p><strong>Date:</strong> ${invoiceInfo.date}</p>
      <p><strong>Date d'échéance:</strong> ${invoiceInfo.dueDate}</p>
      
      <div class="divider"></div>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qté</th>
            <th>Prix unitaire</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceInfo.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${formatPrice(item.unitPrice)}</td>
              <td>${formatPrice(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Sous-total</strong></td>
            <td>${formatPrice(invoiceInfo.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right;"><strong>TVA (20%)</strong></td>
            <td>${formatPrice(invoiceInfo.tax)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Total</strong></td>
            <td><strong>${formatPrice(invoiceInfo.total)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <div style="text-align: center;">
      <a href="${invoiceInfo.downloadLink}" class="button">Télécharger la facture</a>
    </div>
    
    <p>Pour toute question concernant cette facture, n'hésitez pas à contacter notre service client à <a href="mailto:facturation@ecodeli.me">facturation@ecodeli.me</a>.</p>
  `;

  const html = generateEmailTemplate({
    title: `Facture #${invoiceInfo.invoiceNumber}`,
    preheader: `Votre facture EcoDeli d'un montant de ${formatPrice(invoiceInfo.total)}`,
    content,
    accentColor: '#607D8B',
    footerLinks: [
      { text: 'Mes factures', url: 'https://ecodeli.me/invoices' },
      { text: 'Support', url: 'https://ecodeli.me/support' }
    ]
  });

  const text = `
    Bonjour ${firstName},
    
    Veuillez trouver ci-joint votre facture #${invoiceInfo.invoiceNumber}.
    
    Détails de la facture:
    
    Numéro de facture: ${invoiceInfo.invoiceNumber}
    Date: ${invoiceInfo.date}
    Date d'échéance: ${invoiceInfo.dueDate}
    
    ${invoiceInfo.items.map(item => `
    - ${item.description}
      Quantité: ${item.quantity}
      Prix unitaire: ${formatPrice(item.unitPrice)}
      Total: ${formatPrice(item.total)}
    `).join('\n')}
    
    Sous-total: ${formatPrice(invoiceInfo.subtotal)}
    TVA (20%): ${formatPrice(invoiceInfo.tax)}
    Total: ${formatPrice(invoiceInfo.total)}
    
    Téléchargez votre facture: ${invoiceInfo.downloadLink}
    
    Pour toute question concernant cette facture, n'hésitez pas à contacter notre service client à facturation@ecodeli.me.
    
    © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
    110, rue de Flandre, 75019 Paris, France
  `;

  return { subject, html, text };
}