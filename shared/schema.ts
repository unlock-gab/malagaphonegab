import { pgTable, text, varchar, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===================== USERS =====================
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("confirmateur"),
  name: text("name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== CATEGORIES =====================
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("Tag"),
  color: text("color").notNull().default("#6b7280"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ===================== BRANDS =====================
export const brands = pgTable("brands", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== PRODUCTS =====================
export const products = pgTable("products", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  category: text("category").notNull().default("other"),
  categoryId: varchar("category_id"),
  brandId: varchar("brand_id"),
  productType: text("product_type").notNull().default("accessory"),
  condition: text("condition").notNull().default("new"),
  sku: text("sku"),
  barcode: text("barcode"),
  imei: text("imei"),
  shortDescription: text("short_description"),
  description: text("description"),
  color: text("color"),
  storageGb: text("storage_gb"),
  ram: text("ram"),
  batteryHealth: integer("battery_health"),
  screenSize: text("screen_size"),
  processor: text("processor"),
  operatingSystem: text("operating_system"),
  camera: text("camera"),
  frontCamera: text("front_camera"),
  simType: text("sim_type"),
  connectivity: text("connectivity"),
  warrantyDays: integer("warranty_days").notNull().default(0),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(3),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(false),
  image: text("image").notNull().default(""),
  images: text("images").array(),
  rating: numeric("rating", { precision: 3, scale: 1 }).notNull().default("0"),
  reviews: integer("reviews").notNull().default(0),
  badge: text("badge"),
  tags: text("tags").array(),
  landingEnabled: boolean("landing_enabled").notNull().default(false),
  landingHook: text("landing_hook"),
  landingBenefits: text("landing_benefits").array(),
  landingImages: text("landing_images").array(),
  landingDescription: text("landing_description"),
  landingVideoUrl: text("landing_video_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== PRODUCT VARIANTS =====================
export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey(),
  productId: varchar("product_id").notNull(),
  storage: text("storage"),
  color: text("color"),
  sku: text("sku"),
  imei: text("imei"),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
  price: numeric("price", { precision: 10, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== SUPPLIERS =====================
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== PURCHASES =====================
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey(),
  supplierId: varchar("supplier_id"),
  supplierName: text("supplier_name").notNull(),
  referenceNumber: text("reference_number"),
  status: text("status").notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  extraCosts: numeric("extra_costs", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  purchaseStockApplied: boolean("purchase_stock_applied").notNull().default(false),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== PURCHASE ITEMS =====================
export const purchaseItems = pgTable("purchase_items", {
  id: varchar("id").primaryKey(),
  purchaseId: varchar("purchase_id").notNull(),
  productId: varchar("product_id"),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  imeis: text("imeis").array(), // IMEI list for phone-type products
});

// ===================== INVENTORY MOVEMENTS =====================
export const inventoryMovements = pgTable("inventory_movements", {
  id: varchar("id").primaryKey(),
  productId: varchar("product_id").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  reference: text("reference"),
  referenceId: varchar("reference_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== ORDERS =====================
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  wilaya: text("wilaya").notNull(),
  commune: text("commune"),
  address: text("address"),
  source: text("source").default("admin"),
  deliveryType: text("delivery_type").notNull().default("home"),
  deliveryPrice: numeric("delivery_price", { precision: 10, scale: 2 }).notNull().default("0"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash_on_delivery"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  assignedTo: text("assigned_to"),
  confirmateurName: text("confirmateur_name"),
  ip: text("ip"),
  productId: text("product_id"),
  productName: text("product_name"),
  productImage: text("product_image"),
  quantity: integer("quantity").default(1),
  price: numeric("price", { precision: 10, scale: 2 }),
  stockDeducted: boolean("stock_deducted").notNull().default(false),
  stockRestored: boolean("stock_restored").notNull().default(false),
  phoneUnitId: varchar("phone_unit_id"), // auto-assigned phone_unit for storefront single-product orders
  returnReason: text("return_reason"),
  returnCondition: text("return_condition"),
  returnNotes: text("return_notes"),
  returnAt: timestamp("return_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== AFTER-SALE RECORDS =====================
export const afterSaleRecords = pgTable("after_sale_records", {
  id: varchar("id").primaryKey(),
  type: text("type").notNull().default("warranty"),
  status: text("status").notNull().default("open"),
  orderId: varchar("order_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  productId: varchar("product_id"),
  productName: text("product_name").notNull(),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== ORDER ITEMS =====================
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id"),
  productName: text("product_name").notNull(),
  productImage: text("product_image"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  phoneUnitId: varchar("phone_unit_id"), // links to specific phone_unit when selling a phone
  imei: text("imei"),                    // snapshot of IMEI at sale time
});

// ===================== EXPENSES =====================
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  expenseType: text("expense_type").notNull().default("general"),
  relatedOrderId: varchar("related_order_id"),
  relatedPurchaseId: varchar("related_purchase_id"),
  notes: text("notes"),
  expenseDate: timestamp("expense_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== PROFIT RECORDS =====================
export const profitRecords = pgTable("profit_records", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull().unique(),
  revenue: numeric("revenue", { precision: 10, scale: 2 }).notNull(),
  productCost: numeric("product_cost", { precision: 10, scale: 2 }).notNull(),
  allocatedExpenses: numeric("allocated_expenses", { precision: 10, scale: 2 }).notNull().default("0"),
  grossProfit: numeric("gross_profit", { precision: 10, scale: 2 }).notNull(),
  netProfit: numeric("net_profit", { precision: 10, scale: 2 }).notNull(),
  partnerShare: numeric("partner_share", { precision: 10, scale: 2 }).notNull(),
  ownerShare: numeric("owner_share", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== PHONE UNITS (IMEI-based tracking) =====================
export const phoneUnits = pgTable("phone_units", {
  id: varchar("id").primaryKey(),
  productId: varchar("product_id").notNull(),
  imei: text("imei").notNull(),
  purchaseId: varchar("purchase_id"),
  supplierName: text("supplier_name"),
  purchaseCost: numeric("purchase_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("available"), // available / sold / returned / damaged / inspection
  soldOrderId: varchar("sold_order_id"),
  batteryHealth: integer("battery_health"),
  condition: text("condition"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===================== LEGACY TABLES (kept) =====================
export const blockedIps = pgTable("blocked_ips", {
  id: varchar("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const abandonedCarts = pgTable("abandoned_carts", {
  id: varchar("id").primaryKey(),
  customerPhone: text("customer_phone").notNull(),
  customerName: text("customer_name"),
  wilaya: text("wilaya"),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  source: text("source").default("product"),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveryCompanies = pgTable("delivery_companies", {
  slug: varchar("slug").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  apiKey: text("api_key"),
  apiToken: text("api_token"),
  accountId: text("account_id"),
  storeId: text("store_id"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ===================== INSERT SCHEMAS =====================
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true });
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertProfitRecordSchema = createInsertSchema(profitRecords).omit({ id: true, createdAt: true });
export const insertAbandonedCartSchema = createInsertSchema(abandonedCarts).omit({ id: true, createdAt: true });
export const insertProductVariantSchema = createInsertSchema(productVariants).omit({ id: true, createdAt: true });
export const insertAfterSaleSchema = createInsertSchema(afterSaleRecords).omit({ id: true, createdAt: true });
export const insertPhoneUnitSchema = createInsertSchema(phoneUnits).omit({ id: true, createdAt: true });

// ===================== TYPES =====================
export type InsertUser = { username: string; password: string; role: string; name: string };
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ProfitRecord = typeof profitRecords.$inferSelect;
export type InsertProfitRecord = z.infer<typeof insertProfitRecordSchema>;
export type BlockedIp = typeof blockedIps.$inferSelect;
export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;
export type DeliveryCompany = typeof deliveryCompanies.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type AfterSaleRecord = typeof afterSaleRecords.$inferSelect;
export type InsertAfterSale = z.infer<typeof insertAfterSaleSchema>;
export type PhoneUnit = typeof phoneUnits.$inferSelect;
export type InsertPhoneUnit = z.infer<typeof insertPhoneUnitSchema>;

// CartItem type for storefront cart
export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

// ===================== CONSTANTS =====================
export type DeliveryPrice = { home: number; desk: number };
export type DeliveryPrices = Record<string, DeliveryPrice>;

export const ALGERIAN_WILAYAS = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة",
  "بشار", "البليدة", "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت",
  "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة",
  "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم",
  "المسيلة", "معسكر", "ورقلة", "وهران", "البيض", "إليزي", "برج بوعريريج",
  "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس",
  "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت", "غرداية", "غليزان",
  "تيميمون", "برج باجي مختار", "أولاد جلال", "بني عباس", "إن صالح",
  "إن قزام", "تقرت", "جانت", "المغير", "المنيعة",
];

export const DEFAULT_DELIVERY_PRICES: DeliveryPrices = {
  "أدرار":          { home: 1050, desk: 900 },
  "الشلف":          { home: 750,  desk: 450 },
  "الأغواط":        { home: 850,  desk: 550 },
  "أم البواقي":     { home: 750,  desk: 450 },
  "باتنة":          { home: 750,  desk: 450 },
  "بجاية":          { home: 750,  desk: 450 },
  "بسكرة":          { home: 850,  desk: 550 },
  "بشار":           { home: 850,  desk: 650 },
  "البليدة":        { home: 550,  desk: 400 },
  "البويرة":        { home: 700,  desk: 450 },
  "تمنراست":        { home: 1350, desk: 1050 },
  "تبسة":           { home: 750,  desk: 500 },
  "تلمسان":         { home: 850,  desk: 500 },
  "تيارت":          { home: 750,  desk: 450 },
  "تيزي وزو":       { home: 650,  desk: 450 },
  "الجزائر":        { home: 400,  desk: 300 },
  "الجلفة":         { home: 850,  desk: 500 },
  "جيجل":           { home: 750,  desk: 450 },
  "سطيف":           { home: 750,  desk: 450 },
  "سعيدة":          { home: 750,  desk: 450 },
  "سكيكدة":         { home: 750,  desk: 450 },
  "سيدي بلعباس":   { home: 750,  desk: 450 },
  "عنابة":          { home: 750,  desk: 450 },
  "قالمة":          { home: 750,  desk: 450 },
  "قسنطينة":        { home: 750,  desk: 450 },
  "المدية":         { home: 700,  desk: 450 },
  "مستغانم":        { home: 750,  desk: 450 },
  "المسيلة":        { home: 750,  desk: 500 },
  "معسكر":          { home: 750,  desk: 450 },
  "ورقلة":          { home: 850,  desk: 600 },
  "وهران":          { home: 650,  desk: 450 },
  "البيض":          { home: 900,  desk: 600 },
  "إليزي":          { home: 0,    desk: 0 },
  "برج بوعريريج":   { home: 750,  desk: 450 },
  "بومرداس":        { home: 600,  desk: 450 },
  "الطارف":         { home: 750,  desk: 450 },
  "تندوف":          { home: 0,    desk: 0 },
  "تيسمسيلت":       { home: 800,  desk: 600 },
  "الوادي":         { home: 850,  desk: 600 },
  "خنشلة":          { home: 750,  desk: 450 },
  "سوق أهراس":      { home: 750,  desk: 450 },
  "تيبازة":         { home: 650,  desk: 450 },
  "ميلة":           { home: 750,  desk: 450 },
  "عين الدفلى":     { home: 750,  desk: 450 },
  "النعامة":         { home: 900,  desk: 600 },
  "عين تموشنت":     { home: 750,  desk: 450 },
  "غرداية":         { home: 850,  desk: 550 },
  "غليزان":         { home: 750,  desk: 450 },
  "تيميمون":        { home: 1050, desk: 900 },
  "برج باجي مختار": { home: 0,    desk: 0 },
  "أولاد جلال":     { home: 900,  desk: 550 },
  "بني عباس":       { home: 900,  desk: 900 },
  "إن صالح":        { home: 1350, desk: 0 },
  "إن قزام":        { home: 1350, desk: 0 },
  "تقرت":           { home: 850,  desk: 600 },
  "جانت":           { home: 0,    desk: 0 },
  "المغير":         { home: 850,  desk: 0 },
  "المنيعة":        { home: 900,  desk: 0 },
};

export type ShipperInfo = {
  slug: string;
  name: string;
  color: string;
  initials: string;
  website: string;
  description: string;
  fields: { key: string; label: string; placeholder: string }[];
};

export const DELIVERY_SHIPPERS: ShipperInfo[] = [
  { slug: "yalidine", name: "Yalidine", color: "#e53e3e", initials: "YL", website: "https://yalidine.app", description: "شركة توصيل رائدة في الجزائر مع API متكامل", fields: [{ key: "apiKey", label: "API ID", placeholder: "أدخل API ID" }, { key: "apiToken", label: "API Token", placeholder: "أدخل API Token" }] },
  { slug: "maystro", name: "Maystro Delivery", color: "#3182ce", initials: "MD", website: "https://maystro-delivery.com", description: "خدمة توصيل سريعة مع تتبع لحظي", fields: [{ key: "apiKey", label: "API Key", placeholder: "أدخل API Key" }, { key: "apiToken", label: "API Token", placeholder: "أدخل API Token" }, { key: "storeId", label: "Store ID", placeholder: "أدخل معرّف المتجر" }] },
  { slug: "zr-express", name: "ZR Express", color: "#d69e2e", initials: "ZR", website: "https://zr-express.com", description: "توصيل سريع لجميع الولايات", fields: [{ key: "apiKey", label: "API Key", placeholder: "أدخل API Key" }, { key: "apiToken", label: "API Token", placeholder: "أدخل API Token" }] },
  { slug: "ecotrack", name: "Ecotrack", color: "#276749", initials: "ET", website: "https://ecotrack.dz", description: "تتبع الشحنات وإدارة التوصيل", fields: [{ key: "apiKey", label: "API Key", placeholder: "أدخل API Key" }, { key: "apiToken", label: "API Token", placeholder: "أدخل API Token" }, { key: "accountId", label: "Account ID", placeholder: "أدخل معرّف الحساب" }] },
  { slug: "guepex", name: "Guepex", color: "#2b6cb0", initials: "GX", website: "https://guepex.com", description: "توصيل سريع وموثوق", fields: [{ key: "apiKey", label: "API Key", placeholder: "أدخل API Key" }, { key: "apiToken", label: "API Token", placeholder: "أدخل API Token" }] },
  { slug: "ecom", name: "Ecom Delivery", color: "#6b46c1", initials: "EC", website: "https://ecom-ex.com", description: "حلول التجارة الإلكترونية والتوصيل", fields: [{ key: "apiKey", label: "API Key", placeholder: "أدخل API Key" }, { key: "apiToken", label: "API Token", placeholder: "أدخل API Token" }, { key: "storeId", label: "Store ID", placeholder: "أدخل معرّف المتجر" }] },
  { slug: "zimou", name: "Zimou Express", color: "#2d3748", initials: "ZM", website: "https://zimou.app", description: "تطبيق متكامل لإدارة الشحنات", fields: [{ key: "apiKey", label: "API Key", placeholder: "أدخل API Key" }, { key: "apiToken", label: "API Token", placeholder: "أدخل API Token" }] },
];

export const ORDER_STATUSES = [
  { key: "new",                  label: "جديد",                 color: "text-sky-600",     dot: "bg-sky-500",     badge: "bg-sky-50 text-sky-700 border-sky-200" },
  { key: "confirmed",            label: "مؤكد",                 color: "text-emerald-600", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "preparing",            label: "قيد التجهيز",          color: "text-amber-600",   dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "shipped",              label: "تم الشحن",             color: "text-blue-600",    dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "with_delivery",        label: "مع شركة التوصيل",      color: "text-violet-600",  dot: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "delivered",            label: "تم التسليم",           color: "text-teal-600",    dot: "bg-teal-500",    badge: "bg-teal-50 text-teal-700 border-teal-200" },
  { key: "returned_by_delivery", label: "مرتجع من التوصيل",    color: "text-orange-600",  dot: "bg-orange-500",  badge: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "delivery_failed",      label: "فشل التوصيل",          color: "text-rose-600",    dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
  { key: "customer_refused",     label: "رفض المستقبل",         color: "text-red-600",     dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200" },
  { key: "cancelled",            label: "ملغي",                 color: "text-gray-600",    dot: "bg-gray-400",    badge: "bg-gray-50 text-gray-600 border-gray-200" },
];

export const AFTER_SALE_TYPES = [
  { key: "warranty",  label: "ضمان",         color: "text-blue-600",   badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "return",    label: "إرجاع",        color: "text-orange-600", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "exchange",  label: "تبديل",        color: "text-violet-600", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "repair",    label: "إصلاح",        color: "text-amber-600",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
];

export const AFTER_SALE_STATUSES = [
  { key: "open",        label: "مفتوح",       badge: "bg-sky-50 text-sky-700 border-sky-200" },
  { key: "in_progress", label: "قيد المعالجة", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "closed",      label: "مغلق",        badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export const RETURN_CONDITIONS = [
  { key: "sellable",    label: "قابل للبيع",       desc: "يُعاد للمخزون القابل للبيع" },
  { key: "damaged",     label: "تالف",              desc: "لا يُعاد للمخزون العادي" },
  { key: "inspection",  label: "تحت الفحص",         desc: "ينتظر الفحص قبل القرار" },
];

export const EXPENSE_TYPES = [
  { key: "general",   fr: "Général",    ar: "عام" },
  { key: "rent",      fr: "Loyer",      ar: "إيجار" },
  { key: "salary",    fr: "Salaires",   ar: "رواتب" },
  { key: "shipping",  fr: "Livraison",  ar: "شحن" },
  { key: "marketing", fr: "Marketing",  ar: "تسويق" },
  { key: "utilities", fr: "Services",   ar: "خدمات" },
  { key: "other",     fr: "Autre",      ar: "أخرى" },
];
