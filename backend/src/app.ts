import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env.js";
import { checkDatabaseHealth } from "./db/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import siteRoutes from "./routes/site.routes.js";
import vlanRoutes from "./routes/vlan.routes.js";
import validationRoutes from "./routes/validation.routes.js";
import exportRoutes from "./routes/export.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import notificationPreferenceRoutes from "./routes/notificationPreference.routes.js";
import projectWatchRoutes from "./routes/projectWatch.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

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
app.use("/api/organizations", organizationRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notification-preferences", notificationPreferenceRoutes);
app.use("/api/project-watchers", projectWatchRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
