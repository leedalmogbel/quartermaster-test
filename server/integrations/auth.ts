/**
 * User Authentication — HIPAA-grade
 *
 * bcrypt password hashing (12 rounds), HMAC-SHA256 JWT with timing-safe comparison,
 * rate limiting (5 login attempts / 15 min), refresh tokens, audit logging.
 *
 * ENV VARS NEEDED:
 *   JWT_SECRET=a-long-random-string-at-least-32-characters
 */

import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours
const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Proper HMAC-SHA256 JWT
function createToken(payload: any, secret: string, expiryMs: number = TOKEN_EXPIRY_MS): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + expiryMs,
    jti: randomBytes(16).toString("hex"), // unique token ID
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string, secret: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        practiceId: number | null;
        name: string;
      };
    }
  }
}

export function registerAuthRoutes(app: Express) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.warn("WARNING: JWT_SECRET must be set and at least 32 characters. Using insecure default for dev only.");
  }
  const secret = JWT_SECRET || "quartermaster-dev-secret-change-in-production-32chars!!";

  // Rate limiter — 5 login attempts per 15 minutes per IP
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many login attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter for registration — 3 per hour
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { error: "Too many registration attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.substring(7);
    const payload = verifyToken(token, secret);
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = payload;
    next();
  }

  // Admin-only middleware
  function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  }

  // Login with bcrypt
  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = storage.getUserByEmail(email);
    if (!user) {
      // Constant-time response to prevent user enumeration
      await bcrypt.hash("dummy", BCRYPT_ROUNDS);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Log failed attempt
      storage.createAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        resource: "auth",
        resourceId: null,
        details: JSON.stringify({ email, ip: req.ip }),
        ipAddress: req.ip || null,
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      practiceId: user.practiceId,
      name: user.name,
    };

    const accessToken = createToken(tokenPayload, secret, TOKEN_EXPIRY_MS);
    const refreshToken = createToken({ ...tokenPayload, type: "refresh" }, secret, REFRESH_EXPIRY_MS);

    // Log successful login
    storage.createAuditLog({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      resource: "auth",
      resourceId: null,
      details: null,
      ipAddress: req.ip || null,
    });

    res.json({
      token: accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRY_MS / 1000,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        practiceId: user.practiceId,
        name: user.name,
      },
    });
  });

  // Refresh token endpoint
  app.post("/api/auth/refresh", (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }
    const payload = verifyToken(refreshToken, secret);
    if (!payload || payload.type !== "refresh") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    const { type, iat, exp, jti, ...userData } = payload;
    const newAccessToken = createToken(userData, secret, TOKEN_EXPIRY_MS);
    res.json({ token: newAccessToken, expiresIn: TOKEN_EXPIRY_MS / 1000 });
  });

  // Register with bcrypt
  app.post("/api/auth/register", registerLimiter, async (req: Request, res: Response) => {
    const { email, password, name, role, practiceId } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name required" });
    }
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = storage.createUser({
      email,
      password: hashedPassword,
      name,
      role: role || "client",
      practiceId: practiceId || null,
    });

    storage.createAuditLog({
      userId: user.id,
      action: "USER_REGISTERED",
      resource: "auth",
      resourceId: String(user.id),
      details: JSON.stringify({ email, role: user.role }),
      ipAddress: req.ip || null,
    });

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      practiceId: user.practiceId,
      name: user.name,
    };
    const accessToken = createToken(tokenPayload, secret, TOKEN_EXPIRY_MS);
    res.json({ token: accessToken, user: { id: user.id, email: user.email, role: user.role, practiceId: user.practiceId, name: user.name } });
  });

  // Password change
  app.post("/api/auth/change-password", authMiddleware, async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }
    const user = storage.getUser(req.user!.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const hashedNew = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    storage.updateUserPassword(req.user!.id, hashedNew);

    storage.createAuditLog({
      userId: req.user!.id,
      action: "PASSWORD_CHANGED",
      resource: "auth",
      resourceId: String(req.user!.id),
      details: null,
      ipAddress: req.ip || null,
    });

    res.json({ message: "Password changed successfully" });
  });

  app.get("/api/auth/me", authMiddleware, (req: Request, res: Response) => {
    res.json(req.user);
  });

  return { authMiddleware, adminMiddleware };
}
