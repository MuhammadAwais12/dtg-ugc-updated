import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const COOKIE_NAME = "admin_session";
const TOKEN_TTL = "12h";

export interface AdminRequest extends Request {
  adminEmail?: string;
}

export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH || !JWT_SECRET) {
    console.error("[AdminAuth] ADMIN_EMAIL / ADMIN_PASSWORD_HASH / JWT_SECRET not configured");
    return false;
  }
  if (email.trim().toLowerCase() !== ADMIN_EMAIL.trim().toLowerCase()) return false;
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

export function issueAdminSession(res: Response, email: string) {
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAdminSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { email: string };
    req.adminEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, please log in again" });
  }
}
