/**
 * Service de logging simple
 * Centralise la gestion des logs de l'application
 */

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Configuration du logger
 */
const config = {
  // Niveau de log minimum à afficher
  minLevel: (process.env.LOGLEVEL ?? "info") as LogLevel,

  // Activation/désactivation des logs selon l'environnement
  enabled:
    process.env.NODE_ENV !== "test" || process.env.ENABLE_TEST_LOGS === "true",

  // Format de date pour les logs
  dateFormat: "HH:mm:ss",

  // Couleurs pour les différents niveaux (compatible avec la console du navigateur)
  colors: {
    debug: "#9BA0AA",
    info: "#1A7CD3",
    warn: "#F9B938",
    error: "#D33E3E"}};

/**
 * Niveaux de log et leur priorité
 */
const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3};

/**
 * Formate un message de log
 */
function formatMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = new Date().toLocaleTimeString([], { hour12: false });
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Vérifier si un niveau de log doit être affiché
 */
function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) {
    return false;
  }
  return levels[level] >= levels[config.minLevel];
}

/**
 * Fonctions de log par niveau
 */
export const logger = {
  debug(message: string, data?: any) {
    if (shouldLog("debug")) {
      console.debug(
        "%c" + formatMessage("debug", message, data),
        `color: ${config.colors.debug}`,
        data !== undefined ? data : "",
      );
    }
  },

  info(message: string, data?: any) {
    if (shouldLog("info")) {
      console.info(
        "%c" + formatMessage("info", message, data),
        `color: ${config.colors.info}`,
        data !== undefined ? data : "",
      );
    }
  },

  warn(message: string, data?: any) {
    if (shouldLog("warn")) {
      console.warn(
        "%c" + formatMessage("warn", message, data),
        `color: ${config.colors.warn}`,
        data !== undefined ? data : "",
      );
    }
  },

  error(message: string, error?: any) {
    if (shouldLog("error")) {
      console.error(
        "%c" + formatMessage("error", message, error),
        `color: ${config.colors.error}`,
        error !== undefined ? error : "",
      );
    }
  },

  /**
   * Logger spécifique à un contexte (préfixe les messages)
   */
  createLogger(context: string) {
    return {
      debug: (message: string, data?: any) =>
        logger.debug(`[${context}] ${message}`, data),
      info: (message: string, data?: any) =>
        logger.info(`[${context}] ${message}`, data),
      warn: (message: string, data?: any) =>
        logger.warn(`[${context}] ${message}`, data),
      error: (message: string, error?: any) =>
        logger.error(`[${context}] ${message}`, error)};
  }};
