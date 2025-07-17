import nodemailer from "nodemailer";

/**
 * Configuration Nodemailer pour SMTP
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.celian-vf.fr",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true pour 465, false pour 587 (STARTTLS)
  requireTLS: true, // Force TLS
  auth: {
    user: process.env.GMAIL_USER || "",
    pass: process.env.GMAIL_APP_PASSWORD || "",
  },
  tls: {
    // Ne pas échouer sur les certificats invalides en dev
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

/**
 * Interface pour les erreurs d'email
 */
export interface EmailError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Service d'envoi d'emails SMTP avec gestion d'erreurs avancée
 */
export class EmailService {
  /**
   * Envoyer un email de vérification
   */
  static async sendVerificationEmail(
    email: string,
    verificationUrl: string,
    locale: string = "fr",
  ) {
    const subject =
      locale === "fr"
        ? "🔐 Vérifiez votre email - EcoDeli"
        : "🔐 Verify your email - EcoDeli";

    const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
          .button { display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
          </div>
          
          <h2>${locale === "fr" ? "Vérifiez votre adresse email" : "Verify your email address"}</h2>
          
          <p>${
            locale === "fr"
              ? "Merci de vous être inscrit sur EcoDeli ! Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :"
              : "Thank you for signing up with EcoDeli! To activate your account, please click the button below:"
          }</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">
              ${locale === "fr" ? "✅ Vérifier mon email" : "✅ Verify my email"}
            </a>
          </div>
          
          <p>${
            locale === "fr"
              ? "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :"
              : "If the button doesn't work, copy and paste this link into your browser:"
          }</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <div class="footer">
            <p>${
              locale === "fr"
                ? "Cet email a été envoyé automatiquement, merci de ne pas y répondre."
                : "This email was sent automatically, please do not reply."
            }</p>
            <p>© 2025 EcoDeli - ${locale === "fr" ? "Livraison écologique" : "Eco-friendly delivery"}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@ecodeli.me",
      to: email,
      subject,
      html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email de vérification envoyé à ${email} (${result.messageId})`);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error("❌ Erreur envoi email vérification:", error);
      throw this.handleEmailError(error);
    }
  }

  /**
   * Envoyer un email de reset de mot de passe
   */
  static async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    locale: string = "fr",
  ) {
    const subject =
      locale === "fr"
        ? "🔑 Réinitialisation de votre mot de passe - EcoDeli"
        : "🔑 Password reset - EcoDeli";

    const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
          .button { display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
          </div>
          
          <h2>${locale === "fr" ? "Réinitialisation de votre mot de passe" : "Password reset"}</h2>
          
          <p>${
            locale === "fr"
              ? "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :"
              : "You have requested a password reset. Click the button below to create a new password:"
          }</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">
              ${locale === "fr" ? "🔑 Réinitialiser mon mot de passe" : "🔑 Reset my password"}
            </a>
          </div>
          
          <p>${
            locale === "fr"
              ? "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email."
              : "If you didn't request this reset, please ignore this email."
          }</p>
          
          <div class="footer">
            <p>${
              locale === "fr"
                ? "Ce lien expirera dans 24 heures pour votre sécurité."
                : "This link will expire in 24 hours for your security."
            }</p>
            <p>© 2025 EcoDeli - ${locale === "fr" ? "Livraison écologique" : "Eco-friendly delivery"}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@ecodeli.me",
      to: email,
      subject,
      html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email de reset envoyé à ${email} (${result.messageId})`);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error("❌ Erreur envoi email reset:", error);
      throw this.handleEmailError(error);
    }
  }

  /**
   * Envoyer un email générique (sujet + html)
   */
  static async sendGenericEmail(email: string, subject: string, html: string) {
    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@ecodeli.me",
      to: email,
      subject,
      html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      // Email générique envoyé
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Erreur envoi email générique:", error);
      throw error;
    }
  }

  /**
   * Envoyer un email de confirmation de réservation
   */
  static async sendBookingConfirmationEmail(
    clientEmail: string,
    bookingData: {
      clientName: string;
      serviceName: string;
      providerName: string;
      scheduledDate: string;
      scheduledTime: string;
      location: string;
      totalPrice: number;
      bookingId: string;
      notes?: string;
    },
    locale: string = "fr",
  ) {
    const subject =
      locale === "fr"
        ? "📅 Confirmation de réservation - EcoDeli"
        : "📅 Booking confirmation - EcoDeli";

    const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; padding: 20px; border-radius: 8px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 14px; opacity: 0.9; }
          .booking-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .booking-detail { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .booking-detail:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #6b7280; }
          .price { background: #dcfce7; color: #166534; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
          .button { display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .status-badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
            <div class="subtitle">${locale === "fr" ? "Votre plateforme de services éco-responsables" : "Your eco-friendly services platform"}</div>
          </div>
          
          <h2>${locale === "fr" ? "✅ Réservation confirmée !" : "✅ Booking confirmed!"}</h2>
          
          <p>${
            locale === "fr"
              ? `Bonjour ${bookingData.clientName},`
              : `Hello ${bookingData.clientName},`
          }</p>
          
          <p>${
            locale === "fr"
              ? "Votre réservation a été créée avec succès. Voici les détails :"
              : "Your booking has been created successfully. Here are the details:"
          }</p>
          
          <div class="booking-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0; color: #16a34a;">${bookingData.serviceName}</h3>
              <span class="status-badge">${locale === "fr" ? "EN ATTENTE" : "PENDING"}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Prestataire :" : "Provider:"}</span>
              <span class="value">${bookingData.providerName}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Date :" : "Date:"}</span>
              <span class="value">${bookingData.scheduledDate}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Heure :" : "Time:"}</span>
              <span class="value">${bookingData.scheduledTime}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Lieu :" : "Location:"}</span>
              <span class="value">${bookingData.location}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Référence :" : "Reference:"}</span>
              <span class="value">#${bookingData.bookingId.slice(-8).toUpperCase()}</span>
            </div>
            
            ${
              bookingData.notes
                ? `
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Notes :" : "Notes:"}</span>
              <span class="value">${bookingData.notes}</span>
            </div>
            `
                : ""
            }
          </div>
          
          <div class="price">
            💰 ${locale === "fr" ? "Prix total :" : "Total price:"} ${bookingData.totalPrice.toFixed(2)}€
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/client/bookings/${bookingData.bookingId}" class="button">
              ${locale === "fr" ? "📱 Voir ma réservation" : "📱 View my booking"}
            </a>
          </div>
          
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1e40af;">${locale === "fr" ? "📋 Prochaines étapes" : "📋 Next steps"}</h4>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
              <li>${locale === "fr" ? "Le prestataire va confirmer votre réservation" : "The provider will confirm your booking"}</li>
              <li>${locale === "fr" ? "Vous recevrez une notification de confirmation" : "You will receive a confirmation notification"}</li>
              <li>${locale === "fr" ? "Le paiement sera effectué après confirmation" : "Payment will be processed after confirmation"}</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>${
              locale === "fr"
                ? "Besoin d'aide ? Contactez notre support à"
                : "Need help? Contact our support at"
            } <a href="mailto:support@ecodeli.me">support@ecodeli.me</a></p>
            <p>© 2025 EcoDeli - ${locale === "fr" ? "Livraison écologique" : "Eco-friendly delivery"}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@ecodeli.me",
      to: clientEmail,
      subject,
      html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Erreur envoi email de réservation:", error);
      throw error;
    }
  }

  /**
   * Envoyer un email de nouvelle réservation au prestataire
   */
  static async sendNewBookingNotificationEmail(
    providerEmail: string,
    bookingData: {
      providerName: string;
      clientName: string;
      serviceName: string;
      scheduledDate: string;
      scheduledTime: string;
      location: string;
      totalPrice: number;
      bookingId: string;
      notes?: string;
    },
    locale: string = "fr",
  ) {
    const subject =
      locale === "fr"
        ? "🔔 Nouvelle réservation reçue - EcoDeli"
        : "🔔 New booking received - EcoDeli";

    const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 14px; opacity: 0.9; }
          .booking-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .booking-detail { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .booking-detail:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #6b7280; }
          .price { background: #dbeafe; color: #1e40af; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
          .button { display: inline-block; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 10px 5px; text-align: center; }
          .btn-accept { background: #16a34a; }
          .btn-view { background: #3b82f6; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .status-badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
            <div class="subtitle">${locale === "fr" ? "Espace Prestataire" : "Provider Dashboard"}</div>
          </div>
          
          <h2>${locale === "fr" ? "🎉 Nouvelle réservation !" : "🎉 New booking!"}</h2>
          
          <p>${
            locale === "fr"
              ? `Bonjour ${bookingData.providerName},`
              : `Hello ${bookingData.providerName},`
          }</p>
          
          <p>${
            locale === "fr"
              ? "Vous avez reçu une nouvelle réservation pour votre service. Voici les détails :"
              : "You have received a new booking for your service. Here are the details:"
          }</p>
          
          <div class="booking-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0; color: #3b82f6;">${bookingData.serviceName}</h3>
              <span class="status-badge">${locale === "fr" ? "NOUVELLE" : "NEW"}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Client :" : "Client:"}</span>
              <span class="value">${bookingData.clientName}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Date :" : "Date:"}</span>
              <span class="value">${bookingData.scheduledDate}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Heure :" : "Time:"}</span>
              <span class="value">${bookingData.scheduledTime}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Lieu :" : "Location:"}</span>
              <span class="value">${bookingData.location}</span>
            </div>
            
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Référence :" : "Reference:"}</span>
              <span class="value">#${bookingData.bookingId.slice(-8).toUpperCase()}</span>
            </div>
            
            ${
              bookingData.notes
                ? `
            <div class="booking-detail">
              <span class="label">${locale === "fr" ? "Notes du client :" : "Client notes:"}</span>
              <span class="value">${bookingData.notes}</span>
            </div>
            `
                : ""
            }
          </div>
          
          <div class="price">
            💰 ${locale === "fr" ? "Montant de la réservation :" : "Booking amount:"} ${bookingData.totalPrice.toFixed(2)}€
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/provider/bookings/${bookingData.bookingId}" class="button btn-view">
              ${locale === "fr" ? "📱 Voir la réservation" : "📱 View booking"}
            </a>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #166534;">${locale === "fr" ? "⚡ Actions rapides" : "⚡ Quick actions"}</h4>
            <p style="margin: 10px 0; color: #374151;">
              ${
                locale === "fr"
                  ? "Connectez-vous à votre espace prestataire pour accepter ou modifier cette réservation."
                  : "Log in to your provider dashboard to accept or modify this booking."
              }
            </p>
          </div>
          
          <div class="footer">
            <p>${
              locale === "fr"
                ? "Questions ? Contactez notre support à"
                : "Questions? Contact our support at"
            } <a href="mailto:support@ecodeli.me">support@ecodeli.me</a></p>
            <p>© 2025 EcoDeli - ${locale === "fr" ? "Services écologiques" : "Eco-friendly services"}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@ecodeli.me",
      to: providerEmail,
      subject,
      html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Erreur envoi email prestataire:", error);
      throw error;
    }
  }

  /**
   * Envoyer un email de démarrage de service au client
   */
  static async sendServiceStartedEmail(
    clientEmail: string,
    serviceData: {
      clientName: string;
      providerName: string;
      serviceName: string;
      serviceDescription: string;
      startedAt: string;
      estimatedDuration?: number;
      serviceId: string;
    },
    locale: string = "fr",
  ) {
    const subject =
      locale === "fr"
        ? "🚀 Votre service a commencé - EcoDeli"
        : "🚀 Your service has started - EcoDeli";

    const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 14px; opacity: 0.9; }
          .service-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .service-detail { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e0e7ff; }
          .service-detail:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #1e40af; }
          .value { color: #374151; }
          .status-badge { background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin: 15px 0; }
          .button { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
            <div class="subtitle">${locale === "fr" ? "Votre plateforme de services éco-responsables" : "Your eco-friendly services platform"}</div>
          </div>
          
          <h2>${locale === "fr" ? "🚀 Votre service a commencé !" : "🚀 Your service has started!"}</h2>
          
          <p>${
            locale === "fr"
              ? `Bonjour ${serviceData.clientName},`
              : `Hello ${serviceData.clientName},`
          }</p>
          
          <p>${
            locale === "fr"
              ? `Bonne nouvelle ! <strong>${serviceData.providerName}</strong> vient de commencer votre service.`
              : `Good news! <strong>${serviceData.providerName}</strong> has just started your service.`
          }</p>
          
          <div class="service-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0; color: #1e40af;">${serviceData.serviceName}</h3>
              <span class="status-badge">${locale === "fr" ? "🟢 EN COURS" : "🟢 IN PROGRESS"}</span>
            </div>
            
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Prestataire :" : "Provider:"}</span>
              <span class="value">${serviceData.providerName}</span>
            </div>
            
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Service :" : "Service:"}</span>
              <span class="value">${serviceData.serviceName}</span>
            </div>
            
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Commencé le :" : "Started on:"}</span>
              <span class="value">${serviceData.startedAt}</span>
            </div>
            
            ${
              serviceData.estimatedDuration
                ? `
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Durée estimée :" : "Estimated duration:"}</span>
              <span class="value">${Math.floor(serviceData.estimatedDuration / 60)}h${serviceData.estimatedDuration % 60 > 0 ? ` ${serviceData.estimatedDuration % 60}min` : ""}</span>
            </div>
            `
                : ""
            }
            
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Référence :" : "Reference:"}</span>
              <span class="value">#${serviceData.serviceId.slice(-8).toUpperCase()}</span>
            </div>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #166534;">${locale === "fr" ? "📋 Informations importantes" : "📋 Important information"}</h4>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
              <li>${locale === "fr" ? "Votre prestataire travaille maintenant sur votre demande" : "Your provider is now working on your request"}</li>
              <li>${locale === "fr" ? "Vous recevrez une notification une fois le service terminé" : "You will receive a notification once the service is completed"}</li>
              <li>${locale === "fr" ? "Vous pourrez évaluer le service après sa réalisation" : "You will be able to rate the service after completion"}</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/client/services/${serviceData.serviceId}" class="button">
              ${locale === "fr" ? "📱 Suivre mon service" : "📱 Track my service"}
            </a>
          </div>
          
          <div class="footer">
            <p>${
              locale === "fr"
                ? "Besoin d'aide ? Contactez notre support à"
                : "Need help? Contact our support at"
            } <a href="mailto:support@ecodeli.me">support@ecodeli.me</a></p>
            <p>© 2025 EcoDeli - ${locale === "fr" ? "Services écologiques" : "Eco-friendly services"}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@ecodeli.me",
      to: clientEmail,
      subject,
      html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Erreur envoi email service commencé:", error);
      throw error;
    }
  }

  /**
   * Envoyer un email de fin de service au client
   */
  static async sendServiceCompletedEmail(
    clientEmail: string,
    serviceData: {
      clientName: string;
      providerName: string;
      serviceName: string;
      serviceDescription: string;
      completedAt: string;
      actualDuration?: number;
      serviceId: string;
    },
    locale: string = "fr",
  ) {
    const subject =
      locale === "fr"
        ? "✅ Votre service est terminé - EcoDeli"
        : "✅ Your service is completed - EcoDeli";

    const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; padding: 20px; border-radius: 8px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 14px; opacity: 0.9; }
          .service-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .service-detail { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #dcfce7; }
          .service-detail:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #166534; }
          .value { color: #374151; }
          .status-badge { background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; display: inline-block; margin: 15px 0; }
          .button { display: inline-block; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 10px 5px; text-align: center; }
          .btn-rate { background: #f59e0b; }
          .btn-view { background: #16a34a; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .rating-section { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
            <div class="subtitle">${locale === "fr" ? "Votre plateforme de services éco-responsables" : "Your eco-friendly services platform"}</div>
          </div>
          
          <h2>${locale === "fr" ? "🎉 Service terminé avec succès !" : "🎉 Service completed successfully!"}</h2>
          
          <p>${
            locale === "fr"
              ? `Bonjour ${serviceData.clientName},`
              : `Hello ${serviceData.clientName},`
          }</p>
          
          <p>${
            locale === "fr"
              ? `Excellente nouvelle ! <strong>${serviceData.providerName}</strong> vient de terminer votre service.`
              : `Great news! <strong>${serviceData.providerName}</strong> has just completed your service.`
          }</p>
          
          <div class="service-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0; color: #166534;">${serviceData.serviceName}</h3>
              <span class="status-badge">${locale === "fr" ? "✅ TERMINÉ" : "✅ COMPLETED"}</span>
            </div>
            
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Prestataire :" : "Provider:"}</span>
              <span class="value">${serviceData.providerName}</span>
            </div>
            
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Service :" : "Service:"}</span>
              <span class="value">${serviceData.serviceName}</span>
            </div>
            
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Terminé le :" : "Completed on:"}</span>
              <span class="value">${serviceData.completedAt}</span>
            </div>
            
            ${
              serviceData.actualDuration
                ? `
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Durée réelle :" : "Actual duration:"}</span>
              <span class="value">${Math.floor(serviceData.actualDuration / 60)}h${serviceData.actualDuration % 60 > 0 ? ` ${serviceData.actualDuration % 60}min` : ""}</span>
            </div>
            `
                : ""
            }
            
            <div class="service-detail">
              <span class="label">${locale === "fr" ? "Référence :" : "Reference:"}</span>
              <span class="value">#${serviceData.serviceId.slice(-8).toUpperCase()}</span>
            </div>
          </div>
          
          <div class="rating-section">
            <h3 style="margin-top: 0; color: #92400e;">${locale === "fr" ? "⭐ Évaluez votre expérience" : "⭐ Rate your experience"}</h3>
            <p style="margin: 10px 0; color: #374151;">
              ${
                locale === "fr"
                  ? "Votre avis nous aide à améliorer nos services et aide les autres clients dans leur choix."
                  : "Your feedback helps us improve our services and helps other clients make their choices."
              }
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/client/services/${serviceData.serviceId}/review" class="button btn-rate">
              ${locale === "fr" ? "⭐ Donner mon avis" : "⭐ Leave a review"}
            </a>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/client/services/${serviceData.serviceId}" class="button btn-view">
              ${locale === "fr" ? "📱 Voir les détails" : "📱 View details"}
            </a>
          </div>
          
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1e40af;">${locale === "fr" ? "💝 Merci pour votre confiance" : "💝 Thank you for your trust"}</h4>
            <p style="margin: 10px 0; color: #374151;">
              ${
                locale === "fr"
                  ? "Nous espérons que vous êtes satisfait du service. N'hésitez pas à faire appel à nouveau à nos prestataires !"
                  : "We hope you are satisfied with the service. Don't hesitate to use our providers again!"
              }
            </p>
          </div>
          
          <div class="footer">
            <p>${
              locale === "fr"
                ? "Besoin d'aide ? Contactez notre support à"
                : "Need help? Contact our support at"
            } <a href="mailto:support@ecodeli.me">support@ecodeli.me</a></p>
            <p>© 2025 EcoDeli - ${locale === "fr" ? "Services écologiques" : "Eco-friendly services"}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || "noreply@ecodeli.me",
      to: clientEmail,
      subject,
      html,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Erreur envoi email service terminé:", error);
      throw error;
    }
  }

  /**
   * Tester la connexion SMTP
   */
  static async testConnection() {
    try {
      await transporter.verify();
      console.log("✅ Connexion SMTP réussie");
      return { success: true };
    } catch (error: any) {
      console.error("❌ Erreur connexion SMTP:", error);
      throw this.handleEmailError(error);
    }
  }

  /**
   * Gérer les erreurs d'email avec messages explicites
   */
  private static handleEmailError(error: any): EmailError {
    // Erreurs de connexion SMTP
    if (error.code === 'ECONNREFUSED') {
      return {
        code: 'SMTP_CONNECTION_REFUSED',
        message: 'Impossible de se connecter au serveur SMTP',
        details: error
      };
    }

    if (error.code === 'EAUTH') {
      return {
        code: 'SMTP_AUTH_FAILED',
        message: 'Échec de l\'authentification SMTP',
        details: error
      };
    }

    if (error.code === 'ETIMEDOUT') {
      return {
        code: 'SMTP_TIMEOUT',
        message: 'Timeout de connexion SMTP',
        details: error
      };
    }

    // Erreurs de validation email
    if (error.responseCode === 554) {
      return {
        code: 'EMAIL_REJECTED',
        message: 'Email rejeté par le serveur',
        details: error
      };
    }

    if (error.responseCode === 550) {
      return {
        code: 'EMAIL_NOT_FOUND',
        message: 'Adresse email non trouvée',
        details: error
      };
    }

    if (error.responseCode === 552) {
      return {
        code: 'EMAIL_QUOTA_EXCEEDED',
        message: 'Quota de boîte mail dépassé',
        details: error
      };
    }

    // Erreur générique
    return {
      code: 'EMAIL_UNKNOWN_ERROR',
      message: error.message || 'Erreur inconnue lors de l\'envoi d\'email',
      details: error
    };
  }

  /**
   * Envoyer un email avec retry automatique
   */
  static async sendEmailWithRetry(
    mailOptions: any,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<{ success: boolean; messageId?: string }> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email envoyé avec succès après ${attempt} tentative(s) (${result.messageId})`);
        return { success: true, messageId: result.messageId };
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Tentative ${attempt}/${maxRetries} échouée:`, error.message);
        
        // Si ce n'est pas la dernière tentative, attendre avant de retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    // Toutes les tentatives ont échoué
    throw this.handleEmailError(lastError);
  }

  /**
   * Valider une adresse email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Créer un template HTML responsive
   */
  static createResponsiveTemplate(content: string, title: string): string {
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background-color: #f8fafc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
          }
          .email-wrapper {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .content {
            padding: 30px;
          }
          .footer {
            background: #f1f5f9;
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            background: #059669;
            color: white !important;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background: #047857;
          }
          @media only screen and (max-width: 600px) {
            .container { padding: 10px; }
            .content { padding: 20px; }
            .header { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-wrapper">
            <div class="header">
              <div class="logo">🌱 EcoDeli</div>
              <div>Livraison éco-responsable</div>
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <p>© 2025 EcoDeli - Tous droits réservés</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Fonction sendEmail pour compatibilité avec le code existant
export const sendEmail = EmailService.sendGenericEmail;

// Export des types et fonctions utilitaires
export type { EmailError };
export const { validateEmail, createResponsiveTemplate, testConnection } = EmailService;
