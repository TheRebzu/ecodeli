import { StatsD } from "node-statsd";

export interface DatadogConfig {
  apiKey: string;
  appKey?: string;
  site?: string;
  service: string;
  environment: string;
  version?: string;
}

export interface DatadogMetric {
  name: string;
  value: number;
  tags?: string[];
  timestamp?: Date;
}

export interface DatadogLog {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  service?: string;
  timestamp?: Date;
  tags?: Record<string, any>;
  error?: Error;
}

class DatadogService {
  private statsClient: StatsD | null = null;
  private isConfigured = false;
  private config: Partial<DatadogConfig> = {};

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const apiKey = process.env.DATADOG_API_KEY;
      const appKey = process.env.DATADOG_APP_KEY;
      const site = process.env.DATADOG_SITE || "datadoghq.eu";
      const environment = process.env.NODE_ENV || "development";
      const service = process.env.DATADOG_SERVICE || "ecodeli";
      const version = process.env.DATADOG_VERSION || process.env.npm_package_version || "1.0.0";

      this.config = {
        apiKey,
        appKey,
        site,
        service,
        environment,
        version,
      };

      if (!apiKey) {
        console.warn("[Datadog] API Key manquante - métriques désactivées");
        console.warn("Définir DATADOG_API_KEY pour activer le monitoring");
        return;
      }

      // Initialiser StatsD pour les métriques
      const statsdHost = process.env.DATADOG_STATSD_HOST || "localhost";
      const statsdPort = parseInt(process.env.DATADOG_STATSD_PORT || "8125");

      this.statsClient = new StatsD({
        host: statsdHost,
        port: statsdPort,
        prefix: `${service}.`,
        global_tags: [
          `env:${environment}`,
          `service:${service}`,
          `version:${version}`,
        ],
      });

      this.isConfigured = true;
      console.log("[Datadog] Service initialisé avec succès");
      this.logInfo("datadog_service_initialized", "Service Datadog démarré", {
        environment,
        service,
        version,
      });

    } catch (error) {
      console.error("[Datadog] Erreur d'initialisation:", error);
      this.isConfigured = false;
    }
  }

  // === MÉTRIQUES ===
  
  increment(metric: string, value: number = 1, tags: string[] = []) {
    if (!this.statsClient) {
      console.debug(`[Datadog] Metric increment: ${metric} = ${value} (non envoyé)`);
      return;
    }
    
    try {
      this.statsClient.increment(metric, value, tags);
    } catch (error) {
      console.error("[Datadog] Erreur increment:", error);
    }
  }

  decrement(metric: string, value: number = 1, tags: string[] = []) {
    if (!this.statsClient) {
      console.debug(`[Datadog] Metric decrement: ${metric} = ${value} (non envoyé)`);
      return;
    }
    
    try {
      this.statsClient.decrement(metric, value, tags);
    } catch (error) {
      console.error("[Datadog] Erreur decrement:", error);
    }
  }

  gauge(metric: string, value: number, tags: string[] = []) {
    if (!this.statsClient) {
      console.debug(`[Datadog] Metric gauge: ${metric} = ${value} (non envoyé)`);
      return;
    }
    
    try {
      this.statsClient.gauge(metric, value, tags);
    } catch (error) {
      console.error("[Datadog] Erreur gauge:", error);
    }
  }

  histogram(metric: string, value: number, tags: string[] = []) {
    if (!this.statsClient) {
      console.debug(`[Datadog] Metric histogram: ${metric} = ${value} (non envoyé)`);
      return;
    }
    
    try {
      this.statsClient.histogram(metric, value, tags);
    } catch (error) {
      console.error("[Datadog] Erreur histogram:", error);
    }
  }

  timing(metric: string, duration: number, tags: string[] = []) {
    if (!this.statsClient) {
      console.debug(`[Datadog] Metric timing: ${metric} = ${duration}ms (non envoyé)`);
      return;
    }
    
    try {
      this.statsClient.timing(metric, duration, tags);
    } catch (error) {
      console.error("[Datadog] Erreur timing:", error);
    }
  }

  // === LOGS ===
  
  private async sendLog(log: DatadogLog) {
    if (!this.isConfigured || !this.config.apiKey) {
      // Mode fallback : log en console
      const logMessage = `[${log.level.toUpperCase()}] ${log.message}`;
      console.log(logMessage, log.tags || {});
      return;
    }

    try {
      const logData = {
        ddsource: "nodejs",
        ddtags: Object.entries(log.tags || {})
          .map(([key, value]) => `${key}:${value}`)
          .join(","),
        hostname: process.env.HOSTNAME || "localhost",
        message: log.message,
        level: log.level,
        service: log.service || this.config.service,
        timestamp: log.timestamp || new Date(),
        ...log.tags,
      };

      // Envoyer via HTTP API Datadog
      const response = await fetch(`https://http-intake.logs.${this.config.site}/v1/input/${this.config.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logData),
      });

      if (!response.ok) {
        throw new Error(`Datadog HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("[Datadog] Erreur envoi log:", error);
      // Fallback en console
      console.log(`[${log.level.toUpperCase()}] ${log.message}`, log.tags || {});
    }
  }

  logDebug(event: string, message: string, tags?: Record<string, any>) {
    this.sendLog({
      level: "debug",
      message: `[${event}] ${message}`,
      tags: { event, ...tags },
    });
  }

  logInfo(event: string, message: string, tags?: Record<string, any>) {
    this.sendLog({
      level: "info", 
      message: `[${event}] ${message}`,
      tags: { event, ...tags },
    });
  }

  logWarn(event: string, message: string, tags?: Record<string, any>) {
    this.sendLog({
      level: "warn",
      message: `[${event}] ${message}`,
      tags: { event, ...tags },
    });
  }

  logError(event: string, message: string, error?: Error, tags?: Record<string, any>) {
    this.sendLog({
      level: "error",
      message: `[${event}] ${message}`,
      error,
      tags: { 
        event, 
        error_message: error?.message,
        error_stack: error?.stack,
        ...tags 
      },
    });
  }

  // === MÉTRIQUES MÉTIER ECODELI ===

  // Deliveries
  trackDeliveryCreated(deliveryType: string, userId: string) {
    this.increment("delivery.created", 1, [`type:${deliveryType}`, `user:${userId}`]);
  }

  trackDeliveryCompleted(deliveryType: string, duration: number) {
    this.increment("delivery.completed", 1, [`type:${deliveryType}`]);
    this.timing("delivery.duration", duration, [`type:${deliveryType}`]);
  }

  // Users
  trackUserRegistration(userRole: string) {
    this.increment("user.registration", 1, [`role:${userRole}`]);
  }

  trackUserLogin(userRole: string) {
    this.increment("user.login", 1, [`role:${userRole}`]);
  }

  // Payments
  trackPaymentAttempt(amount: number, currency: string = "EUR") {
    this.increment("payment.attempt", 1, [`currency:${currency}`]);
    this.histogram("payment.amount", amount, [`currency:${currency}`]);
  }

  trackPaymentSuccess(amount: number, currency: string = "EUR") {
    this.increment("payment.success", 1, [`currency:${currency}`]);
    this.histogram("payment.success_amount", amount, [`currency:${currency}`]);
  }

  trackPaymentFailure(errorCode: string, currency: string = "EUR") {
    this.increment("payment.failure", 1, [`error:${errorCode}`, `currency:${currency}`]);
  }

  // API Performance
  trackApiRequest(endpoint: string, method: string, statusCode: number, duration: number) {
    this.increment("api.request", 1, [
      `endpoint:${endpoint}`,
      `method:${method}`,
      `status:${statusCode}`
    ]);
    this.timing("api.response_time", duration, [
      `endpoint:${endpoint}`,
      `method:${method}`
    ]);
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  getConfig(): Partial<DatadogConfig> {
    return { ...this.config };
  }
}

// Instance singleton
export const datadogService = new DatadogService();

// Helper functions pour faciliter l'utilisation
export const trackMetric = (name: string, value: number, tags?: string[]) => 
  datadogService.gauge(name, value, tags);

export const incrementCounter = (name: string, tags?: string[]) => 
  datadogService.increment(name, 1, tags);

export const logInfo = (event: string, message: string, tags?: Record<string, any>) => 
  datadogService.logInfo(event, message, tags);

export const logError = (event: string, message: string, error?: Error, tags?: Record<string, any>) => 
  datadogService.logError(event, message, error, tags);

export const trackApiCall = (endpoint: string, method: string, statusCode: number, duration: number) => 
  datadogService.trackApiRequest(endpoint, method, statusCode, duration);

export default datadogService;