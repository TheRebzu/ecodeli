import winston from "winston";

/**
 * Configuration centralisée des logs pour EcoDeli
 * Logger simplifié avec Winston
 */

// Configuration des niveaux de log personnalisés
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(logColors);

// Format personnalisé pour les logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }

    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  }),
);

// Configuration des transports selon l'environnement
const transports: winston.transport[] = [];

if (process.env.NODE_ENV === "production") {
  // En production : fichiers de logs + services cloud
  transports.push(
    // Logs d'erreurs séparés
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // Tous les logs dans un fichier combiné
    new winston.transports.File({
      filename: "logs/combined.log",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );

  // Intégration avec les services cloud (Datadog, Azure Monitor, etc.)
  if (process.env.DATADOG_API_KEY) {
    // Configuration Datadog sera ajoutée ici
    transports.push(
      new winston.transports.Http({
        host: "http-intake.logs.datadoghq.eu",
        path: `/v1/input/${process.env.DATADOG_API_KEY}?ddsource=nodejs&service=ecodeli`,
        ssl: true,
      }),
    );
  }
} else {
  // En développement : console avec couleurs
  transports.push(
    new winston.transports.Console({
      format: logFormat,
    }),
  );
}

// Création du logger principal
export const logger = winston.createLogger({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  levels: logLevels,
  transports,

  // Gestion des exceptions non capturées
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],

  // Gestion des rejections de promesses
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
  ],
});

// Configuration simplifiée pour éviter les erreurs OpenTelemetry
export function initializeTracing() {
  // Désactivé temporairement - à réactiver en production avec les bonnes dépendances
  if (process.env.ENABLE_TRACING === "true") {
    logger.info("Tracing désactivé temporairement", {
      service: "ecodeli",
      environment: process.env.NODE_ENV,
    });
  }
}

// Utilitaires de logging spécialisés pour EcoDeli
export const ecoLogger = {
  // Logs d'authentification
  auth: {
    login: (userId: string, role: string, ip?: string) =>
      logger.info("User login", { userId, role, ip, action: "login" }),

    logout: (userId: string) =>
      logger.info("User logout", { userId, action: "logout" }),

    failed: (email: string, reason: string, ip?: string) =>
      logger.warn("Login failed", {
        email,
        reason,
        ip,
        action: "login_failed",
      }),

    register: (userId: string, role: string) =>
      logger.info("User registered", { userId, role, action: "register" }),
  },

  // Logs de livraisons
  delivery: {
    created: (deliveryId: string, clientId: string, announceId: string) =>
      logger.info("Delivery created", {
        deliveryId,
        clientId,
        announceId,
        action: "delivery_created",
      }),

    accepted: (deliveryId: string, delivererId: string) =>
      logger.info("Delivery accepted", {
        deliveryId,
        delivererId,
        action: "delivery_accepted",
      }),

    completed: (deliveryId: string, validationCode: string) =>
      logger.info("Delivery completed", {
        deliveryId,
        validationCode,
        action: "delivery_completed",
      }),

    cancelled: (deliveryId: string, reason: string) =>
      logger.warn("Delivery cancelled", {
        deliveryId,
        reason,
        action: "delivery_cancelled",
      }),
  },

  // Logs de paiements
  payment: {
    intent: (
      paymentId: string,
      amount: number,
      currency: string,
      userId: string,
    ) =>
      logger.info("Payment intent created", {
        paymentId,
        amount,
        currency,
        userId,
        action: "payment_intent",
      }),

    success: (paymentId: string, amount: number, userId: string) =>
      logger.info("Payment successful", {
        paymentId,
        amount,
        userId,
        action: "payment_success",
      }),

    failed: (paymentId: string, error: string, userId: string) =>
      logger.error("Payment failed", {
        paymentId,
        error,
        userId,
        action: "payment_failed",
      }),

    refund: (paymentId: string, amount: number, reason: string) =>
      logger.info("Payment refunded", {
        paymentId,
        amount,
        reason,
        action: "payment_refund",
      }),
  },

  // Logs administratifs
  admin: {
    documentValidation: (
      userId: string,
      documentType: string,
      status: string,
      adminId: string,
    ) =>
      logger.info("Document validation", {
        userId,
        documentType,
        status,
        adminId,
        action: "document_validation",
      }),

    userActivation: (userId: string, status: string, adminId: string) =>
      logger.info("User activation status changed", {
        userId,
        status,
        adminId,
        action: "user_activation",
      }),

    contractSigned: (contractId: string, merchantId: string, terms: string) =>
      logger.info("Contract signed", {
        contractId,
        merchantId,
        terms,
        action: "contract_signed",
      }),
  },

  // Logs marchands
  merchant: {
    info: (message: string, meta?: any) =>
      logger.info(message, { ...meta, action: "merchant_info" }),
    error: (message: string, meta?: any) =>
      logger.error(message, { ...meta, action: "merchant_error" }),
    cartDropConfigured: (merchantId: string, config: any) =>
      logger.info("Cart drop configured", {
        merchantId,
        config,
        action: "cart_drop_configured",
      }),
  },

  // Logs facturation
  billing: {
    info: (message: string, meta?: any) =>
      logger.info(message, { ...meta, action: "billing_info" }),
    error: (message: string, meta?: any) =>
      logger.error(message, { ...meta, action: "billing_error" }),
    monthlyGenerated: (providerId: string, amount: number) =>
      logger.info("Monthly billing generated", {
        providerId,
        amount,
        action: "monthly_billing_generated",
      }),
  },

  // Logs système
  system: {
    matchingRun: (announceId: string, matchesFound: number, topScore: number) =>
      logger.info("Matching algorithm executed", {
        announceId,
        matchesFound,
        topScore,
        action: "matching_run",
      }),

    monthlyBilling: (providerId: string, invoiceId: string, amount: number) =>
      logger.info("Monthly billing generated", {
        providerId,
        invoiceId,
        amount,
        action: "monthly_billing",
      }),

    notificationSent: (userId: string, type: string, channel: string) =>
      logger.info("Notification sent", {
        userId,
        type,
        channel,
        action: "notification_sent",
      }),

    error: (error: Error, context?: Record<string, any>) =>
      logger.error("System error", {
        message: error.message,
        stack: error.stack,
        ...context,
        action: "system_error",
      }),
  },
};

// Middleware pour Express/Next.js
export const loggerMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  // Log de la requête entrante
  logger.http(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection.remoteAddress,
    action: "http_request",
  });

  // Intercepter la réponse
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - start;

    logger.http(`${req.method} ${req.url} - ${res.statusCode}`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      action: "http_response",
    });

    return originalSend.call(this, data);
  };

  next();
};

// Fonction pour créer des logs structurés avec contexte utilisateur
export const createContextLogger = (
  userId?: string,
  role?: string,
  sessionId?: string,
) => {
  const context = { userId, role, sessionId };

  return {
    info: (message: string, meta?: any) =>
      logger.info(message, { ...context, ...meta }),
    warn: (message: string, meta?: any) =>
      logger.warn(message, { ...context, ...meta }),
    error: (message: string, meta?: any) =>
      logger.error(message, { ...context, ...meta }),
    debug: (message: string, meta?: any) =>
      logger.debug(message, { ...context, ...meta }),
  };
};

// Initialisation automatique désactivée pour éviter les erreurs
// if (process.env.NODE_ENV === 'production') {
//   initializeTracing()
// }

export default logger;
