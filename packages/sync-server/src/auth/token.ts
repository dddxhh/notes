import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  userId: string;
  username: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  expiresIn: string = "1h",
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function signRefreshToken(
  payload: RefreshTokenPayload,
  secret: string,
  expiresIn: string = "30d",
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & AccessTokenPayload;
  return { userId: decoded.userId, username: decoded.username };
}

export function verifyRefreshToken(token: string, secret: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & RefreshTokenPayload;
  return { userId: decoded.userId };
}
