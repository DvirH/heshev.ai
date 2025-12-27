import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  wsPath: string;
  corsOrigin: string;
  googleApiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  sessionTimeoutMs: number;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable: ${name}`);
  }
  return parsed;
}

function getEnvFloat(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid float for environment variable: ${name}`);
  }
  return parsed;
}

export const config: Config = {
  port: getEnvNumber('PORT', 3001),
  wsPath: getEnvVar('WS_PATH', '/ws'),
  corsOrigin: getEnvVar('CORS_ORIGIN', '*'),
  googleApiKey: getEnvVar('GOOGLE_API_KEY', ''),
  defaultModel: getEnvVar('DEFAULT_MODEL', 'gemini-2.5-pro'),
  maxTokens: getEnvNumber('MAX_TOKENS', 4096),
  temperature: getEnvFloat('TEMPERATURE', 0.7),
  sessionTimeoutMs: getEnvNumber('SESSION_TIMEOUT_MS', 3600000),
};
