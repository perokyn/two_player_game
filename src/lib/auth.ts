// src/lib/auth.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma"; // keep relative import if file lives next to prisma.ts

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

export const ADMIN_COOKIE_NAME = "cg_admin_session";
export const USER_COOKIE_NAME = "cg_user_session";

/**
 * Hash a plaintext password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign a JWT and return the token string.
 * expiresIn matches jsonwebtoken SignOptions["expiresIn"] (e.g. "2h" or number seconds).
 */
type JwtPayloadLike = jwt.JwtPayload | string | Buffer;

export function signJwt(
  payload: object | string | Buffer,
  expiresIn: jwt.SignOptions["expiresIn"] = "2h",
): string {
  const secret: jwt.Secret = JWT_SECRET as jwt.Secret;
  if (!secret) throw new Error("Missing JWT_SECRET");

  const opts: jwt.SignOptions = { expiresIn };
  return jwt.sign(payload as JwtPayloadLike, secret, opts);
}

/**
 * Verify a JWT and return the decoded payload as a safe Record<string, unknown>, or null.
 */
export function verifyJwt(token: string): Record<string, unknown> | null {
  const secret: jwt.Secret = JWT_SECRET as jwt.Secret;
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "object" && decoded !== null) {
      return decoded as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set an HttpOnly cookie on a NextResponse.
 * Note: NextResponse can append multiple Set-Cookie headers.
 */
export function setCookie(
  res: NextResponse,
  name: string,
  value: string,
  maxAgeSeconds: number,
) {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${name}=${value}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Strict${secureFlag}`;
  res.headers.append("Set-Cookie", cookie);
}

/**
 * Delete a cookie by setting Max-Age=0.
 */
export function deleteCookie(res: NextResponse, name: string) {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secureFlag}`;
  res.headers.append("Set-Cookie", cookie);
}

/**
 * Return admin user if admin cookie valid, otherwise null.
 * Use this inside App Router request handlers (NextRequest).
 */
export async function requireAdmin(req: NextRequest) {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;

  const payload = verifyJwt(cookie);
  if (!payload) return null;

  const userIdValue = payload["userId"];

  if (typeof userIdValue !== "number" && typeof userIdValue !== "string") {
    return null;
  }

  const userId = Number(userIdValue);
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return null;
  return user;
}
