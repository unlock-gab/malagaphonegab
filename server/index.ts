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
    role: string;
    username: string;
    name: string;
    permissions: string[];
    roleId?: string;
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
  // Auto-migrate DB schema on every startup so new tables are always created
  try {
    console.log("[db] Applying schema migrations...");
    execSync("npx drizzle-kit push --force", {
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log("[db] Schema migrations applied ✓");
  } catch (e) {
    console.error("[db] Schema migration error (continuing anyway):", e);
  }

  // Fallback: ensure critical tables & columns exist via raw SQL (handles old Docker images missing new schema changes)
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        default_share NUMERIC(5,2) NOT NULL DEFAULT 50,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS partner_id VARCHAR;
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS partner_name TEXT;
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS partner_percentage NUMERIC(5,2);
      CREATE TABLE IF NOT EXISTS purchase_payments (
        id VARCHAR PRIMARY KEY,
        purchase_id VARCHAR NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        payment_date TIMESTAMP DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE purchase_payments ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
      CREATE TABLE IF NOT EXISTS supplier_returns (
        id VARCHAR PRIMARY KEY,
        purchase_id VARCHAR NOT NULL,
        supplier_id VARCHAR,
        supplier_name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'return',
        product_id VARCHAR,
        product_name TEXT NOT NULL,
        phone_unit_id VARCHAR,
        imei TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_value NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_value NUMERIC(10,2) NOT NULL DEFAULT 0,
        replacement_product_id VARCHAR,
        replacement_product_name TEXT,
        replacement_phone_unit_id VARCHAR,
        replacement_imei TEXT,
        replacement_quantity INTEGER DEFAULT 1,
        replacement_unit_cost NUMERIC(10,2),
        replacement_total_cost NUMERIC(10,2),
        reason TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        stock_applied BOOLEAN NOT NULL DEFAULT FALSE,
        balance_applied BOOLEAN NOT NULL DEFAULT FALSE,
        auto_apply BOOLEAN NOT NULL DEFAULT TRUE,
        return_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS operation_history (
        id VARCHAR PRIMARY KEY,
        operation_type TEXT NOT NULL,
        module TEXT NOT NULL,
        record_id TEXT NOT NULL,
        label TEXT NOT NULL,
        amount NUMERIC(10,2),
        prev_state TEXT,
        new_state TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        is_undone BOOLEAN NOT NULL DEFAULT FALSE,
        undone_at TIMESTAMP,
        undo_meta TEXT
      );
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        permissions TEXT NOT NULL DEFAULT '[]',
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id VARCHAR;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
      CREATE TABLE IF NOT EXISTS service_sales (
        id VARCHAR PRIMARY KEY,
        service_name TEXT NOT NULL,
        category TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        amount NUMERIC(10,2) NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        notes TEXT,
        cashier_name TEXT,
        cashier_username TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT,
        job_title TEXT,
        monthly_salary NUMERIC(10,2) NOT NULL,
        start_date TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS salary_advances (
        id VARCHAR PRIMARY KEY,
        employee_id VARCHAR NOT NULL REFERENCES employees(id),
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS salary_payments (
        id VARCHAR PRIMARY KEY,
        employee_id VARCHAR NOT NULL REFERENCES employees(id),
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        note TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS client_credits (
        id VARCHAR PRIMARY KEY,
        customer_id VARCHAR,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        linked_order_id VARCHAR,
        original_amount NUMERIC(10,2) NOT NULL,
        total_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
        remaining_amount NUMERIC(10,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'unpaid',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS credit_versements (
        id VARCHAR PRIMARY KEY,
        credit_id VARCHAR NOT NULL REFERENCES client_credits(id),
        customer_id VARCHAR,
        amount NUMERIC(10,2) NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        note TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS invoice_templates (
        id VARCHAR PRIMARY KEY,
        category_id VARCHAR,
        category_name VARCHAR NOT NULL DEFAULT 'Défaut',
        company_name TEXT NOT NULL DEFAULT 'MALAGA PHONE',
        company_phone TEXT NOT NULL DEFAULT '',
        company_address TEXT NOT NULL DEFAULT 'الجزائر',
        header_text TEXT NOT NULL DEFAULT '',
        footer_text TEXT NOT NULL DEFAULT 'شكراً لتعاملكم مع MALAGA PHONE',
        warranty_text TEXT NOT NULL DEFAULT '',
        terms_text TEXT NOT NULL DEFAULT '',
        show_logo BOOLEAN NOT NULL DEFAULT TRUE,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE profit_records ADD COLUMN IF NOT EXISTS partner_id VARCHAR;
      ALTER TABLE profit_records ADD COLUMN IF NOT EXISTS partner_name TEXT;
      ALTER TABLE profit_records ADD COLUMN IF NOT EXISTS partner_percentage NUMERIC(5,2);
    `);
    console.log("[db] Critical tables & columns verified ✓");
  } catch (e) {
    console.error("[db] Critical table check error:", e);
  }

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
