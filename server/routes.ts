import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, hashPassword, verifyPassword } from "./storage";
import { insertProductSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

let _Jimp: any = null;
async function getJimp() {
  if (!_Jimp) {
    const mod = await import("jimp");
    _Jimp = (mod as any).default ?? mod;
  }
  return _Jimp;
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("الملف يجب أن يكون صورة"));
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) return cb(new Error("نوع الملف غير مدعوم"));
    cb(null, true);
  },
});

async function saveCompressedImage(buffer: Buffer): Promise<string> {
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.jpg`;
  const filepath = path.join(UPLOADS_DIR, filename);
  const Jimp = await getJimp();
  const img = await Jimp.read(buffer);
  if (img.getWidth() > 1200 || img.getHeight() > 1200) {
    img.scaleToFit(1200, 1200);
  }
  img.quality(82);
  await img.writeAsync(filepath);
  return `/uploads/${filename}`;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "غير مصرح" });
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.role !== "admin") return res.status(403).json({ message: "ممنوع - أدمن فقط" });
  next();
}

function requirePermission(perm: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) return res.status(401).json({ message: "غير مصرح" });
    if (req.session.role === "admin") return next();
    const perms: string[] = req.session.permissions ?? [];
    if (!perms.includes(perm)) return res.status(403).json({ message: "لا تملك صلاحية للوصول لهذه البيانات" });
    next();
  };
}

const ALLOWED_ORDER_STATUSES = ["new", "confirmed", "delivered", "paid", "returned"];

async function logOp(
  operationType: string,
  module: string,
  recordId: string,
  label: string,
  amount?: string | number | null,
  createdBy?: string | null,
  undoMeta?: Record<string, any>,
) {
  try {
    await storage.logOperation({
      id: `op-${crypto.randomUUID()}`,
      operationType,
      module,
      recordId,
      label,
      amount: amount != null ? String(amount) : null,
      createdBy: createdBy ?? null,
      undoMeta: undoMeta ? JSON.stringify(undoMeta) : null,
      isUndone: false,
    });
  } catch { /* non-blocking — history failure must not break business operations */ }
}

const isBase64 = (s: string) => typeof s === "string" && s.startsWith("data:");

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number, keyFn?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn ? keyFn(req) : getClientIp(req);
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) return res.status(429).json({ message: "طلبات كثيرة جداً، حاول مرة أخرى لاحقاً." });
    next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, e] of rateLimitStore.entries()) if (now > e.resetAt) rateLimitStore.delete(k); }, 60_000);

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ==================== IMAGE UPLOAD ====================

  app.post("/api/upload", requireAuth, rateLimit(30, 10 * 60 * 1000, req => `upload:${req.session.userId}`), upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "لم يتم رفع أي صورة" });
    try {
      const url = await saveCompressedImage(req.file.buffer);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ message: "فشل معالجة الصورة" });
    }
  });

  app.post("/api/upload/multiple", requireAuth, rateLimit(10, 10 * 60 * 1000, req => `upload_multi:${req.session.userId}`), upload.array("images", 5), async (req, res) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) return res.status(400).json({ message: "لم يتم رفع أي صور" });
    try {
      const urls = await Promise.all((req.files as Express.Multer.File[]).map(f => saveCompressedImage(f.buffer)));
      res.json({ urls });
    } catch (e: any) {
      res.status(500).json({ message: "فشل معالجة الصور" });
    }
  });

  // ==================== AUTH ====================

  app.post("/api/auth/login", rateLimit(10, 15 * 60 * 1000, req => `login:${getClientIp(req)}`), async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== "string" || typeof password !== "string") return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
    if (username.length > 50 || password.length > 200) return res.status(400).json({ message: "بيانات غير صحيحة" });
    const user = await storage.getUserByUsername(username.toLowerCase().trim());
    if (!user || !verifyPassword(password, user.password)) return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    if (user.active === false) return res.status(403).json({ message: "الحساب غير نشط، تواصل مع المدير" });
    // Auto-upgrade legacy SHA-256 hashes to scrypt on successful login
    if (!user.password.startsWith("v2:")) {
      const upgraded = hashPassword(password);
      await storage.updateUser(user.id, { password: upgraded });
    }
    // Load permissions from role
    let permissions: string[] = [];
    if (user.role === "admin") {
      permissions = ["*"];
    } else if (user.roleId) {
      permissions = await storage.getRolePermissions(user.roleId);
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.username = user.username;
    req.session.name = user.name;
    req.session.permissions = permissions;
    req.session.roleId = user.roleId ?? undefined;
    // Update last login
    storage.updateLastLogin(user.id).catch(() => {});
    res.json({ id: user.id, username: user.username, role: user.role, name: user.name, permissions, roleId: user.roleId });
  });

  app.post("/api/auth/logout", (req, res) => { req.session.destroy(() => {}); res.json({ message: "تم تسجيل الخروج" }); });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "غير مسجل" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "المستخدم غير موجود" });
    const perms = req.session.permissions ?? (user.role === "admin" ? ["*"] : []);
    res.json({ id: user.id, username: user.username, role: user.role, name: user.name, permissions: perms, roleId: user.roleId });
  });

  // ==================== DASHBOARD ====================

  app.get("/api/dashboard", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/stats", requireAdmin, async (_req, res) => {
    const prods = await storage.getProducts();
    const ords = await storage.getOrders();
    const totalRevenue = ords.reduce((s, o) => s + parseFloat(o.total as string || "0"), 0);
    const confirmateurs = await storage.getConfirmateurs();
    res.json({ totalProducts: prods.length, totalOrders: ords.length, totalRevenue, pendingOrders: ords.filter(o => o.status === "new").length, deliveredOrders: ords.filter(o => o.status === "delivered").length, totalConfirmateurs: confirmateurs.length });
  });

  // ==================== CATEGORIES ====================

  app.get("/api/categories", async (_req, res) => {
    res.json(await storage.getCategories());
  });

  app.post("/api/categories", requireAdmin, async (req, res) => {
    try {
      const cat = await storage.createCategory(req.body);
      logOp("category_create", "categories", cat.id, `Catégorie: ${cat.name}`, null, req.session.username ?? null);
      res.status(201).json(cat);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/categories/:id", requireAdmin, async (req, res) => {
    const cat = await storage.updateCategory(req.params.id, req.body);
    if (!cat) return res.status(404).json({ message: "الفئة غير موجودة" });
    res.json(cat);
  });

  app.delete("/api/categories/:id", requireAdmin, async (req, res) => {
    const existing = await storage.getCategory(req.params.id);
    if (!existing) return res.status(404).json({ message: "الفئة غير موجودة" });
    await logOp("category_delete", "categories", existing.id, `Catégorie supprimée: ${existing.name}`, null, req.session.username ?? null, existing as any);
    const ok = await storage.deleteCategory(req.params.id);
    if (!ok) return res.status(404).json({ message: "الفئة غير موجودة" });
    res.json({ message: "تم الحذف" });
  });

  // ==================== BRANDS ====================

  app.get("/api/brands", async (_req, res) => {
    res.json(await storage.getBrands());
  });

  app.post("/api/brands", requireAdmin, async (req, res) => {
    try {
      const brand = await storage.createBrand(req.body);
      logOp("brand_create", "brands", brand.id, `Marque: ${brand.name}`, null, req.session.username ?? null);
      res.status(201).json(brand);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/brands/:id", requireAdmin, async (req, res) => {
    const brand = await storage.updateBrand(req.params.id, req.body);
    if (!brand) return res.status(404).json({ message: "الماركة غير موجودة" });
    res.json(brand);
  });

  app.delete("/api/brands/:id", requireAdmin, async (req, res) => {
    const existing = await storage.getBrand(req.params.id);
    if (!existing) return res.status(404).json({ message: "الماركة غير موجودة" });
    await logOp("brand_delete", "brands", existing.id, `Marque supprimée: ${existing.name}`, null, req.session.username ?? null, existing as any);
    const ok = await storage.deleteBrand(req.params.id);
    if (!ok) return res.status(404).json({ message: "الماركة غير موجودة" });
    res.json({ message: "تم الحذف" });
  });

  // ==================== PRODUCTS ====================

  app.get("/api/products", async (req, res) => {
    const { category, featured, search, published } = req.query;
    let prods = await storage.getProducts();
    if (featured === "true") prods = prods.filter(p => p.featured);
    if (published === "true") prods = prods.filter(p => p.published);
    if (category && category !== "all") prods = prods.filter(p => p.category === category || p.categoryId === category);
    if (search) {
      const q = (search as string).toLowerCase();
      prods = prods.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
    }
    res.json(prods.map(p => ({
      ...p,
      image: isBase64(p.image) ? `/api/products/${p.id}/image` : p.image,
    })));
  });

  app.get("/api/products/low-stock", requireAdmin, async (_req, res) => {
    res.json(await storage.getLowStockProducts());
  });

  function serveImage(src: string | null | undefined, res: any) {
    try {
      if (!src) return res.status(404).end();
      if (src.startsWith("data:")) {
        const comma = src.indexOf(",");
        if (comma === -1) return res.status(500).end();
        const mime = src.substring(0, comma).match(/:(.*?);/)?.[1] || "image/jpeg";
        const buf = Buffer.from(src.substring(comma + 1), "base64");
        res.setHeader("Content-Type", mime).setHeader("Cache-Control", "public, max-age=86400").end(buf);
      } else {
        res.setHeader("Cache-Control", "public, max-age=86400").redirect(302, src);
      }
    } catch { res.status(500).end(); }
  }

  app.get("/api/products/:id/image", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) return res.status(404).end();
      const idx = parseInt(req.query.idx as string);
      let src = product.image;
      if (!isNaN(idx) && Array.isArray(product.images)) src = product.images[idx] ?? product.image;
      serveImage(src, res);
    } catch { res.status(500).end(); }
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
    res.json(product);
  });

  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const cost = parseFloat(req.body.costPrice ?? "0");
      if (!req.body.costPrice || isNaN(cost) || cost <= 0)
        return res.status(400).json({ message: "Le coût du produit est obligatoire et doit être supérieur à 0 DA." });
      const product = await storage.createProduct(req.body);
      logOp("product_create", "products", product.id, `Produit: ${product.name}`, product.costPrice, req.session.username ?? null);
      res.status(201).json(product);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      if (req.body.costPrice !== undefined) {
        const cost = parseFloat(req.body.costPrice ?? "0");
        if (isNaN(cost) || cost <= 0)
          return res.status(400).json({ message: "Le coût du produit est obligatoire et doit être supérieur à 0 DA." });
      }
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) return res.status(404).json({ message: "Produit introuvable" });
      res.json(product);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    const existing = await storage.getProduct(req.params.id);
    if (!existing) return res.status(404).json({ message: "المنتج غير موجود" });
    const { image, images, ...productMeta } = existing as any;
    await logOp("product_delete", "products", existing.id, `Produit supprimé: ${existing.name}`, existing.costPrice, req.session.username ?? null, { ...productMeta, image: null, images: null });
    const ok = await storage.deleteProduct(req.params.id);
    if (!ok) return res.status(404).json({ message: "المنتج غير موجود" });
    res.json({ message: "تم الحذف بنجاح" });
  });

  // ==================== SUPPLIERS ====================

  app.get("/api/suppliers", requireAdmin, async (_req, res) => {
    res.json(await storage.getSuppliers());
  });

  app.post("/api/suppliers", requireAdmin, async (req, res) => {
    try {
      const s = await storage.createSupplier(req.body);
      logOp("supplier_create", "suppliers", s.id, `Fournisseur: ${s.name}`, null, req.session.username ?? null);
      res.status(201).json(s);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/suppliers/:id", requireAdmin, async (req, res) => {
    const s = await storage.updateSupplier(req.params.id, req.body);
    if (!s) return res.status(404).json({ message: "المورد غير موجود" });
    res.json(s);
  });

  app.delete("/api/suppliers/:id", requireAdmin, async (req, res) => {
    const existing = await storage.getSupplier(req.params.id);
    if (!existing) return res.status(404).json({ message: "المورد غير موجود" });
    await logOp("supplier_delete", "suppliers", existing.id, `Fournisseur supprimé: ${existing.name}`, null, req.session.username ?? null, existing as any);
    const ok = await storage.deleteSupplier(req.params.id);
    if (!ok) return res.status(404).json({ message: "المورد غير موجود" });
    res.json({ message: "تم الحذف" });
  });

  // ==================== PURCHASES ====================

  app.get("/api/purchases", requireAdmin, async (_req, res) => {
    res.json(await storage.getPurchases());
  });

  app.get("/api/purchases/payments-summary", requireAdmin, async (_req, res) => {
    const summary = await storage.getAllPurchasePaymentsSummary();
    res.json(summary);
  });

  app.get("/api/purchases/:id", requireAdmin, async (req, res) => {
    const p = await storage.getPurchase(req.params.id);
    if (!p) return res.status(404).json({ message: "الشراء غير موجود" });
    const items = await storage.getPurchaseItems(req.params.id);
    res.json({ ...p, items });
  });

  app.post("/api/purchases", requireAdmin, async (req, res) => {
    try {
      const { items = [], ...purchaseData } = req.body;
      if (purchaseData.purchaseDate) {
        purchaseData.purchaseDate = new Date(purchaseData.purchaseDate);
        if (isNaN(purchaseData.purchaseDate.getTime())) purchaseData.purchaseDate = new Date();
      }
      const purchase = await storage.createPurchase(purchaseData, items);
      logOp(
        "purchase",
        "purchases",
        purchase.id,
        `Achat #${purchase.id.slice(-6).toUpperCase()} — ${purchase.supplierName}`,
        purchase.total,
        req.session.username ?? null,
      );
      res.status(201).json(purchase);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/purchases/:id/status", requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "الحالة مطلوبة" });
    const p = await storage.updatePurchaseStatus(req.params.id, status);
    if (!p) return res.status(404).json({ message: "الشراء غير موجود" });
    res.json(p);
  });

  app.delete("/api/purchases/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deletePurchase(req.params.id);
    if (!ok) return res.status(404).json({ message: "الشراء غير موجود" });
    res.json({ message: "تم الحذف" });
  });

  // ==================== INVENTORY ====================

  app.get("/api/inventory/movements", requireAdmin, async (_req, res) => {
    res.json(await storage.getInventoryMovements());
  });

  app.post("/api/inventory/adjust", requireAdmin, async (req, res) => {
    try {
      const { productId, quantity, type, notes } = req.body;
      if (!productId || quantity === undefined || !type) return res.status(400).json({ message: "بيانات ناقصة" });
      const movType = type === "in" ? "manual_adjustment" : type === "out" ? "damaged_out" : type;
      const parsedQty = parseInt(quantity);
      await storage.adjustStock(productId, parsedQty, movType, "manual_adjustment", undefined, notes);
      const product = await storage.getProduct(productId);
      logOp(
        "inventory_adjustment",
        "inventory",
        productId,
        `Ajustement stock — ${product?.name ?? productId} (${type === "in" ? "+" : "-"}${parsedQty})`,
        null,
        req.session.username ?? null,
        { productId, quantity: parsedQty, originalDir: type === "in" ? "in" : "out" },
      );
      res.json({ message: "تم تعديل المخزون" });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ==================== ORDERS ====================

  app.get("/api/orders", requireAuth, async (req, res) => {
    if (req.session.role === "confirmateur") return res.json(await storage.getOrdersByConfirmateur(req.session.userId!));
    res.json(await storage.getOrders());
  });

  app.get("/api/orders/counts", requireAdmin, async (_req, res) => {
    res.json(await storage.getOrderCounts());
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (req.session.role === "confirmateur" && order.assignedTo !== req.session.userId) return res.status(403).json({ message: "غير مصرح" });
    const items = await storage.getOrderItems(req.params.id);
    res.json({ ...order, items });
  });

  app.post("/api/orders", rateLimit(5, 10 * 60 * 1000), async (req, res) => {
    try {
      const ip = getClientIp(req);
      const blocked = await storage.isIpBlocked(ip);
      if (blocked) return res.status(403).json({ message: "تعذر إتمام الطلب." });
      const { items, ...orderData } = req.body;
      const order = await storage.createOrder({ ...orderData, ip }, items);
      res.status(201).json(order);
    } catch (e: any) { res.status(400).json({ message: "بيانات غير صحيحة" }); }
  });

  app.post("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const { items = [], ...orderData } = req.body;
      const initialStatus = orderData.status ?? "new";
      const order = await storage.createOrder({ ...orderData, source: orderData.source ?? "admin", status: "new" }, items);
      let finalOrder = order;
      if (initialStatus !== "new") {
        const updated = await storage.updateOrderStatus(order.id, initialStatus);
        finalOrder = updated ?? order;
      }
      const isPOS = (orderData.source ?? "admin") === "pos";
      const shortRef = "#" + order.id.slice(-6).toUpperCase();
      logOp(
        isPOS ? "pos_sale" : "admin_order",
        "orders",
        order.id,
        isPOS ? `Vente POS ${shortRef} — ${order.customerName}` : `Commande admin ${shortRef} — ${order.customerName}`,
        order.total,
        req.session.username ?? null,
      );
      return res.status(201).json(finalOrder);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/orders/:id/status", requireAuth, async (req, res) => {
    const { status } = req.body;
    if (!status || !ALLOWED_ORDER_STATUSES.includes(status)) return res.status(400).json({ message: "حالة غير صالحة" });
    if (req.session.role === "confirmateur") {
      const existing = await storage.getOrder(req.params.id);
      if (!existing || existing.assignedTo !== req.session.userId) return res.status(403).json({ message: "غير مصرح" });
    }
    const prevOrder = await storage.getOrder(req.params.id);
    const prevStatus = prevOrder?.status;
    const order = await storage.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (req.session.role === "admin" && prevStatus && prevStatus !== status) {
      const shortRef = "#" + req.params.id.slice(-6).toUpperCase();
      logOp(
        "order_status",
        "orders",
        req.params.id,
        `Statut commande ${shortRef} — ${prevStatus} → ${status}`,
        null,
        req.session.username ?? null,
        { prevStatus },
      );
    }
    res.json(order);
  });

  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (req.session.role === "confirmateur" && order.assignedTo !== req.session.userId) return res.status(403).json({ message: "غير مصرح" });

    // Fix 4: If status is being changed, always route through the central business logic function
    // This guarantees stock deduction, profit snapshots, and return logic are never bypassed
    if (req.body.status !== undefined) {
      const newStatus = req.body.status;
      if (!ALLOWED_ORDER_STATUSES.includes(newStatus)) return res.status(400).json({ message: "حالة غير صالحة" });
      // Apply any non-status field updates first
      const nonStatusFields = ["customerName", "customerPhone", "wilaya", "commune", "address", "deliveryType", "deliveryPrice", "subtotal", "total", "paymentMethod", "paymentStatus", "notes"];
      const fieldUpdates: any = {};
      for (const key of nonStatusFields) { if (req.body[key] !== undefined) fieldUpdates[key] = req.body[key]; }
      if (Object.keys(fieldUpdates).length > 0) await storage.updateOrder(req.params.id, fieldUpdates);
      // Then apply status change via the central function
      const updated = await storage.updateOrderStatus(req.params.id, newStatus);
      if (!updated) return res.status(404).json({ message: "الطلب غير موجود" });
      return res.json(updated);
    }

    const allowed = ["customerName", "customerPhone", "wilaya", "commune", "address", "deliveryType", "deliveryPrice", "subtotal", "total", "paymentMethod", "paymentStatus", "notes"];
    const updates: any = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    const updated = await storage.updateOrder(req.params.id, updates);
    if (!updated) return res.status(404).json({ message: "الطلب غير موجود" });
    res.json(updated);
  });

  app.patch("/api/orders/:id/assign", requireAdmin, async (req, res) => {
    const { confirmateurId } = req.body;
    if (!confirmateurId) return res.status(400).json({ message: "معرف المؤكد مطلوب" });
    const confirmateur = await storage.getUserById(confirmateurId);
    if (!confirmateur || confirmateur.role !== "confirmateur") return res.status(400).json({ message: "المؤكد غير موجود" });
    const order = await storage.assignOrder(req.params.id, confirmateurId, confirmateur.name);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    res.json(order);
  });

  app.delete("/api/orders/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteOrder(req.params.id);
    if (!ok) return res.status(404).json({ message: "الطلب غير موجود" });
    res.json({ success: true });
  });

  // ==================== DELIVERY RETURNS ====================

  app.post("/api/orders/:id/return", requireAdmin, async (req, res) => {
    try {
      const { condition, reason, notes } = req.body;
      if (!condition || !["sellable", "damaged", "inspection"].includes(condition)) {
        return res.status(400).json({ message: "حالة المرتجع مطلوبة (sellable/damaged/inspection)" });
      }
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: "سبب الإرجاع مطلوب" });
      }
      const order = await storage.processDeliveryReturn(req.params.id, condition, reason, notes);
      if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ==================== AFTER-SALE RECORDS ====================

  app.get("/api/after-sale", requireAdmin, async (_req, res) => {
    res.json(await storage.getAfterSaleRecords());
  });

  app.post("/api/after-sale", requireAdmin, async (req, res) => {
    try {
      const record = await storage.createAfterSaleRecord(req.body);
      logOp("after_sale_create", "after-sale", record.id, `SAV: ${record.customerName} — ${record.productName}`, null, req.session.username ?? null);
      res.status(201).json(record);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/after-sale/:id", requireAdmin, async (req, res) => {
    const record = await storage.updateAfterSaleRecord(req.params.id, req.body);
    if (!record) return res.status(404).json({ message: "السجل غير موجود" });
    res.json(record);
  });

  app.delete("/api/after-sale/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteAfterSaleRecord(req.params.id);
    if (!ok) return res.status(404).json({ message: "السجل غير موجود" });
    res.json({ success: true });
  });

  // ==================== PHONE UNITS (IMEI) ====================

  app.get("/api/phone-units", requireAdmin, async (req, res) => {
    const productId = req.query.productId as string | undefined;
    res.json(await storage.getPhoneUnits(productId));
  });

  app.get("/api/phone-units/:id", requireAdmin, async (req, res) => {
    const unit = await storage.getPhoneUnit(req.params.id);
    if (!unit) return res.status(404).json({ message: "الوحدة غير موجودة" });
    res.json(unit);
  });

  app.get("/api/phone-units/imei/:imei", requireAdmin, async (req, res) => {
    const unit = await storage.getPhoneUnitByImei(req.params.imei);
    if (!unit) return res.status(404).json({ message: "IMEI غير موجود" });
    res.json(unit);
  });

  app.post("/api/phone-units", requireAdmin, async (req, res) => {
    try {
      const unit = await storage.createPhoneUnit(req.body);
      res.status(201).json(unit);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/phone-units/:id", requireAdmin, async (req, res) => {
    const unit = await storage.updatePhoneUnit(req.params.id, req.body);
    if (!unit) return res.status(404).json({ message: "الوحدة غير موجودة" });
    res.json(unit);
  });

  app.delete("/api/phone-units/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deletePhoneUnit(req.params.id);
    if (!ok) return res.status(404).json({ message: "الوحدة غير موجودة" });
    res.json({ success: true });
  });

  app.post("/api/phone-units/sync-stock/:productId", requireAdmin, async (req, res) => {
    await storage.syncPhoneStock(req.params.productId);
    res.json({ success: true });
  });

  // ==================== STOCK VALUE ====================

  app.get("/api/inventory/stock-value", requireAdmin, async (_req, res) => {
    res.json(await storage.getStockValue());
  });

  // ==================== EXPENSES ====================

  app.get("/api/expenses", requireAdmin, async (_req, res) => {
    res.json(await storage.getExpenses());
  });

  app.post("/api/expenses", requireAdmin, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.expenseDate) body.expenseDate = new Date(body.expenseDate);
      const e = await storage.createExpense(body);
      logOp("expense_create", "expenses", e.id, `Dépense: ${e.label} (${e.amount} DA)`, e.amount, req.session.username ?? null);
      res.status(201).json(e);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/expenses/:id", requireAdmin, async (req, res) => {
    try {
      const old = await storage.getExpense(req.params.id);
      if (!old) return res.status(404).json({ message: "المصروف غير موجود" });
      const body = { ...req.body };
      if (body.expenseDate) body.expenseDate = new Date(body.expenseDate);
      const e = await storage.updateExpense(req.params.id, body);
      if (!e) return res.status(404).json({ message: "المصروف غير موجود" });
      logOp("expense_update", "expenses", e.id, `Dépense modifiée: ${e.label}`, e.amount, req.session.username ?? null, old as any);
      res.json(e);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/expenses/:id", requireAdmin, async (req, res) => {
    const existing = await storage.getExpense(req.params.id);
    if (!existing) return res.status(404).json({ message: "المصروف غير موجود" });
    await logOp("expense_delete", "expenses", existing.id, `Dépense supprimée: ${existing.label} (${existing.amount} DA)`, existing.amount, req.session.username ?? null, existing as any);
    const ok = await storage.deleteExpense(req.params.id);
    if (!ok) return res.status(404).json({ message: "المصروف غير موجود" });
    res.json({ message: "تم الحذف" });
  });

  // ==================== PROFIT ====================

  app.get("/api/profit", requireAdmin, async (_req, res) => {
    const records = await storage.getProfitRecords();
    const enriched = await Promise.all(records.map(async r => {
      try {
        const items = await storage.getOrderItems(r.orderId);
        const productNames = items.map(i => i.productName).filter(Boolean).join(", ");
        return { ...r, productNames: productNames || null, source: "order" };
      } catch {
        return { ...r, productNames: null, source: "order" };
      }
    }));
    // Include service sales as profit entries (cost=0, margin=100%)
    const serviceSales = await storage.getServiceSales();
    const serviceEntries = serviceSales.map(s => ({
      id: s.id,
      orderId: s.id,
      revenue: s.amount,
      productCost: "0",
      allocatedExpenses: "0",
      grossProfit: s.amount,
      netProfit: s.amount,
      partnerShare: "0",
      ownerShare: s.amount,
      createdAt: s.createdAt,
      productNames: s.serviceName,
      source: "service",
      serviceName: s.serviceName,
      category: s.category,
      cashierName: s.cashierName,
      paymentMethod: s.paymentMethod,
    }));
    res.json([...enriched, ...serviceEntries]);
  });

  // ==================== CONFIRMATEURS ====================

  app.get("/api/confirmateurs", requireAdmin, async (_req, res) => {
    const confirmateurs = await storage.getConfirmateurs();
    const allOrders = await storage.getOrders();
    const result = confirmateurs.map(u => {
      const myOrders = allOrders.filter(o => o.assignedTo === u.id);
      return {
        id: u.id, username: u.username, name: u.name, role: u.role, createdAt: u.createdAt,
        stats: {
          total: myOrders.length,
          delivered: myOrders.filter(o => o.status === "delivered").length,
          cancelled: myOrders.filter(o => o.status === "cancelled").length,
        },
      };
    });
    res.json(result);
  });

  app.post("/api/confirmateurs", requireAdmin, async (req, res) => {
    const schema = z.object({ username: z.string().min(3).max(30), password: z.string().min(4).max(100), name: z.string().min(2).max(60) });
    try {
      const data = schema.parse(req.body);
      const lowerUsername = data.username.toLowerCase().trim();
      const existing = await storage.getUserByUsername(lowerUsername);
      if (existing) return res.status(400).json({ message: "اسم المستخدم موجود بالفعل" });
      const user = await storage.createUser({ username: lowerUsername, password: hashPassword(data.password), role: "confirmateur", name: data.name });
      res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role });
    } catch (e) { res.status(400).json({ message: "بيانات غير صحيحة" }); }
  });

  app.patch("/api/confirmateurs/:id", requireAdmin, async (req, res) => {
    const { name, password } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (password) updates.password = hashPassword(password);
    const user = await storage.updateUser(req.params.id, updates);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
  });

  app.delete("/api/confirmateurs/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ message: "المستخدم غير موجود أو لا يمكن حذفه" });
    res.json({ message: "تم الحذف" });
  });

  // ==================== BLOCKED IPs ====================

  app.get("/api/blocked-ips", requireAdmin, async (_req, res) => res.json(await storage.getBlockedIps()));

  app.post("/api/blocked-ips", requireAdmin, async (req, res) => {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ message: "IP مطلوب" });
    res.status(201).json(await storage.blockIp(ip, reason));
  });

  app.delete("/api/blocked-ips/:id", requireAdmin, async (req, res) => {
    const ok = await storage.unblockIp(req.params.id);
    if (!ok) return res.status(404).json({ message: "IP غير موجود" });
    res.json({ success: true });
  });

  // ==================== ABANDONED CARTS ====================

  app.get("/api/abandoned-carts", requireAdmin, async (_req, res) => res.json(await storage.getAbandonedCarts()));

  app.post("/api/abandoned-carts", rateLimit(3, 10 * 60 * 1000), async (req, res) => {
    try {
      const ip = getClientIp(req);
      const { customerPhone, customerName, wilaya, productId, productName, source } = req.body;
      if (!customerPhone || !productId || !productName) return res.status(400).json({ message: "بيانات ناقصة" });
      const cart = await storage.createAbandonedCart({ customerPhone, customerName: customerName?.slice(0, 100), wilaya: wilaya?.slice(0, 50), productId: String(productId).slice(0, 50), productName: String(productName).slice(0, 200), source: source || "product", ip });
      res.status(201).json(cart);
    } catch { res.status(400).json({ message: "خطأ" }); }
  });

  app.delete("/api/abandoned-carts/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteAbandonedCart(req.params.id);
    if (!ok) return res.status(404).json({ message: "غير موجود" });
    res.json({ success: true });
  });

  // ==================== SETTINGS ====================

  app.get("/api/settings", async (req, res) => {
    const settings = await storage.getSettings();
    if (req.session.role !== "admin") {
      const { googleSheetsWebhookUrl: _h, ...pub } = settings;
      return res.json(pub);
    }
    res.json(settings);
  });

  app.patch("/api/settings", requireAdmin, rateLimit(30, 60 * 1000, req => `settings:${req.session.userId}`), async (req, res) => {
    const ALLOWED = [
      "facebookPixelId", "tiktokPixelId", "googleSheetsWebhookUrl", "deliveryPrices",
      "storeName", "storeAddress", "storePhone", "storePhone2", "storeEmail", "storeDescription", "storeLogo",
      "heroBannerImage",
      "whatsappNumber", "whatsappDefaultMessage", "facebookUrl", "instagramUrl", "tiktokUrl",
      "orderPrefix", "invoicePrefix", "defaultOrderNote",
      "defaultDeliveryFee", "defaultShippingCompany",
      "invoiceStoreName", "invoicePhone", "invoiceAddress", "invoiceFooterNote", "invoiceShowLogo",
      "posDefaultPayment", "posAutoPrint",
      "deliveryEnabled", "showDeliveryPrice",
    ];
    const sanitized: Record<string, string> = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined && typeof req.body[key] === "string" && req.body[key].length <= 5000) sanitized[key] = req.body[key];
    }
    res.json(await storage.updateSettings(sanitized));
  });

  app.post("/api/admin/change-password", requireAdmin, rateLimit(5, 15 * 60 * 1000, req => `chpwd:${req.session.userId}`), async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword)
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    if (typeof newPassword !== "string" || newPassword.length < 8)
      return res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" });
    if (newPassword.length > 200)
      return res.status(400).json({ message: "كلمة المرور طويلة جداً" });
    if (newPassword !== confirmPassword)
      return res.status(400).json({ message: "كلمة المرور الجديدة وتأكيدها غير متطابقتين" });
    const user = await storage.getUserById(req.session.userId!);
    if (!user || !verifyPassword(currentPassword, user.password))
      return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
    await storage.updateUser(user.id, { password: hashPassword(newPassword) });
    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  });

  // ==================== DELIVERY SHIPPERS ====================

  app.get("/api/shippers", requireAdmin, async (_req, res) => res.json(await storage.getDeliveryCompanies()));

  app.patch("/api/shippers/:slug", requireAdmin, async (req, res) => {
    const { slug } = req.params;
    const { enabled, apiKey, apiToken, accountId, storeId, notes } = req.body;
    const result = await storage.upsertDeliveryCompany(slug, { enabled, apiKey, apiToken, accountId, storeId, notes });
    res.json(result);
  });

  // ==================== PRODUCT VARIANTS ====================

  app.get("/api/products/:id/variants", requireAdmin, async (req, res) => {
    res.json(await storage.getProductVariants(req.params.id));
  });

  app.post("/api/products/:id/variants", requireAdmin, async (req, res) => {
    try {
      const cost = parseFloat(req.body.costPrice ?? "0");
      if (!req.body.costPrice || isNaN(cost) || cost <= 0)
        return res.status(400).json({ message: "Le coût de la variante est obligatoire et doit être supérieur à 0 DA." });
      const v = await storage.createProductVariant({ ...req.body, productId: req.params.id });
      res.status(201).json(v);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/variants/:id", requireAdmin, async (req, res) => {
    try {
      if (req.body.costPrice !== undefined) {
        const cost = parseFloat(req.body.costPrice ?? "0");
        if (isNaN(cost) || cost <= 0)
          return res.status(400).json({ message: "Le coût de la variante est obligatoire et doit être supérieur à 0 DA." });
      }
      const v = await storage.updateProductVariant(req.params.id, req.body);
      if (!v) return res.status(404).json({ message: "Variant introuvable" });
      res.json(v);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/variants/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteProductVariant(req.params.id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // ==================== REPORTS ====================

  app.get("/api/reports/top-products", requireAdmin, async (req, res) => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const data = await storage.getTopProductsReport(from, to);
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ==================== CUSTOMERS ====================

  app.get("/api/customers", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getCustomers()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/customers/:phone/orders", requireAdmin, async (req, res) => {
    try { res.json(await storage.getCustomerOrders(decodeURIComponent(req.params.phone))); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ==================== ADMIN MIGRATE IMAGES ====================

  app.post("/api/admin/migrate-images", requireAdmin, async (_req, res) => {
    try {
      const prods = await storage.getProducts();
      let migrated = 0;
      const migrateField = async (src: string | null | undefined) => {
        if (!src || !src.startsWith("data:")) return src;
        try {
          const comma = src.indexOf(",");
          return await saveCompressedImage(Buffer.from(src.substring(comma + 1), "base64"));
        } catch { return src; }
      };
      for (const p of prods) {
        const updates: Record<string, any> = {};
        const newImage = await migrateField(p.image);
        if (newImage !== p.image) updates.image = newImage;
        if (Object.keys(updates).length > 0) { await storage.updateProduct(p.id, updates); migrated++; }
      }
      res.json({ success: true, total: prods.length, migrated });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==================== INVOICE TEMPLATES ====================

  app.get("/api/invoice-templates", requireAdmin, async (_req, res) => {
    res.json(await storage.getInvoiceTemplates());
  });

  app.get("/api/invoice-templates/by-category/:categoryId", async (req, res) => {
    const catId = req.params.categoryId === "default" ? null : req.params.categoryId;
    const tpl = await storage.getInvoiceTemplateByCategoryId(catId);
    res.json(tpl || null);
  });

  app.post("/api/invoice-templates", requireAdmin, async (req, res) => {
    try {
      const tpl = await storage.createInvoiceTemplate(req.body);
      res.status(201).json(tpl);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/invoice-templates/:id", requireAdmin, async (req, res) => {
    const tpl = await storage.updateInvoiceTemplate(req.params.id, req.body);
    if (!tpl) return res.status(404).json({ message: "Template introuvable" });
    res.json(tpl);
  });

  app.delete("/api/invoice-templates/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteInvoiceTemplate(req.params.id);
    if (!ok) return res.status(404).json({ message: "Template introuvable" });
    res.json({ success: true });
  });

  // ── Purchase Payments (Versements) ───────────────────────────────────────────
  app.get("/api/purchases/:id/payments", requireAdmin, async (req, res) => {
    const payments = await storage.getPurchasePayments(req.params.id);
    res.json(payments);
  });
  app.post("/api/purchases/:id/payments", requireAdmin, async (req, res) => {
    try {
      const payment = await storage.createPurchasePayment({
        purchaseId: req.params.id,
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod || "cash",
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        notes: req.body.notes || null,
      });
      const purchase = await storage.getPurchase(req.params.id);
      logOp(
        "versement",
        "purchases",
        payment.id,
        `Versement #${req.params.id.slice(-6).toUpperCase()} — ${purchase?.supplierName ?? "Fournisseur"} (${new Intl.NumberFormat("fr-FR").format(parseFloat(payment.amount))} DA)`,
        payment.amount,
        req.session.username ?? null,
        { purchaseId: req.params.id, supplierName: purchase?.supplierName },
      );
      res.status(201).json(payment);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.delete("/api/purchase-payments/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deletePurchasePayment(req.params.id);
    if (!ok) return res.status(404).json({ message: "Versement introuvable" });
    res.json({ success: true });
  });

  // ── Partners ─────────────────────────────────────────────────────────────────
  app.get("/api/partners", requireAdmin, async (_req, res) => {
    res.json(await storage.getPartners());
  });
  app.post("/api/partners", requireAdmin, async (req, res) => {
    try {
      const partner = await storage.createPartner(req.body);
      logOp("partner_create", "partners", partner.id, `Partenaire: ${partner.name}`, null, req.session.username ?? null);
      res.status(201).json(partner);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.patch("/api/partners/:id", requireAdmin, async (req, res) => {
    const partner = await storage.updatePartner(req.params.id, req.body);
    if (!partner) return res.status(404).json({ message: "Partenaire introuvable" });
    res.json(partner);
  });
  app.delete("/api/partners/:id", requireAdmin, async (req, res) => {
    const existing = await storage.getPartner(req.params.id);
    if (!existing) return res.status(404).json({ message: "Partenaire introuvable" });
    await logOp("partner_delete", "partners", existing.id, `Partenaire supprimé: ${existing.name}`, null, req.session.username ?? null, existing as any);
    const ok = await storage.deletePartner(req.params.id);
    if (!ok) return res.status(404).json({ message: "Partenaire introuvable" });
    res.json({ success: true });
  });

  // ── Supplier Returns / Exchanges ─────────────────────────────────────────────
  app.get("/api/supplier-returns", requireAdmin, async (_req, res) => {
    res.json(await storage.getSupplierReturns());
  });
  app.get("/api/supplier-returns/purchase/:purchaseId", requireAdmin, async (req, res) => {
    res.json(await storage.getSupplierReturnsByPurchase(req.params.purchaseId));
  });
  app.get("/api/supplier-returns/supplier/:supplierId", requireAdmin, async (req, res) => {
    res.json(await storage.getSupplierReturnsBySupplier(req.params.supplierId));
  });
  app.get("/api/supplier-balance/:supplierId", requireAdmin, async (req, res) => {
    res.json(await storage.getSupplierBalance(req.params.supplierId));
  });
  app.get("/api/purchase-balance/:purchaseId", requireAdmin, async (req, res) => {
    res.json(await storage.getPurchaseBalance(req.params.purchaseId));
  });
  app.get("/api/supplier-returns/:id", requireAdmin, async (req, res) => {
    const r = await storage.getSupplierReturn(req.params.id);
    if (!r) return res.status(404).json({ message: "Retour introuvable" });
    res.json(r);
  });
  app.post("/api/supplier-returns", requireAdmin, async (req, res) => {
    try {
      const b = req.body;
      const data: any = {
        purchaseId: b.purchaseId,
        supplierId: b.supplierId ?? null,
        supplierName: b.supplierName,
        type: b.type ?? "return",
        status: b.status ?? "pending",
        productId: b.productId ?? null,
        productName: b.productName,
        quantity: parseInt(b.quantity) || 1,
        unitValue: b.unitValue?.toString() ?? "0",
        totalValue: b.totalValue?.toString() ?? "0",
        phoneUnitId: b.phoneUnitId ?? null,
        imei: b.imei ?? null,
        replacementProductId: b.replacementProductId ?? null,
        replacementProductName: b.replacementProductName ?? null,
        replacementQuantity: b.replacementQuantity ? parseInt(b.replacementQuantity) : null,
        replacementUnitCost: b.replacementUnitCost?.toString() ?? null,
        replacementTotalCost: b.replacementTotalCost?.toString() ?? null,
        replacementPhoneUnitId: b.replacementPhoneUnitId ?? null,
        replacementImei: b.replacementImei ?? null,
        reason: b.reason ?? null,
        notes: b.notes ?? null,
        returnDate: b.returnDate ? new Date(b.returnDate) : new Date(),
      };
      const ret = await storage.createSupplierReturn(data);
      logOp(
        "supplier_return",
        "supplier_returns",
        ret.id,
        `Retour/Échange fournisseur — ${ret.supplierName} (${ret.productName})`,
        ret.totalValue,
        req.session.username ?? null,
      );
      if (b.autoApply) {
        const applied = await storage.applySupplierReturn(ret.id);
        return res.status(201).json(applied);
      }
      res.status(201).json(ret);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.patch("/api/supplier-returns/:id/apply", requireAdmin, async (req, res) => {
    try {
      const r = await storage.applySupplierReturn(req.params.id);
      res.json(r);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });
  app.patch("/api/supplier-returns/:id/cancel", requireAdmin, async (req, res) => {
    try {
      const r = await storage.cancelSupplierReturn(req.params.id);
      res.json(r);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ==================== SERVICE SALES ====================

  app.get("/api/service-sales", requireAuth, async (_req, res) => {
    const sales = await storage.getServiceSales();
    res.json(sales);
  });

  app.post("/api/service-sales", requireAuth, async (req, res) => {
    try {
      const { serviceName, category, customerName, customerPhone, amount, paymentMethod, notes } = req.body;
      if (!serviceName?.trim()) return res.status(400).json({ message: "Nom du service requis" });
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) return res.status(400).json({ message: "Le montant doit être positif" });
      if (!paymentMethod?.trim()) return res.status(400).json({ message: "Mode de paiement requis" });
      const sale = await storage.createServiceSale({
        serviceName: serviceName.trim(),
        category: category?.trim() || null,
        customerName: customerName?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        amount: amt.toFixed(2),
        paymentMethod: paymentMethod.trim(),
        notes: notes?.trim() || null,
        cashierName: req.session.name ?? null,
        cashierUsername: req.session.username ?? null,
      });
      res.status(201).json(sale);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/service-sales/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteServiceSale(req.params.id);
    if (!ok) return res.status(404).json({ message: "Vente introuvable" });
    res.json({ success: true });
  });

  // ==================== ROLES ====================

  app.get("/api/roles", requireAdmin, async (_req, res) => {
    res.json(await storage.getRoles());
  });

  app.post("/api/roles", requireAdmin, async (req, res) => {
    try {
      const { name, permissions } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Nom du rôle requis" });
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
      const existing = await storage.getRoleBySlug(slug);
      if (existing) return res.status(400).json({ message: "Un rôle avec ce nom existe déjà" });
      const role = await storage.createRole({
        name: name.trim(),
        slug,
        permissions: JSON.stringify(Array.isArray(permissions) ? permissions : []),
        isSystem: false,
      });
      res.status(201).json(role);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const role = await storage.getRole(req.params.id);
      if (!role) return res.status(404).json({ message: "Rôle introuvable" });
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.permissions !== undefined) updates.permissions = JSON.stringify(Array.isArray(req.body.permissions) ? req.body.permissions : []);
      const updated = await storage.updateRole(req.params.id, updates);
      res.json(updated);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/roles/:id", requireAdmin, async (req, res) => {
    const ok = await storage.deleteRole(req.params.id);
    if (!ok) return res.status(400).json({ message: "Impossible de supprimer ce rôle (système ou utilisé)" });
    res.json({ success: true });
  });

  // ==================== ADMIN USERS ====================

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const allUsers = await storage.getAdminUsers();
    res.json(allUsers.map(u => ({ ...u, password: undefined })));
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { name, username, phone, email, password, roleId, active } = req.body;
      if (!username?.trim() || !password?.trim()) return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      if (password.length < 6) return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      const role = roleId ? await storage.getRole(roleId) : null;
      const user = await storage.createUser({
        username: username.toLowerCase().trim(),
        password: hashPassword(password),
        name: name?.trim() ?? "",
        role: role?.slug === "admin" ? "admin" : "confirmateur",
        roleId: roleId ?? null,
        phone: phone ?? null,
        email: email ?? null,
        active: active !== false,
      });
      res.status(201).json({ ...user, password: undefined });
    } catch (e: any) {
      if (e.message?.includes("unique")) return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      if (req.params.id === "user-admin" && req.body.role && req.body.role !== "admin") {
        return res.status(400).json({ message: "لا يمكن تغيير دور المدير الرئيسي" });
      }
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.active !== undefined) updates.active = req.body.active;
      if (req.body.roleId !== undefined) {
        updates.roleId = req.body.roleId;
        const role = req.body.roleId ? await storage.getRole(req.body.roleId) : null;
        updates.role = role?.slug === "admin" ? "admin" : "confirmateur";
      }
      if (req.body.password) {
        if (req.body.password.length < 6) return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
        updates.password = hashPassword(req.body.password);
      }
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      res.json({ ...user, password: undefined });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    if (req.params.id === "user-admin") return res.status(400).json({ message: "لا يمكن حذف المدير الرئيسي" });
    const ok = await storage.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.json({ success: true });
  });

  // ── Operation History (Undo) ──────────────────────────────────────────────────
  app.get("/api/operation-history", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getRecentOperations(5));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/operation-history/:id/undo", requireAdmin, async (req, res) => {
    try {
      const op = await storage.getOperation(req.params.id);
      if (!op) return res.status(404).json({ message: "Opération introuvable" });
      if (op.isUndone) return res.status(400).json({ message: "Opération déjà annulée" });

      const meta = op.undoMeta ? JSON.parse(op.undoMeta) : {};

      switch (op.operationType) {
        case "pos_sale":
        case "admin_order": {
          const order = await storage.getOrder(op.recordId);
          if (!order) throw new Error("Commande introuvable");
          if (["returned", "cancelled"].includes(order.status)) throw new Error("La commande est déjà annulée ou retournée");
          if (["new", "confirmed"].includes(order.status)) {
            await storage.updateOrder(op.recordId, { status: "cancelled" });
          } else {
            await storage.updateOrderStatus(op.recordId, "returned");
          }
          await storage.deleteProfitRecordByOrderId(op.recordId);
          break;
        }
        case "purchase": {
          const purchase = await storage.getPurchase(op.recordId);
          if (!purchase) throw new Error("Achat introuvable ou déjà supprimé");
          const deleted = await storage.deletePurchase(op.recordId);
          if (!deleted) throw new Error("Échec de la suppression de l'achat");
          break;
        }
        case "versement": {
          const ok = await storage.deletePurchasePayment(op.recordId);
          if (!ok) throw new Error("Versement introuvable ou déjà supprimé");
          break;
        }
        case "supplier_return": {
          const ret = await storage.getSupplierReturn(op.recordId);
          if (!ret) throw new Error("Retour fournisseur introuvable");
          if (ret.status === "cancelled") throw new Error("Le retour est déjà annulé");
          await storage.cancelSupplierReturn(op.recordId);
          break;
        }
        case "inventory_adjustment": {
          if (!meta.productId || meta.quantity === undefined || !meta.originalDir) throw new Error("Données d'annulation insuffisantes");
          const reverseType = meta.originalDir === "in" ? "damaged_out" : "manual_adjustment";
          await storage.adjustStock(meta.productId, Math.abs(meta.quantity), reverseType, "undo_adjustment", undefined, `Annulation: ${op.label}`);
          break;
        }
        case "order_status": {
          if (!meta.prevStatus) throw new Error("Statut précédent inconnu");
          const order = await storage.getOrder(op.recordId);
          if (!order) throw new Error("Commande introuvable");
          await storage.updateOrderStatus(op.recordId, meta.prevStatus);
          break;
        }
        case "expense_create": {
          const ok = await storage.deleteExpense(op.recordId);
          if (!ok) throw new Error("Dépense introuvable ou déjà supprimée");
          break;
        }
        case "expense_update": {
          const { id: _id, createdAt: _ca, ...restoreData } = meta;
          await storage.updateExpense(op.recordId, restoreData);
          break;
        }
        case "expense_delete": {
          if (!meta.id) throw new Error("Données de restauration manquantes");
          await storage.restoreExpense(meta);
          break;
        }
        case "product_create": {
          const ok = await storage.deleteProduct(op.recordId);
          if (!ok) throw new Error("Produit introuvable ou déjà supprimé");
          break;
        }
        case "product_delete": {
          if (!meta.id) throw new Error("Données de restauration manquantes");
          await storage.restoreProduct(meta);
          break;
        }
        case "category_create": {
          const ok = await storage.deleteCategory(op.recordId);
          if (!ok) throw new Error("Catégorie introuvable ou déjà supprimée");
          break;
        }
        case "category_delete": {
          if (!meta.id) throw new Error("Données de restauration manquantes");
          await storage.restoreCategory(meta);
          break;
        }
        case "brand_create": {
          const ok = await storage.deleteBrand(op.recordId);
          if (!ok) throw new Error("Marque introuvable ou déjà supprimée");
          break;
        }
        case "brand_delete": {
          if (!meta.id) throw new Error("Données de restauration manquantes");
          await storage.restoreBrand(meta);
          break;
        }
        case "supplier_create": {
          const ok = await storage.deleteSupplier(op.recordId);
          if (!ok) throw new Error("Fournisseur introuvable ou déjà supprimé");
          break;
        }
        case "supplier_delete": {
          if (!meta.id) throw new Error("Données de restauration manquantes");
          await storage.restoreSupplier(meta);
          break;
        }
        case "after_sale_create": {
          const ok = await storage.deleteAfterSaleRecord(op.recordId);
          if (!ok) throw new Error("Enregistrement SAV introuvable ou déjà supprimé");
          break;
        }
        case "partner_create": {
          const ok = await storage.deletePartner(op.recordId);
          if (!ok) throw new Error("Partenaire introuvable ou déjà supprimé");
          break;
        }
        case "partner_delete": {
          if (!meta.id) throw new Error("Données de restauration manquantes");
          await storage.restorePartner(meta);
          break;
        }
        default:
          throw new Error(`Type non supporté: ${op.operationType}`);
      }

      await storage.markOperationUndone(req.params.id);
      res.json({ message: "Opération annulée avec succès" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  return httpServer;
}
