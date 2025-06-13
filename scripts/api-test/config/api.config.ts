import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });
config({ path: path.resolve(process.cwd(), '.env') }); // Fallback to .env

export type Environment = 'development' | 'staging' | 'production';

export interface ApiConfig {
  baseUrl: string;
  apiPath: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers: Record<string, string>;
}

const environments: Record<Environment, ApiConfig> = {
  development: {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    apiPath: '/api/trpc',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'EcoDeli-API-Tester/1.0'
    }
  },
  staging: {
    baseUrl: process.env.STAGING_URL || 'https://staging.ecodeli.me',
    apiPath: '/api/trpc',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 2000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'EcoDeli-API-Tester/1.0'
    }
  },
  production: {
    baseUrl: process.env.PRODUCTION_URL || 'https://ecodeli.me',
    apiPath: '/api/trpc',
    timeout: 30000,
    retryAttempts: 2,
    retryDelay: 3000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'EcoDeli-API-Tester/1.0'
    }
  }
};

const currentEnv = (process.env.TEST_ENV || 'development') as Environment;

export const apiConfig = environments[currentEnv];

// Helper to get full API URL
export function getApiUrl(procedure: string): string {
  return `${apiConfig.baseUrl}${apiConfig.apiPath}/${procedure}`;
}

// Helper to get auth endpoint
export function getAuthUrl(path: string): string {
  return `${apiConfig.baseUrl}/api/auth/${path}`;
}

// Export current environment
export const currentEnvironment = currentEnv;