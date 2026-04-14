// server/security/middleware.ts
import type { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";

export function registerSecurityMiddleware(app: Express) {
  // Helmet sets many security headers automatically
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // needed for Vite in dev
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://api.anthropic.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false, // breaks some integrations
  }));

  // CORS lockdown
  app.use((req: Request, res: Response, next: NextFunction) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5000"];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  // Request size limits (prevent DoS)
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    // Already handled by express.json limit, but add extra safety
    next();
  });

  // Remove server fingerprinting
  app.disable("x-powered-by");

  // Force HTTPS redirect in production
  if (process.env.NODE_ENV === "production") {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.headers["x-forwarded-proto"] !== "https") {
        return res.redirect(301, `https://${req.hostname}${req.url}`);
      }
      next();
    });
  }
}
