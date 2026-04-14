import prismaClientPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pgPkg from "pg";
import { env } from "../config/env.js";

const { Pool } = pgPkg;

const { PrismaClient } = prismaClientPkg as { PrismaClient: new (options?: any) => any };

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  __subnetopsPgPool?: InstanceType<typeof Pool>;
  __subnetopsPrisma?: PrismaClientInstance;
};

const pool = globalForPrisma.__subnetopsPgPool ?? new Pool({
  connectionString: env.databaseUrl,
  max: env.nodeEnv === "production" ? 20 : 5,
});

const adapter = new PrismaPg(pool);
const prisma = globalForPrisma.__subnetopsPrisma ?? new PrismaClient({ adapter });

if (env.nodeEnv !== "production") {
  globalForPrisma.__subnetopsPgPool = pool;
  globalForPrisma.__subnetopsPrisma = prisma;
}

export { prisma };

export async function checkDatabaseHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}

export async function closeDatabaseConnections() {
  await prisma.$disconnect();
  await pool.end();
}
