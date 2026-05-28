import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./auth/routes";
import { loadConfig } from "./config";
import { closePool } from "./db/client";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(authRoutes, { prefix: "/api/v1" });

  app.get("/health", async () => ({ status: "ok" }));

  const shutdown = async (): Promise<void> => {
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`sync-server listening on port ${config.port}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
