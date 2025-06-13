import { SeedResult } from "./seed-helpers";

type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "PROGRESS";

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

export class SeedLogger {
  private logs: LogEntry[] = [];
  private startTime: Date;
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.startTime = new Date();
    this.verbose = verbose;
  }

  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    if (this.verbose || level === "ERROR") {
      this.printLog(entry);
    }
  }

  private printLog(entry: LogEntry): void {
    const emoji = this.getEmoji(entry.level);
    const timestamp = entry.timestamp.toLocaleTimeString();
    const categoryFormatted = `[${entry.category}]`;

    console.log(`${emoji} ${timestamp} ${categoryFormatted} ${entry.message}`);

    if (entry.data && this.verbose) {
      console.log("  Data:", entry.data);
    }
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case "SUCCESS":
        return "✅";
      case "ERROR":
        return "❌";
      case "WARNING":
        return "⚠️";
      case "PROGRESS":
        return "📊";
      case "INFO":
      default:
        return "ℹ️";
    }
  }

  info(category: string, message: string, data?: any): void {
    this.log("INFO", category, message, data);
  }

  success(category: string, message: string, data?: any): void {
    this.log("SUCCESS", category, message, data);
  }

  warning(category: string, message: string, data?: any): void {
    this.log("WARNING", category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.log("ERROR", category, message, data);
  }

  progress(
    category: string,
    current: number,
    total: number,
    message?: string,
  ): void {
    const percentage = Math.round((current / total) * 100);
    const progressMessage = message || `${current}/${total} (${percentage}%)`;
    this.log("PROGRESS", category, progressMessage);
  }

  startSeed(seedName: string): void {
    this.info("SEED", `🚀 Démarrage du seed: ${seedName}`);
  }

  endSeed(seedName: string, result: SeedResult, duration?: number): void {
    const durationText = duration ? ` en ${duration}ms` : "";
    const summary = `✨ ${seedName} terminé${durationText} - Créés: ${result.created}, Erreurs: ${result.errors}`;

    if (result.errors > 0) {
      this.warning("SEED", summary, result);
    } else {
      this.success("SEED", summary, result);
    }
  }

  startBatch(batchName: string, totalItems: number): void {
    this.info(
      "BATCH",
      `📦 Démarrage du batch: ${batchName} (${totalItems} éléments)`,
    );
  }

  endBatch(batchName: string, results: SeedResult[]): void {
    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    this.success(
      "BATCH",
      `📦 Batch ${batchName} terminé - Total créés: ${totalCreated}, Total erreurs: ${totalErrors}`,
    );
  }

  database(action: string, table: string, count?: number): void {
    const countText = count !== undefined ? ` (${count} enregistrements)` : "";
    this.info("DATABASE", `🗄️  ${action} ${table}${countText}`);
  }

  validation(
    entity: string,
    status: "PASSED" | "FAILED",
    details?: string,
  ): void {
    const level = status === "PASSED" ? "SUCCESS" : "ERROR";
    const emoji = status === "PASSED" ? "✓" : "✗";
    const message = `${emoji} Validation ${entity}: ${status}`;

    this.log(level, "VALIDATION", message, details);
  }

  getReport(): {
    duration: number;
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    errors: LogEntry[];
    warnings: LogEntry[];
  } {
    const now = new Date();
    const duration = now.getTime() - this.startTime.getTime();

    const logsByLevel = this.logs.reduce(
      (acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      },
      {} as Record<LogLevel, number>,
    );

    const errors = this.logs.filter((log) => log.level === "ERROR");
    const warnings = this.logs.filter((log) => log.level === "WARNING");

    return {
      duration,
      totalLogs: this.logs.length,
      logsByLevel,
      errors,
      warnings,
    };
  }

  printSummary(): void {
    const report = this.getReport();
    const durationSeconds = Math.round(report.duration / 1000);

    console.log("\n" + "=".repeat(60));
    console.log("📋 RAPPORT DE SEED");
    console.log("=".repeat(60));
    console.log(`⏱️  Durée: ${durationSeconds}s`);
    console.log(`📝 Total logs: ${report.totalLogs}`);
    console.log(`✅ Succès: ${report.logsByLevel.SUCCESS || 0}`);
    console.log(`⚠️  Avertissements: ${report.logsByLevel.WARNING || 0}`);
    console.log(`❌ Erreurs: ${report.logsByLevel.ERROR || 0}`);

    if (report.errors.length > 0) {
      console.log("\n❌ ERREURS DÉTAILLÉES:");
      report.errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.category}] ${error.message}`);
        if (error.data) {
          console.log(`   Détails: ${JSON.stringify(error.data, null, 2)}`);
        }
      });
    }

    if (report.warnings.length > 0) {
      console.log("\n⚠️  AVERTISSEMENTS:");
      report.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.category}] ${warning.message}`);
      });
    }

    console.log("=".repeat(60));
  }

  exportLogs(filePath?: string): string {
    const report = this.getReport();
    const logData = {
      summary: {
        startTime: this.startTime,
        endTime: new Date(),
        duration: report.duration,
        totalLogs: report.totalLogs,
        logsByLevel: report.logsByLevel,
      },
      logs: this.logs,
    };

    const jsonData = JSON.stringify(logData, null, 2);

    if (filePath) {
      const fs = require("fs");
      fs.writeFileSync(filePath, jsonData);
      this.info("EXPORT", `📄 Logs exportés vers: ${filePath}`);
    }

    return jsonData;
  }
}
