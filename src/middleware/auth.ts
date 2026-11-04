import type { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface AuthRequest extends Request {
  user?: { uid: string; email: string };
}

export const COOKIE_NAME = "saqo_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function sign(value: string): string {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAdminSession(email: string): string {
  const payload = Buffer.from(JSON.stringify({
    uid: email.toLowerCase(),
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readAdminSession(token: string): { uid: string; email: string } | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  let expected: string;
  try { expected = sign(payload); } catch { return null; }
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: string; email?: string; exp?: number;
    };
    if (!data.uid || !data.email || !data.exp || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { uid: data.uid, email: data.email };
  } catch { return null; }
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = (req.headers.cookie || "").split(";").map((v) => v.trim())
    .find((v) => v.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  let session: { uid: string; email: string } | null = null;
  try { session = token ? readAdminSession(decodeURIComponent(token)) : null; } catch { session = null; }
  if (!session) {
    res.status(401).json({ error: "Unauthorized: Please sign in to the admin panel." });
    return;
  }
  req.user = session;
  next();
};
