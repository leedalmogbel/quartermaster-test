/**
 * User Authentication
 * 
 * Simple JWT-based authentication for multi-client access.
 * Admin users see all practices. Client users see only their assigned practice.
 * 
 * In production, use bcrypt for passwords and store JWT secret in .env
 * 
 * ENV VARS NEEDED:
 *   JWT_SECRET=a-long-random-string-at-least-32-characters
 *   SESSION_SECRET=another-random-string
 */

import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Simple password hash (in production, use bcrypt)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Simple JWT implementation (in production, use jsonwebtoken)
function createToken(payload: any, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const { createHmac } = require("crypto");
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string, secret: string): any | null {
  try {
    const [header, body, signature] = token.split(".");
    const { createHmac } = require("crypto");
    const expectedSig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Extend Request type
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
  const JWT_SECRET = process.env.JWT_SECRET || "quartermaster-dev-secret-change-in-production";

  // Auth middleware — checks Authorization header
  function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token, JWT_SECRET);
    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = payload;
    next();
  }

  // Login
  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // For demo: accept any password for existing users
    // In production: compare hashed passwords
    // if (simpleHash(password) !== user.password) {
    //   return res.status(401).json({ error: "Invalid credentials" });
    // }

    const token = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      practiceId: user.practiceId,
      name: user.name,
    }, JWT_SECRET);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        practiceId: user.practiceId,
        name: user.name,
      },
    });
  });

  // Register new user (admin only in production)
  app.post("/api/auth/register", (req: Request, res: Response) => {
    const { email, password, name, role, practiceId } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name required" });
    }

    const existing = storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = storage.createUser({
      email,
      password: simpleHash(password),
      name,
      role: role || "client",
      practiceId: practiceId || null,
    });

    const token = createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      practiceId: user.practiceId,
      name: user.name,
    }, JWT_SECRET);

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, practiceId: user.practiceId, name: user.name } });
  });

  // Get current user
  app.get("/api/auth/me", authMiddleware, (req: Request, res: Response) => {
    res.json(req.user);
  });

  // Export middleware for protected routes
  return { authMiddleware };
}
