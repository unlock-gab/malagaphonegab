import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import pg from "pg";

// Auto-setup git credentials on startup (development only — never write token to disk in production)
if (process.env.NODE_ENV !== "production") {
  try {
    const gitToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    const gitUsername = process.env.GIT_USERNAME || "unlock-gab";
    if (gitToken) {
      fs.writeFileSync(`${process.env.HOME || "/home/runner"}/.git-credentials`, `https://${gitUsername}:${gitToken}@github.com\n`, { mode: 0o600 });
      execSync("git config --global credential.helper store", { stdio: "ignore" });
    }
  } catch { /* ignore credential setup errors */ }
}

const PgStore = connectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: "admin" | "confirmateur";
    username: string;
    name: string;
  }
}

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.googletagmanager.com https://analytics.tiktok.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  next();
});

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

app.use(session({
  store: new PgStore({ pool: pgPool, createTableIfMissing: true }),
  secret: sessionSecret || "dev-only-secret-not-for-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Serve uploaded product images as static files
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir, { maxAge: "7d" }));

  await registerRoutes(httpServer, app);

  // Auto-migrate: convert any remaining base64 images in DB to real files on disk
  try {
    const { storage } = await import("./storage");
    const { default: crypto } = await import("crypto");
    const products = await storage.getProducts();
    let migrated = 0;
    const migrateBase64 = (src: string | null | undefined): string | null | undefined => {
      if (!src || !src.startsWith("data:")) return src;
      try {
        const comma = src.indexOf(",");
        const mime = src.substring(0, comma).match(/:(.*?);/)?.[1] || "image/jpeg";
        const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(src.substring(comma + 1), "base64"));
        return `/uploads/${filename}`;
      } catch { return src; }
    };
    for (const p of products) {
      const updates: Record<string, any> = {};
      const img = migrateBase64(p.image);
      if (img !== p.image) updates.image = img;
      const imgs = Array.isArray((p as any).images) ? (p as any).images : [];
      const migratedImgs = imgs.map(migrateBase64);
      if (migratedImgs.some((v: any, i: number) => v !== imgs[i])) updates.images = migratedImgs;
      const landing = Array.isArray((p as any).landingImages) ? (p as any).landingImages : [];
      const migratedLanding = landing.map(migrateBase64);
      if (migratedLanding.some((v: any, i: number) => v !== landing[i])) updates.landingImages = migratedLanding;
      if (Object.keys(updates).length > 0) { await storage.updateProduct(p.id, updates); migrated++; }
    }
    if (migrated > 0) console.log(`[startup] Migrated ${migrated} product(s) images from base64 to disk files`);
  } catch (e) {
    console.error("[startup] Image migration error:", e);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
