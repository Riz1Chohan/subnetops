import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env.js";
import { checkDatabaseHealth } from "./db/prisma.js";
import {
  aiRoutes,
  authRoutes,
  commentRoutes,
  designCoreRoutes,
  exportRoutes,
  enterpriseIpamRoutes,
  notificationPreferenceRoutes,
  notificationRoutes,
  organizationRoutes,
  projectRoutes,
  projectWatchRoutes,
  siteRoutes,
  validationRoutes,
  vlanRoutes,
} from "./routes/index.js";
import { csrfProtection, errorHandler, notFound } from "./middleware/index.js";

const app = express();
app.set("trust proxy", 1);
const allowedOrigins = new Set(env.corsOrigins.map((origin) => origin.replace(/\/$/, "")));

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(csrfProtection);

app.get("/api/health", async (_req, res) => {
  try {
    await checkDatabaseHealth();
    res.json({ ok: true, service: "subnetops-backend", db: "ok" });
  } catch {
    res.status(503).json({ ok: false, service: "subnetops-backend", db: "unavailable" });
  }
});

app.get("/api/health/live", (_req, res) => {
  res.json({ ok: true, service: "subnetops-backend" });
});

app.get("/api/health/ready", async (_req, res) => {
  try {
    await checkDatabaseHealth();
    res.json({ ok: true, ready: true });
  } catch {
    res.status(503).json({ ok: false, ready: false });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/vlans", vlanRoutes);
app.use("/api/validation", validationRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/enterprise-ipam", enterpriseIpamRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/design-core", designCoreRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notification-preferences", notificationPreferenceRoutes);
app.use("/api/project-watchers", projectWatchRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
