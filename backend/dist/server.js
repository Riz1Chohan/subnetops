import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { startAutomationSweep } from "./services/automation.service.js";
async function start() {
    await prisma.$connect();
    const server = app.listen(env.port, () => {
        console.log(`SubnetOps backend running on http://localhost:${env.port}`);
    });
    const automationHandle = startAutomationSweep();
    const shutdown = async () => {
        if (automationHandle)
            clearInterval(automationHandle);
        server.close(async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
start().catch(async (error) => {
    console.error("Failed to start backend", error);
    await prisma.$disconnect();
    process.exit(1);
});
