import { type FastifyRequest, type FastifyReply } from "fastify";
import { verifyAccessToken } from "./token";
import { loadConfig } from "../config";

declare module "fastify" {
  interface FastifyRequest {
    user: { userId: string; username: string };
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const config = loadConfig();

  try {
    const payload = verifyAccessToken(token, config.jwtSecret);
    request.user = payload;
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
  }
}
