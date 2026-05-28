import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import { authRoutes } from "./auth/routes";
import { metadataRoutes } from "./routes/metadata";
import { attachmentRoutes } from "./routes/attachments";
import { shareRoutes } from "./routes/shares";
import { loadConfig } from "./config";
import { closePool } from "./db/client";
import { handleConnection } from "./ws/sync-handler";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(websocket);
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(metadataRoutes, { prefix: "/api/v1" });
  await app.register(attachmentRoutes, { prefix: "/api/v1" });
  await app.register(shareRoutes, { prefix: "/api/v1" });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ws", { websocket: true }, (socket, request) => {
    handleConnection(socket, { url: request.url });
  });

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
