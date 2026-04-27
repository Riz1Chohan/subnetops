import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const weakJwtSecrets = new Set([
  "change-this-in-development",
  "change-this-in-production",
  "changeme",
  "change-me",
  "default",
  "dev-secret",
  "jwt-secret",
  "secret",
  "password",
  "subnetops-secret",
]);

function required(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getJwtSecret() {
  const value = process.env.JWT_SECRET?.trim();

  if (nodeEnv === "production") {
    if (!value) throw new Error("Missing required environment variable: JWT_SECRET");
    if (weakJwtSecrets.has(value) || value.length < 32) {
      throw new Error("JWT_SECRET must be a non-default value with at least 32 characters in production.");
    }
    return value;
  }

  return value || "change-this-in-development";
}

function toBool(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toList(value: string | undefined, fallback: string[]) {
  const source = value && value.trim().length ? value : fallback.join(",");
  return source
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export const env = {
  port: toNumber(process.env.PORT, 4000),
  databaseUrl: required("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/subnetops?schema=public"),
  corsOrigins: toList(process.env.CORS_ORIGIN, [
    "http://localhost:4173",
    "http://localhost:5173",
    "http://localhost:3000",
    "https://subnetops-frontend.onrender.com",
  ]),
  jwtSecret: getJwtSecret(),
  nodeEnv,
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "no-reply@subnetops.local",
  sendRealEmails: toBool(process.env.SEND_REAL_EMAILS, false),
  frontendAppUrl: (process.env.FRONTEND_APP_URL || "http://localhost:5173").replace(/\/$/, ""),
  automationSweepEnabled: toBool(process.env.AUTOMATION_SWEEP_ENABLED, false),
  automationSweepIntervalMs: toNumber(process.env.AUTOMATION_SWEEP_INTERVAL_MS, 300000),
  dbPushOnBoot: toBool(process.env.DB_PUSH_ON_BOOT, false),
  seedDemoOnBoot: toBool(process.env.SEED_DEMO_ON_BOOT, false),
  aiProvider: process.env.AI_PROVIDER || "local",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
};
