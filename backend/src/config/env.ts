import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
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
  jwtSecret: required("JWT_SECRET", "change-this-in-development"),
  nodeEnv: process.env.NODE_ENV || "development",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "no-reply@subnetops.local",
  sendRealEmails: toBool(process.env.SEND_REAL_EMAILS, false),
  automationSweepEnabled: toBool(process.env.AUTOMATION_SWEEP_ENABLED, false),
  automationSweepIntervalMs: toNumber(process.env.AUTOMATION_SWEEP_INTERVAL_MS, 300000),
  dbPushOnBoot: toBool(process.env.DB_PUSH_ON_BOOT, false),
  seedDemoOnBoot: toBool(process.env.SEED_DEMO_ON_BOOT, false),
  aiProvider: process.env.AI_PROVIDER || "local",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
};
