export interface Config {
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  port: number;
  attachmentDir: string;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!jwtSecret) throw new Error("JWT_SECRET is required");
  if (!jwtRefreshSecret) throw new Error("JWT_REFRESH_SECRET is required");

  return {
    databaseUrl,
    jwtSecret,
    jwtRefreshSecret,
    port: parseInt(process.env.PORT ?? "3001", 10),
    attachmentDir: process.env.ATTACHMENT_DIR ?? "./data/attachments",
  };
}
