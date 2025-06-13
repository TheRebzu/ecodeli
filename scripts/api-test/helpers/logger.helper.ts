import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'success' | 'warning' | 'error';

export interface LoggerConfig {
  showTimestamp: boolean;
  showLevel: boolean;
  colorize: boolean;
  verbose: boolean;
}

const defaultConfig: LoggerConfig = {
  showTimestamp: true,
  showLevel: true,
  colorize: true,
  verbose: process.env.VERBOSE === 'true'
};

export class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(context?: string, config?: Partial<LoggerConfig>) {
    this.context = context;
    this.config = { ...defaultConfig, ...config };
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];

    if (this.config.showTimestamp) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      parts.push(chalk.gray(`[${timestamp}]`));
    }

    if (this.config.showLevel) {
      const levelColors: Record<LogLevel, typeof chalk> = {
        debug: chalk.gray,
        info: chalk.blue,
        success: chalk.green,
        warning: chalk.yellow,
        error: chalk.red
      };
      const color = levelColors[level];
      parts.push(color(`[${level.toUpperCase()}]`));
    }

    if (this.context) {
      parts.push(chalk.cyan(`[${this.context}]`));
    }

    parts.push(message);
    return parts.join(' ');
  }

  debug(message: string, data?: any): void {
    if (!this.config.verbose) return;
    console.log(this.formatMessage('debug', message));
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('info', message));
    if (data && this.config.verbose) {
      console.log(chalk.blue(JSON.stringify(data, null, 2)));
    }
  }

  success(message: string, data?: any): void {
    console.log(this.formatMessage('success', message));
    if (data && this.config.verbose) {
      console.log(chalk.green(JSON.stringify(data, null, 2)));
    }
  }

  warning(message: string, data?: any): void {
    console.log(this.formatMessage('warning', message));
    if (data) {
      console.log(chalk.yellow(JSON.stringify(data, null, 2)));
    }
  }

  error(message: string, error?: any): void {
    console.error(this.formatMessage('error', message));
    if (error) {
      if (error instanceof Error) {
        console.error(chalk.red(error.stack || error.message));
      } else {
        console.error(chalk.red(JSON.stringify(error, null, 2)));
      }
    }
  }

  // Helper methods for API testing
  request(method: string, url: string, data?: any): void {
    const methodColor = method === 'GET' ? chalk.green : 
                       method === 'POST' ? chalk.yellow :
                       method === 'PUT' ? chalk.blue :
                       method === 'DELETE' ? chalk.red : chalk.white;

    console.log(chalk.gray('→') + ' ' + methodColor(method) + ' ' + chalk.white(url));
    
    if (data && this.config.verbose) {
      console.log(chalk.gray('  Request body:'));
      console.log(chalk.gray(JSON.stringify(data, null, 2).split('\n').map(line => '  ' + line).join('\n')));
    }
  }

  response(status: number, data?: any, duration?: number): void {
    const statusColor = status >= 200 && status < 300 ? chalk.green :
                       status >= 300 && status < 400 ? chalk.yellow :
                       status >= 400 && status < 500 ? chalk.orange :
                       chalk.red;

    let message = chalk.gray('←') + ' ' + statusColor(`${status}`);
    if (duration) {
      message += chalk.gray(` (${duration}ms)`);
    }
    console.log(message);

    if (data && this.config.verbose) {
      console.log(chalk.gray('  Response body:'));
      console.log(chalk.gray(JSON.stringify(data, null, 2).split('\n').map(line => '  ' + line).join('\n')));
    }
  }

  separator(): void {
    console.log(chalk.gray('─'.repeat(60)));
  }

  title(title: string): void {
    console.log('\n' + chalk.bold.underline(title) + '\n');
  }

  table(data: any[]): void {
    console.table(data);
  }

  // Create a child logger with additional context
  child(childContext: string): Logger {
    const newContext = this.context ? `${this.context}:${childContext}` : childContext;
    return new Logger(newContext, this.config);
  }
}

// Default logger instance
export const logger = new Logger('API-Test');

// Specialized loggers
export const authLogger = new Logger('Auth');
export const requestLogger = new Logger('Request');
export const testLogger = new Logger('Test');