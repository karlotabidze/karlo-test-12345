import type { Request, Response, NextFunction } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "../lib/firebase-admin.ts";
import { upsertUser } from "../db/repository.ts";

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

const DEFAULT_OWNER_EMAIL = "karlotabidze@gmail.com";

export function isAllowlistedAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const configured = String(process.env["ADMIN_EMAILS"] || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const allowlist = new Set<string>([DEFAULT_OWNER_EMAIL, ...configured]);
  return allowlist.has(normalized);
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing authentication token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized: Empty authentication token" });
    return;
  }

  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }

  const email = (decodedToken.email || "").trim().toLowerCase();
  if (!email || decodedToken.email_verified === false) {
    res.status(403).json({
      error: "Forbidden: A verified Google email address is required for administrator access.",
    });
    return;
  }

  try {
    const allowlisted = isAllowlistedAdminEmail(email);
    const dbUser = await upsertUser(
      decodedToken.uid,
      email,
      decodedToken["name"] ? String(decodedToken["name"]) : "",
      allowlisted,
    );

    if (!allowlisted && dbUser?.role !== "admin") {
      res.status(403).json({
        error: `Forbidden: ${email} is not authorized to access the SaqoTravel administration panel.`,
      });
      return;
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error authorizing administrator account:", error);
    res.status(500).json({ error: "Failed to verify administrator authorization" });
  }
};
