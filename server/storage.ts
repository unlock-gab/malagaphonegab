import {
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Category, type InsertCategory,
  type Brand, type InsertBrand,
  type Supplier, type InsertSupplier,
  type Purchase, type InsertPurchase,
  type PurchaseItem, type InsertPurchaseItem,
  type InventoryMovement, type InsertInventoryMovement,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Expense, type InsertExpense,
  type ProfitRecord, type InsertProfitRecord,
  type BlockedIp, type AbandonedCart, type InsertAbandonedCart,
  type DeliveryCompany,
  type ProductVariant, type InsertProductVariant,
  type AfterSaleRecord, type InsertAfterSale,
  type PhoneUnit, type InsertPhoneUnit,
  type InvoiceTemplate, type InsertInvoiceTemplate,
  type Partner, type InsertPartner,
  type PurchasePayment, type InsertPurchasePayment,
  type SupplierReturn, type InsertSupplierReturn,
  type OperationHistory, type InsertOperationHistory,
  type Role, type InsertRole,
  type ServiceSale, type InsertServiceSale,
  type Employee, type InsertEmployee,
  type SalaryAdvance, type InsertSalaryAdvance,
  type SalaryPayment, type InsertSalaryPayment,
  type ClientCredit, type InsertClientCredit,
  type CreditVersement, type InsertCreditVersement,
  ALL_PERMISSIONS,
  DEFAULT_DELIVERY_PRICES,
  users, products, categories, brands, suppliers, purchases, purchaseItems,
  inventoryMovements, orders, orderItems, expenses, profitRecords,
  blockedIps, abandonedCarts, appSettings, deliveryCompanies, productVariants,
  afterSaleRecords, phoneUnits, invoiceTemplates, partners, purchasePayments,
  supplierReturns, operationHistory, roles, serviceSales,
  employees, salaryAdvances, salaryPayments,
  clientCredits, creditVersements,
} from "@shared/schema";
import { randomUUID, createHash, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db } from "./db";
import { eq, getTableColumns, desc, sql, and, lt, gte, lte, ilike } from "drizzle-orm";

// ── Legacy SHA-256 hash (kept for backward-compat migration only) ─────────────
function legacyHash(password: string): string {
  return createHash("sha256").update(password + "nova_store_salt_2026").digest("hex");
}

// ── Modern scrypt hash: "v2:<16-byte-hex-salt>:<64-byte-hex-key>" ────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key  = scryptSync(password, salt, 64).toString("hex");
  return `v2:${salt}:${key}`;
}

// ── Verify password (supports both v2-scrypt and legacy SHA-256) ─────────────
export function verifyPassword(input: string, stored: string): boolean {
  try {
    if (stored.startsWith("v2:")) {
      const [, salt, keyHex] = stored.split(":");
      const derived = scryptSync(input, salt, 64);
      const stored64 = Buffer.from(keyHex, "hex");
      if (derived.length !== stored64.length) return false;
      return timingSafeEqual(derived, stored64);
    }
    // Legacy: constant-time compare of SHA-256 hashes
    const a = Buffer.from(legacyHash(input), "hex");
    const b = Buffer.from(stored, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getConfirmateurs(): Promise<User[]>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Brands
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, data: Partial<InsertBrand>): Promise<Brand | undefined>;
  deleteBrand(id: string): Promise<boolean>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getFeaturedProducts(): Promise<Product[]>;
  getLowStockProducts(threshold?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;

  // Purchases
  getPurchases(): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase, items: InsertPurchaseItem[]): Promise<Purchase>;
  updatePurchaseStatus(id: string, status: string): Promise<Purchase | undefined>;
  deletePurchase(id: string): Promise<boolean>;
  getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]>;

  // Inventory
  getInventoryMovements(): Promise<InventoryMovement[]>;
  createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement>;
  adjustStock(productId: string, quantity: number, type: string, reference?: string, referenceId?: string, notes?: string): Promise<void>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrdersByConfirmateur(confirmateurId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrder(order: InsertOrder, items?: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  assignOrder(id: string, confirmateurId: string, confirmateurName: string): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  getOrderCounts(): Promise<Record<string, number>>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Profit
  getProfitRecords(): Promise<ProfitRecord[]>;
  getProfitRecord(orderId: string): Promise<ProfitRecord | undefined>;
  createProfitRecord(record: InsertProfitRecord): Promise<ProfitRecord>;
  getDashboardStats(): Promise<DashboardStats>;

  // Product Variants
  getProductVariants(productId: string): Promise<ProductVariant[]>;
  createProductVariant(data: InsertProductVariant): Promise<ProductVariant>;
  updateProductVariant(id: string, data: Partial<InsertProductVariant>): Promise<ProductVariant | undefined>;
  deleteProductVariant(id: string): Promise<boolean>;

  // Returns
  processDeliveryReturn(orderId: string, condition: string, reason: string, notes?: string): Promise<Order | undefined>;

  // After-Sale Records
  getAfterSaleRecords(): Promise<AfterSaleRecord[]>;
  createAfterSaleRecord(data: InsertAfterSale): Promise<AfterSaleRecord>;
  updateAfterSaleRecord(id: string, data: Partial<InsertAfterSale>): Promise<AfterSaleRecord | undefined>;
  deleteAfterSaleRecord(id: string): Promise<boolean>;

  // Stock Value
  getStockValue(): Promise<{ totalValue: number; byProduct: { productId: string; productName: string; stock: number; costPrice: number; value: number }[] }>;

  // Reports
  getTopProductsReport(from?: Date, to?: Date): Promise<TopProductRow[]>;

  // Phone Units (IMEI tracking)
  getPhoneUnits(productId?: string): Promise<PhoneUnit[]>;
  getPhoneUnit(id: string): Promise<PhoneUnit | undefined>;
  getPhoneUnitByImei(imei: string): Promise<PhoneUnit | undefined>;
  createPhoneUnit(unit: InsertPhoneUnit): Promise<PhoneUnit>;
  updatePhoneUnit(id: string, data: Partial<PhoneUnit>): Promise<PhoneUnit | undefined>;
  deletePhoneUnit(id: string): Promise<boolean>;
  syncPhoneStock(productId: string): Promise<void>;

  // Customers
  getCustomers(): Promise<CustomerSummary[]>;
  getCustomerOrders(phone: string): Promise<Order[]>;

  // Legacy / Settings
  getBlockedIps(): Promise<BlockedIp[]>;
  isIpBlocked(ip: string): Promise<boolean>;
  blockIp(ip: string, reason?: string): Promise<BlockedIp>;
  unblockIp(id: string): Promise<boolean>;
  getAbandonedCarts(): Promise<AbandonedCart[]>;
  createAbandonedCart(data: InsertAbandonedCart): Promise<AbandonedCart>;
  deleteAbandonedCart(id: string): Promise<boolean>;
  getSettings(): Promise<Record<string, string>>;
  updateSettings(settings: Record<string, string>): Promise<Record<string, string>>;
  getDeliveryCompanies(): Promise<DeliveryCompany[]>;
  upsertDeliveryCompany(slug: string, data: Partial<DeliveryCompany>): Promise<DeliveryCompany>;

  // Invoice Templates
  getInvoiceTemplates(): Promise<InvoiceTemplate[]>;
  getInvoiceTemplate(id: string): Promise<InvoiceTemplate | undefined>;
  getInvoiceTemplateByCategoryId(categoryId: string | null): Promise<InvoiceTemplate | undefined>;
  createInvoiceTemplate(data: InsertInvoiceTemplate): Promise<InvoiceTemplate>;
  updateInvoiceTemplate(id: string, data: Partial<InsertInvoiceTemplate>): Promise<InvoiceTemplate | undefined>;
  deleteInvoiceTemplate(id: string): Promise<boolean>;

  // Partners
  getPartners(): Promise<Partner[]>;
  getPartner(id: string): Promise<Partner | undefined>;
  createPartner(data: InsertPartner): Promise<Partner>;
  updatePartner(id: string, data: Partial<InsertPartner>): Promise<Partner | undefined>;
  deletePartner(id: string): Promise<boolean>;

  // Purchase Payments (Versements)
  getPurchasePayments(purchaseId: string): Promise<PurchasePayment[]>;
  getAllPurchasePaymentsSummary(): Promise<{ purchaseId: string; totalPaid: number; totalReturned: number }[]>;
  createPurchasePayment(data: InsertPurchasePayment): Promise<PurchasePayment>;
  deletePurchasePayment(id: string): Promise<boolean>;

  // Supplier Returns / Exchanges
  getSupplierReturns(): Promise<SupplierReturn[]>;
  getSupplierReturn(id: string): Promise<SupplierReturn | undefined>;
  getSupplierReturnsByPurchase(purchaseId: string): Promise<SupplierReturn[]>;
  getSupplierReturnsBySupplier(supplierId: string): Promise<SupplierReturn[]>;
  createSupplierReturn(data: InsertSupplierReturn): Promise<SupplierReturn>;
  applySupplierReturn(id: string): Promise<SupplierReturn>;
  cancelSupplierReturn(id: string): Promise<SupplierReturn>;
  getSupplierBalance(supplierId: string): Promise<{ totalPurchases: number; totalPaid: number; totalReturned: number; remaining: number; credit: number }>;
  getPurchaseBalance(purchaseId: string): Promise<{ total: number; totalPaid: number; totalReturned: number; remaining: number; credit: number }>;

  // Operation History (Undo log)
  logOperation(data: InsertOperationHistory): Promise<OperationHistory>;
  getRecentOperations(limit?: number): Promise<OperationHistory[]>;
  getOperation(id: string): Promise<OperationHistory | undefined>;
  markOperationUndone(id: string): Promise<void>;
  deleteProfitRecordByOrderId(orderId: string): Promise<void>;

  // Service Sales
  getServiceSales(): Promise<ServiceSale[]>;
  getServiceSaleById(id: string): Promise<ServiceSale | undefined>;
  createServiceSale(data: InsertServiceSale): Promise<ServiceSale>;
  deleteServiceSale(id: string): Promise<boolean>;

  // Payroll
  getEmployees(): Promise<Employee[]>;
  getEmployeeById(id: string): Promise<Employee | undefined>;
  createEmployee(data: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  getSalaryAdvances(employeeId?: string, month?: number, year?: number): Promise<SalaryAdvance[]>;
  createSalaryAdvance(data: InsertSalaryAdvance): Promise<SalaryAdvance>;
  deleteSalaryAdvance(id: string): Promise<boolean>;
  getSalaryPayments(employeeId?: string, month?: number, year?: number): Promise<SalaryPayment[]>;
  createSalaryPayment(data: InsertSalaryPayment): Promise<SalaryPayment>;
  deleteSalaryPayment(id: string): Promise<boolean>;

  // Client Credit
  getClientCredits(): Promise<ClientCredit[]>;
  getClientCreditById(id: string): Promise<ClientCredit | undefined>;
  createClientCredit(data: InsertClientCredit): Promise<ClientCredit>;
  updateClientCredit(id: string, data: Partial<ClientCredit>): Promise<ClientCredit | undefined>;
  getCreditVersements(creditId: string): Promise<CreditVersement[]>;
  createCreditVersement(data: InsertCreditVersement): Promise<CreditVersement>;
  deleteCreditVersement(id: string): Promise<boolean>;
  getTotalActiveClientCredit(): Promise<number>;
}

export interface TopProductRow {
  productId: string | null;
  productName: string;
  qtySold: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
}

export interface CustomerSummary {
  phone: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
  wilaya: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  newOrdersCount: number;
  totalRevenue: number;
  netProfit: number;
  partnerShare: number;
  ownerShare: number;
  totalClientCredit: number;
  recentOrders: Order[];
  lowStockProducts: Product[];
  recentMovements: InventoryMovement[];
  recentPurchases: Purchase[];
  topProducts: { productName: string; count: number; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number; profit: number }[];
}

export class DatabaseStorage implements IStorage {

  // ============ USERS ============

  async getUserById(id: string) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }

  async getUserByUsername(username: string) {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }

  async createUser(data: InsertUser): Promise<User> {
    const id = `user-${randomUUID()}`;
    const [u] = await db.insert(users).values({ ...data, id }).returning();
    return u;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [u] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return u;
  }

  async deleteUser(id: string): Promise<boolean> {
    if (id === "user-admin") return false;
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getConfirmateurs(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "confirmateur"));
  }

  async getAdminUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }

  // ============ ROLES ============

  async getRoles(): Promise<Role[]> {
    return db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [r] = await db.select().from(roles).where(eq(roles.id, id));
    return r;
  }

  async getRoleBySlug(slug: string): Promise<Role | undefined> {
    const [r] = await db.select().from(roles).where(eq(roles.slug, slug));
    return r;
  }

  async createRole(data: InsertRole): Promise<Role> {
    const id = `role-${randomUUID()}`;
    const [r] = await db.insert(roles).values({ id, ...data }).returning();
    return r;
  }

  async updateRole(id: string, data: Partial<InsertRole>): Promise<Role | undefined> {
    const [r] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return r;
  }

  async deleteRole(id: string): Promise<boolean> {
    const role = await this.getRole(id);
    if (!role || role.isSystem) return false;
    const usersWithRole = await db.select().from(users).where(eq(users.roleId, id));
    if (usersWithRole.length > 0) return false;
    await db.delete(roles).where(eq(roles.id, id));
    return true;
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const role = await this.getRole(roleId);
    if (!role) return [];
    try { return JSON.parse(role.permissions); } catch { return []; }
  }

  // ============ CATEGORIES ============

  async getCategories(): Promise<Category[]> {
    const rows = await db.select().from(categories);
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [c] = await db.select().from(categories).where(eq(categories.id, id));
    return c;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = `cat-${randomUUID()}`;
    const [c] = await db.insert(categories).values({ ...category, id }).returning();
    return c;
  }

  async updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [c] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return c;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  // ============ BRANDS ============

  async getBrands(): Promise<Brand[]> {
    const rows = await db.select().from(brands);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [b] = await db.select().from(brands).where(eq(brands.id, id));
    return b;
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    const id = `brand-${randomUUID()}`;
    const [b] = await db.insert(brands).values({ ...brand, id }).returning();
    return b;
  }

  async updateBrand(id: string, data: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [b] = await db.update(brands).set(data).where(eq(brands.id, id)).returning();
    return b;
  }

  async deleteBrand(id: string): Promise<boolean> {
    const result = await db.delete(brands).where(eq(brands.id, id)).returning();
    return result.length > 0;
  }

  // ============ PRODUCTS ============

  async getProducts(): Promise<Product[]> {
    const { landingImages, images, ...listCols } = getTableColumns(products);
    const rows = await db.select(listCols).from(products);
    return rows
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .map(p => ({ ...p, landingImages: [], images: [] }));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  }

  async getFeaturedProducts(): Promise<Product[]> {
    const { landingImages, ...listCols } = getTableColumns(products);
    const rows = await db.select(listCols).from(products)
      .where(and(eq(products.featured, true), eq(products.published, true)));
    return rows.map(p => ({ ...p, landingImages: [] }));
  }

  async getLowStockProducts(threshold = 5): Promise<Product[]> {
    const { landingImages, images, ...listCols } = getTableColumns(products);
    const rows = await db.select(listCols).from(products)
      .where(lt(products.stock, threshold));
    return rows.map(p => ({ ...p, landingImages: [], images: [] }));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const [p] = await db.insert(products).values({
      ...product, id,
      stock: product.stock ?? 0,
      minStock: product.minStock ?? 3,
      costPrice: product.costPrice ?? "0",
      featured: product.featured ?? false,
      published: product.published ?? false,
      images: product.images ?? [],
      tags: product.tags ?? [],
      landingBenefits: product.landingBenefits ?? [],
      landingEnabled: product.landingEnabled ?? false,
    }).returning();
    return p;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [p] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return p;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  // ============ SUPPLIERS ============

  async getSuppliers(): Promise<Supplier[]> {
    const rows = await db.select().from(suppliers);
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [s] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return s;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = `sup-${randomUUID()}`;
    const [s] = await db.insert(suppliers).values({ ...supplier, id }).returning();
    return s;
  }

  async updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [s] = await db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning();
    return s;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning();
    return result.length > 0;
  }

  // ============ PURCHASES ============

  async getPurchases(): Promise<Purchase[]> {
    const rows = await db.select().from(purchases);
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getPurchase(id: string): Promise<Purchase | undefined> {
    const [p] = await db.select().from(purchases).where(eq(purchases.id, id));
    return p;
  }

  async getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]> {
    return db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
  }

  async createPurchase(purchase: InsertPurchase, items: InsertPurchaseItem[]): Promise<Purchase> {
    const id = `pur-${randomUUID()}`;
    const shouldApplyStock = purchase.status === "completed" && items.length > 0;
    const [p] = await db.insert(purchases).values({
      ...purchase, id,
      purchaseStockApplied: shouldApplyStock,
    }).returning();

    if (items.length > 0) {
      // Ensure each item has a productName (fetch from DB if missing)
      const enrichedItems = await Promise.all(items.map(async item => {
        let productName = (item as any).productName;
        if (!productName && item.productId) {
          const [prod] = await db.select({ name: products.name }).from(products).where(eq(products.id, item.productId));
          productName = prod?.name ?? "منتج";
        }
        return { ...item, productName: productName || "منتج", id: `pitem-${randomUUID()}`, purchaseId: id };
      }));
      await db.insert(purchaseItems).values(enrichedItems);

      if (shouldApplyStock) {
        for (const item of enrichedItems) {
          if (!item.productId) continue;
          const imeis: string[] = (item.imeis as any) ?? [];
          if (imeis.length > 0) {
            const product = await this.getProduct(item.productId);
            const isPhone = product?.productType === "phone" || product?.productType === "tablet";
            if (isPhone) {
              for (const imei of imeis) {
                const trimmed = imei.trim();
                if (!trimmed) continue;
                const dup = await this.getPhoneUnitByImei(trimmed);
                if (!dup) {
                  await this.createPhoneUnit({
                    productId: item.productId,
                    imei: trimmed,
                    purchaseId: id,
                    supplierName: p.supplierName ?? null,
                    purchaseCost: item.unitCost,
                    status: "available",
                    condition: product?.condition ?? "used_good",
                    batteryHealth: null, soldOrderId: null, notes: null,
                  });
                }
              }
              await this.syncPhoneStock(item.productId);
              continue;
            }
          }
          await this.adjustStock(
            item.productId,
            item.quantity,
            "purchase_in",
            "purchase",
            id,
            `استلام شراء: ${p.supplierName}`,
          );
        }
      }
    }

    return p;
  }

  async updatePurchaseStatus(id: string, status: string): Promise<Purchase | undefined> {
    const existing = await this.getPurchase(id);
    if (!existing) return undefined;

    // Apply stock only once: when transitioning to "completed" AND stock not yet applied
    const stockAlreadyApplied = (existing as any).purchaseStockApplied;
    const shouldApplyStock = status === "completed" && !stockAlreadyApplied;

    const [p] = await db.update(purchases)
      .set({ status, purchaseStockApplied: stockAlreadyApplied || shouldApplyStock })
      .where(eq(purchases.id, id))
      .returning();

    if (shouldApplyStock) {
      const items = await this.getPurchaseItems(id);
      for (const item of items) {
        if (!item.productId) continue;
        const imeis: string[] = (item.imeis as any) ?? [];
        if (imeis.length > 0) {
          // Phone product with IMEI tracking
          const product = await this.getProduct(item.productId);
          const isPhone = product?.productType === "phone" || product?.productType === "tablet";
          if (isPhone) {
            for (const imei of imeis) {
              const trimmed = imei.trim();
              if (!trimmed) continue;
              // Avoid duplicate IMEI
              const existing = await this.getPhoneUnitByImei(trimmed);
              if (!existing) {
                await this.createPhoneUnit({
                  productId: item.productId,
                  imei: trimmed,
                  purchaseId: id,
                  supplierName: p.supplierName ?? null,
                  purchaseCost: item.unitCost,
                  status: "available",
                  condition: product?.condition ?? "used_good",
                  batteryHealth: null, soldOrderId: null, notes: null,
                });
              }
            }
            await this.syncPhoneStock(item.productId);
            continue; // Skip normal adjustStock for phones — syncPhoneStock handles it
          }
        }
        await this.adjustStock(
          item.productId,
          item.quantity,
          "purchase_in",
          "purchase",
          id,
          `استلام شراء: ${existing.supplierName}`,
        );
      }
    }

    // CRITICAL FIX 4: When cancelling a completed purchase, reverse phone_units AND stock
    if (status === "cancelled" && existing.status !== "cancelled" && stockAlreadyApplied) {
      const [updated] = await db.update(purchases)
        .set({ purchaseStockApplied: false })
        .where(eq(purchases.id, id))
        .returning();

      const items = await this.getPurchaseItems(id);
      for (const item of items) {
        if (!item.productId) continue;
        const product = await this.getProduct(item.productId);
        const isPhone = product?.productType === "phone" || product?.productType === "tablet";
        const imeis: string[] = (item.imeis as any) ?? [];

        if (isPhone && imeis.length > 0) {
          // Delete only available phone_units from this purchase (sold ones stay intact with a warning)
          const units = await db.select().from(phoneUnits).where(eq(phoneUnits.purchaseId, id));
          for (const u of units) {
            if (u.productId === item.productId) {
              if (u.status === "available") {
                await db.delete(phoneUnits).where(eq(phoneUnits.id, u.id));
              } else {
                await this.createInventoryMovement({
                  productId: item.productId,
                  productName: product?.name ?? "منتج",
                  type: "note",
                  quantity: 0,
                  reference: "purchase_cancelled",
                  referenceId: id,
                  notes: `تحذير: وحدة IMEI ${u.imei} مباعة من شراء تم إلغاؤه`,
                });
              }
            }
          }
          await this.syncPhoneStock(item.productId);
        } else {
          // Non-IMEI: reverse via adjustStock
          await this.adjustStock(
            item.productId,
            item.quantity,
            "out",
            "purchase_cancelled",
            id,
            `إلغاء شراء: ${existing.supplierName}`,
          );
        }
      }
      return updated ?? p;
    }

    return p;
  }

  async deletePurchase(id: string): Promise<boolean> {
    const existing = await this.getPurchase(id);
    // CRITICAL FIX 1: Reverse stock AND phone_units if this completed purchase applied stock
    if (existing && (existing as any).purchaseStockApplied) {
      const items = await this.getPurchaseItems(id);
      for (const item of items) {
        if (!item.productId) continue;
        const product = await this.getProduct(item.productId);
        const isPhone = product?.productType === "phone" || product?.productType === "tablet";
        const imeis: string[] = (item.imeis as any) ?? [];

        if (isPhone && imeis.length > 0) {
          // Delete phone_units that were created by this purchase to prevent orphan IMEI units
          const units = await db.select().from(phoneUnits).where(eq(phoneUnits.purchaseId, id));
          for (const u of units) {
            if (u.productId === item.productId) {
              // Only delete units that are still available (not yet sold)
              if (u.status === "available") {
                await db.delete(phoneUnits).where(eq(phoneUnits.id, u.id));
              } else {
                // Unit was sold — log a warning note movement but don't delete
                await this.createInventoryMovement({
                  productId: item.productId,
                  productName: product?.name ?? "منتج",
                  type: "note",
                  quantity: 0,
                  reference: "purchase_deleted",
                  referenceId: id,
                  notes: `تحذير: وحدة IMEI ${u.imei} مباعة من شراء تم حذفه`,
                });
              }
            }
          }
          await this.syncPhoneStock(item.productId);
        } else {
          // Non-IMEI product: reverse via adjustStock
          await this.adjustStock(
            item.productId,
            item.quantity,
            "out",
            "purchase_deleted",
            id,
            `حذف شراء مكتمل: ${existing.supplierName}`,
          );
        }
      }
    }
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
    const result = await db.delete(purchases).where(eq(purchases.id, id)).returning();
    return result.length > 0;
  }

  // ============ INVENTORY ============

  async getInventoryMovements(): Promise<InventoryMovement[]> {
    const rows = await db.select().from(inventoryMovements);
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement> {
    const id = `inv-${randomUUID()}`;
    const [m] = await db.insert(inventoryMovements).values({ ...movement, id }).returning();
    return m;
  }

  async adjustStock(
    productId: string,
    quantity: number,
    type: string,
    reference?: string,
    referenceId?: string,
    notes?: string,
  ): Promise<void> {
    const product = await this.getProduct(productId);
    if (!product) return;

    const isOut = type === "out" || type === "order_out" || type === "damaged_out";
    const delta = isOut ? -Math.abs(quantity) : Math.abs(quantity);
    const newStock = Math.max(0, product.stock + delta);

    await db.update(products).set({ stock: newStock }).where(eq(products.id, productId));

    await this.createInventoryMovement({
      productId,
      productName: product.name,
      type,
      quantity: isOut ? -Math.abs(quantity) : Math.abs(quantity),
      reference: reference ?? null,
      referenceId: referenceId ?? null,
      notes: notes ?? null,
    });
  }

  // ============ PHONE UNITS (IMEI) ============

  async getPhoneUnits(productId?: string): Promise<PhoneUnit[]> {
    const rows = productId
      ? await db.select().from(phoneUnits).where(eq(phoneUnits.productId, productId))
      : await db.select().from(phoneUnits);
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getPhoneUnit(id: string): Promise<PhoneUnit | undefined> {
    const [u] = await db.select().from(phoneUnits).where(eq(phoneUnits.id, id));
    return u;
  }

  async getPhoneUnitByImei(imei: string): Promise<PhoneUnit | undefined> {
    const [u] = await db.select().from(phoneUnits).where(eq(phoneUnits.imei, imei));
    return u;
  }

  async createPhoneUnit(unit: InsertPhoneUnit): Promise<PhoneUnit> {
    const id = `pu-${randomUUID()}`;
    const [u] = await db.insert(phoneUnits).values({ ...unit, id }).returning();
    return u;
  }

  async updatePhoneUnit(id: string, data: Partial<PhoneUnit>): Promise<PhoneUnit | undefined> {
    const { id: _id, createdAt: _c, ...safe } = data as any;
    const [u] = await db.update(phoneUnits).set(safe).where(eq(phoneUnits.id, id)).returning();
    return u;
  }

  async deletePhoneUnit(id: string): Promise<boolean> {
    const result = await db.delete(phoneUnits).where(eq(phoneUnits.id, id)).returning();
    return result.length > 0;
  }

  /** Sync product.stock to count of 'available' phone_units for this product */
  async syncPhoneStock(productId: string): Promise<void> {
    const available = await db.select().from(phoneUnits)
      .where(and(eq(phoneUnits.productId, productId), eq(phoneUnits.status, "available")));
    await db.update(products).set({ stock: available.length }).where(eq(products.id, productId));
  }

  // ============ ORDERS ============

  async getOrders(): Promise<Order[]> {
    const rows = await db.select().from(orders);
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getOrdersByConfirmateur(confirmateurId: string): Promise<Order[]> {
    const rows = await db.select().from(orders).where(eq(orders.assignedTo, confirmateurId));
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [o] = await db.select().from(orders).where(eq(orders.id, id));
    return o;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrder(order: InsertOrder, items?: InsertOrderItem[]): Promise<Order> {
    const id = `ord-${randomUUID()}`;
    const [o] = await db.insert(orders).values({
      ...order, id,
      status: order.status ?? "new",
      source: order.source ?? "admin",
      deliveryType: order.deliveryType ?? "home",
      deliveryPrice: order.deliveryPrice ?? "0",
      subtotal: order.subtotal ?? "0",
      paymentMethod: order.paymentMethod ?? "cash_on_delivery",
      paymentStatus: order.paymentStatus ?? "pending",
    }).returning();

    if (items && items.length > 0) {
      const itemsWithIds = items.map(item => ({
        ...item,
        id: `oitem-${randomUUID()}`,
        orderId: id,
      }));
      await db.insert(orderItems).values(itemsWithIds);
      // Stock is NOT deducted at order creation — only at "confirmed" status
    }

    return o;
  }

  /**
   * Central business logic for all order status changes.
   * All routes must use this function — never bypass it with raw DB updates.
   */
  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const existing = await this.getOrder(id);
    if (!existing) return undefined;

    const [o] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();

    // Fix 1: Deduct stock at "confirmed" — works for both orderItems-based and single-product orders
    if (status === "confirmed" && existing.status !== "confirmed" && !existing.stockDeducted) {
      const items = await this.getOrderItems(id);
      if (items.length > 0) {
        // Multi-item or admin-created order
        for (const item of items) {
          if (!item.productId) continue;
          // If this item has a linked phone unit, mark it sold instead of adjustStock
          if ((item as any).phoneUnitId) {
            // Validate unit is still available before selling (prevent duplicate IMEI sale)
            const unitToSell = await db.select().from(phoneUnits).where(eq(phoneUnits.id, (item as any).phoneUnitId)).limit(1);
            if (unitToSell[0] && unitToSell[0].status !== "available") {
              throw new Error(`وحدة الهاتف IMEI ${unitToSell[0].imei} غير متاحة للبيع — الحالة الحالية: ${unitToSell[0].status}`);
            }
            await this.updatePhoneUnit((item as any).phoneUnitId, { status: "sold", soldOrderId: id });
            await this.syncPhoneStock(item.productId);
          } else {
            await this.adjustStock(
              item.productId,
              item.quantity,
              "order_out",
              "order",
              id,
              `طلب مؤكد: ${existing.customerName}`,
            );
          }
        }
      } else if (existing.productId) {
        // CRITICAL FIX 3: Storefront single-product phone order — auto-assign a real phone_unit
        const product = await this.getProduct(existing.productId);
        const isPhone = product?.productType === "phone" || product?.productType === "tablet";
        const availableUnit = isPhone
          ? (await db.select().from(phoneUnits)
              .where(and(eq(phoneUnits.productId, existing.productId), eq(phoneUnits.status, "available")))
              .limit(1))[0]
          : undefined;

        if (isPhone && availableUnit) {
          // Lock this specific IMEI unit and mark it sold
          await this.updatePhoneUnit(availableUnit.id, { status: "sold", soldOrderId: id });
          // Save the phoneUnitId on the order for future reference (returns, etc.)
          await db.update(orders).set({ phoneUnitId: availableUnit.id }).where(eq(orders.id, id));
          await this.syncPhoneStock(existing.productId);
        } else {
          // Non-IMEI product or phone with no tracked units — fallback to quantity adjustment
          await this.adjustStock(
            existing.productId,
            existing.quantity ?? 1,
            "order_out",
            "order",
            id,
            `طلب مؤكد: ${existing.customerName}`,
          );
        }
      }
      await db.update(orders).set({ stockDeducted: true }).where(eq(orders.id, id));
    }

    // Safety net: deduct stock at "delivered" if it was never deducted
    if (status === "delivered" && existing.status !== "delivered") {
      if (!existing.stockDeducted) {
        const items = await this.getOrderItems(id);
        if (items.length > 0) {
          for (const item of items) {
            if (item.productId) {
              await this.adjustStock(item.productId, item.quantity, "order_out", "order", id, `طلب مسلَّم: ${existing.customerName}`);
            }
          }
        } else if (existing.productId) {
          const product = await this.getProduct(existing.productId);
          const isPhone = product?.productType === "phone" || product?.productType === "tablet";
          const alreadyLinked = (existing as any).phoneUnitId;
          if (isPhone && !alreadyLinked) {
            const availableUnit = (await db.select().from(phoneUnits)
              .where(and(eq(phoneUnits.productId, existing.productId), eq(phoneUnits.status, "available")))
              .limit(1))[0];
            if (availableUnit) {
              await this.updatePhoneUnit(availableUnit.id, { status: "sold", soldOrderId: id });
              await db.update(orders).set({ phoneUnitId: availableUnit.id }).where(eq(orders.id, id));
              await this.syncPhoneStock(existing.productId);
            } else {
              await this.adjustStock(existing.productId, existing.quantity ?? 1, "order_out", "order", id, `طلب مسلَّم: ${existing.customerName}`);
            }
          } else {
            await this.adjustStock(existing.productId, existing.quantity ?? 1, "order_out", "order", id, `طلب مسلَّم: ${existing.customerName}`);
          }
        }
        await db.update(orders).set({ stockDeducted: true }).where(eq(orders.id, id));
      }
      // No profit snapshot at delivered — profit is recorded at "paid"
    }

    // "paid" → create profit snapshot + mark payment as paid
    if (status === "paid" && existing.status !== "paid") {
      // Safety net: ensure stock is deducted if somehow it wasn't
      if (!existing.stockDeducted) {
        const items = await this.getOrderItems(id);
        if (items.length > 0) {
          for (const item of items) {
            if (!item.productId) continue;
            if ((item as any).phoneUnitId) {
              await this.updatePhoneUnit((item as any).phoneUnitId, { status: "sold", soldOrderId: id });
              await this.syncPhoneStock(item.productId);
            } else {
              await this.adjustStock(item.productId, item.quantity, "order_out", "order", id, `طلب مدفوع: ${existing.customerName}`);
            }
          }
        } else if (existing.productId) {
          await this.adjustStock(existing.productId, existing.quantity ?? 1, "order_out", "order", id, `طلب مدفوع: ${existing.customerName}`);
        }
        await db.update(orders).set({ stockDeducted: true }).where(eq(orders.id, id));
      }
      await this.createProfitSnapshotForOrder(id);
      await db.update(orders).set({ paymentStatus: "paid" }).where(eq(orders.id, id));
    }

    // "returned" → restore stock automatically (always sellable) + mark as refunded
    if (status === "returned" && existing.status !== "returned") {
      if (existing.stockDeducted) {
        const items = await this.getOrderItems(id);
        if (items.length > 0) {
          for (const item of items) {
            if (!item.productId) continue;
            if ((item as any).phoneUnitId) {
              await this.updatePhoneUnit((item as any).phoneUnitId, { status: "available", soldOrderId: null });
              await this.syncPhoneStock(item.productId);
            } else {
              await this.adjustStock(
                item.productId,
                item.quantity,
                "return_in",
                "order_cancelled",
                id,
                `مرتجع: ${existing.customerName}`,
              );
            }
          }
        } else if (existing.productId) {
          const linkedUnitId = (existing as any).phoneUnitId;
          if (linkedUnitId) {
            await this.updatePhoneUnit(linkedUnitId, { status: "available", soldOrderId: null });
            await this.syncPhoneStock(existing.productId);
          } else {
            await this.adjustStock(
              existing.productId,
              existing.quantity ?? 1,
              "return_in",
              "order_cancelled",
              id,
              `مرتجع: ${existing.customerName}`,
            );
          }
        }
        await db.update(orders).set({ stockDeducted: false, stockRestored: true, paymentStatus: "refunded" }).where(eq(orders.id, id));
      }
      // Reverse profit record so dashboard revenue/profit correctly decrease on return
      await db.delete(profitRecords).where(eq(profitRecords.orderId, id));
    }

    return o;
  }

  private async createProfitSnapshotForOrder(orderId: string): Promise<void> {
    try {
      const existing = await this.getProfitRecord(orderId);
      if (existing) return;

      const order = await this.getOrder(orderId);
      if (!order) return;

      const items = await this.getOrderItems(orderId);

      // Revenue = product sale only (subtotal), delivery fee is a pass-through cost to shipper
      const totalCollected = parseFloat(order.total as string) || 0;
      const deliveryCost = parseFloat(order.deliveryPrice as string) || 0;
      const revenue = totalCollected - deliveryCost;

      // Product cost from orderItems snapshot; fallback for single-product orders
      let productCost = items.reduce(
        (sum, i) => sum + (parseFloat(i.costPrice as string) || 0) * i.quantity,
        0,
      );
      // Fallback: if no order_items, use product's current cost price
      if (items.length === 0 && order.productId) {
        const product = await this.getProduct(order.productId);
        if (product) {
          productCost = (parseFloat(product.costPrice as string) || 0) * (order.quantity ?? 1);
        }
      }

      // Related expenses linked to this order
      const allExpenses = await this.getExpenses();
      const orderExpenses = allExpenses
        .filter(e => e.relatedOrderId === orderId)
        .reduce((sum, e) => sum + (parseFloat(e.amount as string) || 0), 0);

      const grossProfit = revenue - productCost;
      const netProfit = grossProfit - orderExpenses;

      // Resolve partner from the purchase linked to the first item's product
      let resolvedPartnerId: string | null = null;
      let resolvedPartnerName: string | null = null;
      let resolvedPartnerPct: number = 33.33; // default fallback

      // Try to find the purchase that supplied the products in this order
      const allPurchases = await this.getPurchases();
      const productIds = items.length > 0
        ? items.map(i => i.productId).filter(Boolean)
        : order.productId ? [order.productId] : [];

      if (productIds.length > 0) {
        // Find most recent purchase containing any of these products that has a partner
        const purchasesWithPartner = allPurchases.filter(p => p.partnerId && p.partnerName);
        for (const pur of purchasesWithPartner.reverse()) {
          const purItems = await this.getPurchaseItems(pur.id);
          const hasMatch = purItems.some(pi => pi.productId && productIds.includes(pi.productId));
          if (hasMatch) {
            resolvedPartnerId = pur.partnerId ?? null;
            resolvedPartnerName = pur.partnerName ?? null;
            resolvedPartnerPct = parseFloat(pur.partnerPercentage as string) || 33.33;
            break;
          }
        }
      }

      const partnerShare = netProfit * (resolvedPartnerPct / 100);
      const ownerShare = netProfit * (1 - resolvedPartnerPct / 100);

      await this.createProfitRecord({
        orderId,
        revenue: revenue.toFixed(2),
        productCost: productCost.toFixed(2),
        allocatedExpenses: orderExpenses.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        netProfit: netProfit.toFixed(2),
        partnerShare: partnerShare.toFixed(2),
        ownerShare: ownerShare.toFixed(2),
        partnerId: resolvedPartnerId,
        partnerName: resolvedPartnerName,
        partnerPercentage: resolvedPartnerPct.toFixed(2),
      });
    } catch (e) {
      console.error("[profit] Failed to create profit snapshot:", e);
    }
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const { id: _id, createdAt: _c, ...safeUpdates } = updates as any;
    const [o] = await db.update(orders).set(safeUpdates).where(eq(orders.id, id)).returning();
    return o;
  }

  async assignOrder(id: string, confirmateurId: string, confirmateurName: string): Promise<Order | undefined> {
    const [o] = await db.update(orders)
      .set({ assignedTo: confirmateurId, confirmateurName })
      .where(eq(orders.id, id))
      .returning();
    return o;
  }

  async deleteOrder(id: string): Promise<boolean> {
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    const result = await db.delete(orders).where(eq(orders.id, id)).returning();
    return result.length > 0;
  }

  async getOrderCounts(): Promise<Record<string, number>> {
    const allOrders = await db.select({ status: orders.status }).from(orders);
    const counts: Record<string, number> = { all: allOrders.length };
    for (const { status } of allOrders) {
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }

  // ============ EXPENSES ============

  async getExpenses(): Promise<Expense[]> {
    const rows = await db.select().from(expenses);
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [e] = await db.select().from(expenses).where(eq(expenses.id, id));
    return e;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = `exp-${randomUUID()}`;
    const [e] = await db.insert(expenses).values({ ...expense, id }).returning();
    return e;
  }

  async updateExpense(id: string, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [e] = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return e;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  // ============ PROFIT ============

  async getProfitRecords(): Promise<ProfitRecord[]> {
    const rows = await db.select().from(profitRecords);
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getProfitRecord(orderId: string): Promise<ProfitRecord | undefined> {
    const [p] = await db.select().from(profitRecords).where(eq(profitRecords.orderId, orderId));
    return p;
  }

  async createProfitRecord(record: InsertProfitRecord): Promise<ProfitRecord> {
    const id = `prof-${randomUUID()}`;
    const [p] = await db.insert(profitRecords).values({ ...record, id }).returning();
    return p;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      allProducts,
      allOrders,
      allProfitRecords,
      recentOrders,
      recentMovements,
      recentPurchases,
      allExpenses,
      allServiceSales,
    ] = await Promise.all([
      db.select({ id: products.id, stock: products.stock, minStock: products.minStock, name: products.name,
        price: products.price, costPrice: products.costPrice, image: products.image,
        category: products.category, featured: products.featured, published: products.published,
        condition: products.condition, productType: products.productType }).from(products),
      db.select({ status: orders.status, total: orders.total, createdAt: orders.createdAt }).from(orders),
      db.select({
        id: profitRecords.id,
        orderId: profitRecords.orderId,
        revenue: profitRecords.revenue,
        productCost: profitRecords.productCost,
        netProfit: profitRecords.netProfit,
        createdAt: profitRecords.createdAt,
      }).from(profitRecords),
      db.select({
        id: orders.id, customerName: orders.customerName, customerPhone: orders.customerPhone,
        total: orders.total, status: orders.status, wilaya: orders.wilaya,
        source: orders.source, createdAt: orders.createdAt,
      }).from(orders).orderBy(desc(orders.createdAt)).limit(5),
      db.select({
        id: inventoryMovements.id, productName: inventoryMovements.productName,
        type: inventoryMovements.type, quantity: inventoryMovements.quantity,
        reference: inventoryMovements.reference, createdAt: inventoryMovements.createdAt,
      }).from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(8),
      db.select({
        id: purchases.id, supplierName: purchases.supplierName,
        total: purchases.total, status: purchases.status, createdAt: purchases.createdAt,
      }).from(purchases).orderBy(desc(purchases.createdAt)).limit(5),
      db.select().from(expenses),
      db.select({ id: serviceSales.id, amount: serviceSales.amount, createdAt: serviceSales.createdAt }).from(serviceSales),
    ]);

    const totalProducts = allProducts.length;
    const lowStockProducts = allProducts.filter(p => p.stock <= (p.minStock ?? 3));
    const lowStockCount = lowStockProducts.length;
    const newOrdersCount = allOrders.filter(o => o.status === "new").length;

    // Revenue = product sales + service sales (delivery fees excluded)
    const productRevenue = allProfitRecords.reduce((sum, r) => sum + parseFloat(r.revenue as string || "0"), 0);
    const serviceRevenue = allServiceSales.reduce((sum, s) => sum + parseFloat(s.amount as string || "0"), 0);
    const totalRevenue = productRevenue + serviceRevenue;

    // General expenses (not linked to a specific order) must be deducted from total profit
    const generalExpenses = allExpenses.filter(e => !e.relatedOrderId);
    const generalExpensesTotal = generalExpenses.reduce((sum, e) => sum + parseFloat(e.amount as string || "0"), 0);

    // Service sales are 100% margin (cost=0), so they count fully as net profit
    const grossNetProfit = allProfitRecords.reduce((sum, p) => sum + parseFloat(p.netProfit as string || "0"), 0) + serviceRevenue;
    const netProfit = grossNetProfit - generalExpensesTotal;
    const partnerShare = netProfit * 0.3333;
    const ownerShare = netProfit * 0.6667;

    const fullLowStock = await this.getLowStockProducts(5);

    // Build monthly revenue chart data (last 6 months)
    // Use profit records for revenue so delivery fees are excluded (revenue already = total - deliveryPrice)
    const monthlyMap: Record<string, { revenue: number; profit: number }> = {};
    for (const p of allProfitRecords) {
      const d = new Date(p.createdAt!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, profit: 0 };
      monthlyMap[key].revenue += parseFloat(p.revenue as string || "0");  // delivery excluded
      monthlyMap[key].profit  += parseFloat(p.netProfit as string || "0");
    }
    // Include service sales in monthly revenue + profit (100% margin)
    for (const s of allServiceSales) {
      const d = new Date(s.createdAt!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, profit: 0 };
      const amt = parseFloat(s.amount as string || "0");
      monthlyMap[key].revenue += amt;
      monthlyMap[key].profit  += amt;
    }
    // Deduct general expenses from their respective month's profit
    for (const e of generalExpenses) {
      const d = new Date(e.expenseDate ?? e.createdAt!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, profit: 0 };
      monthlyMap[key].profit -= parseFloat(e.amount as string || "0");
    }
    const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    const monthlyRevenue = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({
        month: MONTH_NAMES_AR[parseInt(key.split("-")[1]) - 1],
        revenue: Math.round(v.revenue),
        profit: Math.round(v.profit),
      }));

    // Fix 7: Use real top products data instead of empty array
    const topProductsData = await this.getTopProductsReport();
    const topProducts = topProductsData.slice(0, 5).map(r => ({
      productName: r.productName,
      count: r.qtySold,
      revenue: r.revenue,
    }));

    const totalClientCredit = await this.getTotalActiveClientCredit();

    return {
      totalProducts,
      lowStockCount,
      newOrdersCount,
      totalRevenue,
      netProfit,
      partnerShare,
      ownerShare,
      totalClientCredit,
      recentOrders,
      lowStockProducts: fullLowStock.slice(0, 5),
      recentMovements,
      recentPurchases,
      topProducts,
      monthlyRevenue,
    };
  }

  // ============ PRODUCT VARIANTS ============

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    const rows = await db.select().from(productVariants).where(eq(productVariants.productId, productId));
    return rows.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createProductVariant(data: InsertProductVariant): Promise<ProductVariant> {
    const id = `var-${randomUUID()}`;
    const [v] = await db.insert(productVariants).values({ ...data, id }).returning();
    return v;
  }

  async updateProductVariant(id: string, data: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const [v] = await db.update(productVariants).set(data).where(eq(productVariants.id, id)).returning();
    return v;
  }

  async deleteProductVariant(id: string): Promise<boolean> {
    const result = await db.delete(productVariants).where(eq(productVariants.id, id)).returning();
    return result.length > 0;
  }

  // ============ REPORTS ============

  async getTopProductsReport(from?: Date, to?: Date): Promise<TopProductRow[]> {
    let query = db.select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      qtySold: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.total})::numeric`,
      cost: sql<number>`sum(${orderItems.costPrice} * ${orderItems.quantity})::numeric`,
    }).from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id));

    const conditions: any[] = [eq(orders.status, "delivered")];
    if (from) conditions.push(gte(orders.createdAt, from));
    if (to) conditions.push(lte(orders.createdAt, to));

    const rows = await (query as any).where(and(...conditions))
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(sql`sum(${orderItems.total}) desc`)
      .limit(50);

    return rows.map((r: any) => {
      const revenue = parseFloat(r.revenue || "0");
      const cost = parseFloat(r.cost || "0");
      const margin = revenue - cost;
      const marginPct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
      return { productId: r.productId, productName: r.productName, qtySold: r.qtySold, revenue, cost, margin, marginPct };
    });
  }

  // ============ CUSTOMERS ============

  async getCustomers(): Promise<CustomerSummary[]> {
    // Fix 6: All orders (for count), but totalSpent only from delivered orders
    const allRows = await db.select({
      phone: orders.customerPhone,
      name: orders.customerName,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      wilaya: orders.wilaya,
    }).from(orders);

    const VALID_SPENT_STATUSES = ["paid"];
    const NON_COUNTED_STATUSES = ["returned"];

    const phoneMap = new Map<string, CustomerSummary>();
    for (const r of allRows) {
      if (!phoneMap.has(r.phone)) {
        phoneMap.set(r.phone, {
          phone: r.phone,
          name: r.name,
          orderCount: NON_COUNTED_STATUSES.includes(r.status) ? 0 : 1,
          totalSpent: VALID_SPENT_STATUSES.includes(r.status) ? (parseFloat(r.total as string) || 0) : 0,
          lastOrderDate: r.createdAt?.toISOString() ?? "",
          wilaya: r.wilaya,
        });
      } else {
        const existing = phoneMap.get(r.phone)!;
        if (!NON_COUNTED_STATUSES.includes(r.status)) existing.orderCount++;
        if (VALID_SPENT_STATUSES.includes(r.status)) existing.totalSpent += parseFloat(r.total as string) || 0;
        const rowDate = r.createdAt?.toISOString() ?? "";
        if (rowDate > existing.lastOrderDate) {
          existing.lastOrderDate = rowDate;
          existing.wilaya = r.wilaya;
        }
      }
    }

    return Array.from(phoneMap.values())
      .filter(c => c.orderCount > 0 || c.totalSpent > 0)
      .sort((a, b) => b.orderCount - a.orderCount);
  }

  async getCustomerOrders(phone: string): Promise<Order[]> {
    const rows = await db.select().from(orders).where(eq(orders.customerPhone, phone));
    return rows.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // ============ LEGACY / SETTINGS ============

  async getBlockedIps(): Promise<BlockedIp[]> {
    return db.select().from(blockedIps).orderBy(blockedIps.createdAt);
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    const [row] = await db.select().from(blockedIps).where(eq(blockedIps.ip, ip));
    return !!row;
  }

  async blockIp(ip: string, reason?: string): Promise<BlockedIp> {
    const [row] = await db.insert(blockedIps).values({ id: randomUUID(), ip, reason: reason || null }).onConflictDoNothing().returning();
    if (!row) {
      const [existing] = await db.select().from(blockedIps).where(eq(blockedIps.ip, ip));
      return existing;
    }
    return row;
  }

  async unblockIp(id: string): Promise<boolean> {
    const result = await db.delete(blockedIps).where(eq(blockedIps.id, id)).returning();
    return result.length > 0;
  }

  async getAbandonedCarts(): Promise<AbandonedCart[]> {
    return db.select().from(abandonedCarts).orderBy(abandonedCarts.createdAt);
  }

  async createAbandonedCart(data: InsertAbandonedCart): Promise<AbandonedCart> {
    const [row] = await db.insert(abandonedCarts).values({ id: randomUUID(), ...data }).returning();
    return row;
  }

  async deleteAbandonedCart(id: string): Promise<boolean> {
    const result = await db.delete(abandonedCarts).where(eq(abandonedCarts.id, id)).returning();
    return result.length > 0;
  }

  async getSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(appSettings);
    const result: Record<string, string> = {};
    for (const row of rows) result[row.key] = row.value;
    if (!result.deliveryPrices) result.deliveryPrices = JSON.stringify(DEFAULT_DELIVERY_PRICES);
    return result;
  }

  async updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(settings)) {
      await db.insert(appSettings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
    }
    return this.getSettings();
  }

  async getDeliveryCompanies(): Promise<DeliveryCompany[]> {
    return db.select().from(deliveryCompanies);
  }

  async upsertDeliveryCompany(slug: string, data: Partial<DeliveryCompany>): Promise<DeliveryCompany> {
    const [result] = await db.insert(deliveryCompanies)
      .values({ slug, enabled: false, ...data })
      .onConflictDoUpdate({ target: deliveryCompanies.slug, set: { ...data, updatedAt: new Date() } })
      .returning();
    return result;
  }

  // ============ DELIVERY RETURNS ============

  async processDeliveryReturn(orderId: string, condition: string, reason: string, notes?: string): Promise<Order | undefined> {
    const existing = await this.getOrder(orderId);
    if (!existing) return undefined;

    // Prevent duplicate restocking
    const alreadyRestored = (existing as any).stockRestored;
    if (alreadyRestored) {
      // Just update the status/notes without restocking again
      const [o] = await db.update(orders)
        .set({ status: "returned_by_delivery", returnReason: reason, returnCondition: condition, returnNotes: notes ?? null, returnAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();
      return o;
    }

    // Update order with return info
    const [o] = await db.update(orders)
      .set({
        status: "returned_by_delivery",
        returnReason: reason,
        returnCondition: condition,
        returnNotes: notes ?? null,
        returnAt: new Date(),
        stockRestored: condition === "sellable",
      })
      .where(eq(orders.id, orderId))
      .returning();

    // CRITICAL FIX 2: Restore stock AND phone_unit status for sellable returns
    if (condition === "sellable" && existing.stockDeducted) {
      const items = await this.getOrderItems(orderId);
      if (items.length > 0) {
        for (const item of items) {
          if (!item.productId) continue;
          const itemAny = item as any;
          if (itemAny.phoneUnitId) {
            // Restore the exact IMEI unit back to available — this is the source of truth
            await this.updatePhoneUnit(itemAny.phoneUnitId, { status: "available", soldOrderId: null });
            await this.syncPhoneStock(item.productId);
          } else {
            // Non-IMEI item: restore via adjustStock
            await this.adjustStock(
              item.productId,
              item.quantity,
              "return_in",
              "delivery_return",
              orderId,
              `مرتجع توصيل قابل للبيع - ${reason} — ${existing.customerName}`,
            );
          }
        }
      } else if (existing.productId) {
        // Single-product storefront order — check if it has a linked phone unit
        const linkedUnitId = (existing as any).phoneUnitId;
        if (linkedUnitId) {
          await this.updatePhoneUnit(linkedUnitId, { status: "available", soldOrderId: null });
          await this.syncPhoneStock(existing.productId);
        } else {
          // No IMEI unit linked — restore stock quantity
          await this.adjustStock(
            existing.productId,
            existing.quantity ?? 1,
            "return_in",
            "delivery_return",
            orderId,
            `مرتجع توصيل قابل للبيع - ${reason} — ${existing.customerName}`,
          );
        }
      }
    }
    // Fix 8: For damaged/inspection, just add an informational note movement (no quantity=0)
    // The product was already removed from stock when the order was confirmed.
    // No stock adjustment is needed — just log it once as a note.
    else if ((condition === "damaged" || condition === "inspection") && existing.stockDeducted) {
      const label = condition === "damaged" ? "تالف" : "تحت الفحص";
      const items = await this.getOrderItems(orderId);
      const productId = items[0]?.productId ?? existing.productId;
      const productName = items[0]?.productName ?? existing.productName ?? "منتج";
      if (productId) {
        await this.createInventoryMovement({
          productId,
          productName,
          type: "note",
          quantity: 0,
          reference: "delivery_return",
          referenceId: orderId,
          notes: `مرتجع ${label} (لا يُعاد للمخزون) - ${reason} — ${existing.customerName}`,
        });
      }
    }

    return o;
  }

  // ============ AFTER-SALE RECORDS ============

  async getAfterSaleRecords(): Promise<AfterSaleRecord[]> {
    return db.select().from(afterSaleRecords).orderBy(desc(afterSaleRecords.createdAt));
  }

  async createAfterSaleRecord(data: InsertAfterSale): Promise<AfterSaleRecord> {
    const [row] = await db.insert(afterSaleRecords).values({ id: `asr-${randomUUID()}`, ...data }).returning();
    return row;
  }

  async updateAfterSaleRecord(id: string, data: Partial<InsertAfterSale>): Promise<AfterSaleRecord | undefined> {
    const [row] = await db.update(afterSaleRecords).set(data).where(eq(afterSaleRecords.id, id)).returning();
    return row;
  }

  async deleteAfterSaleRecord(id: string): Promise<boolean> {
    const result = await db.delete(afterSaleRecords).where(eq(afterSaleRecords.id, id)).returning();
    return result.length > 0;
  }

  // ============ STOCK VALUE ============

  async getStockValue(): Promise<{ totalValue: number; byProduct: { productId: string; productName: string; stock: number; costPrice: number; value: number }[] }> {
    const allProducts = await db.select().from(products);
    const byProduct = allProducts
      .filter(p => p.stock > 0)
      .map(p => {
        const costPrice = parseFloat(p.costPrice as string) || 0;
        const value = costPrice * p.stock;
        return { productId: p.id, productName: p.name, stock: p.stock, costPrice, value };
      })
      .sort((a, b) => b.value - a.value);

    const totalValue = byProduct.reduce((sum, p) => sum + p.value, 0);
    return { totalValue, byProduct };
  }

  // ============ INVOICE TEMPLATES ============

  async getInvoiceTemplates(): Promise<InvoiceTemplate[]> {
    return db.select().from(invoiceTemplates).orderBy(invoiceTemplates.isDefault, invoiceTemplates.categoryName);
  }

  async getInvoiceTemplate(id: string): Promise<InvoiceTemplate | undefined> {
    const [row] = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.id, id));
    return row;
  }

  async getInvoiceTemplateByCategoryId(categoryId: string | null): Promise<InvoiceTemplate | undefined> {
    if (categoryId) {
      const [row] = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.categoryId, categoryId));
      if (row) return row;
    }
    // Fallback to default template
    const [def] = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.isDefault, true));
    return def;
  }

  async createInvoiceTemplate(data: InsertInvoiceTemplate): Promise<InvoiceTemplate> {
    const [row] = await db.insert(invoiceTemplates).values({ ...data, id: randomUUID() }).returning();
    return row;
  }

  async updateInvoiceTemplate(id: string, data: Partial<InsertInvoiceTemplate>): Promise<InvoiceTemplate | undefined> {
    const [row] = await db.update(invoiceTemplates).set(data).where(eq(invoiceTemplates.id, id)).returning();
    return row;
  }

  async deleteInvoiceTemplate(id: string): Promise<boolean> {
    const result = await db.delete(invoiceTemplates).where(eq(invoiceTemplates.id, id)).returning();
    return result.length > 0;
  }

  // ── Purchase Payments (Versements) ──────────────────────────────────────────
  async getPurchasePayments(purchaseId: string): Promise<PurchasePayment[]> {
    return db.select().from(purchasePayments)
      .where(eq(purchasePayments.purchaseId, purchaseId))
      .orderBy(desc(purchasePayments.paymentDate));
  }
  async getAllPurchasePaymentsSummary(): Promise<{ purchaseId: string; totalPaid: number; totalReturned: number }[]> {
    const payRows = await db
      .select({
        purchaseId: purchasePayments.purchaseId,
        totalPaid: sql<number>`coalesce(sum(${purchasePayments.amount}::numeric), 0)`,
      })
      .from(purchasePayments)
      .groupBy(purchasePayments.purchaseId);

    const retRows = await db
      .select({
        purchaseId: supplierReturns.purchaseId,
        totalReturned: sql<number>`coalesce(sum(${supplierReturns.totalValue}::numeric), 0)`,
      })
      .from(supplierReturns)
      .where(eq(supplierReturns.status, "completed"))
      .groupBy(supplierReturns.purchaseId);

    // Merge both sets (a purchase may have returns but no payments or vice-versa)
    const paidById: Record<string, number> = {};
    for (const r of payRows) paidById[r.purchaseId] = Number(r.totalPaid);

    const returnedById: Record<string, number> = {};
    for (const r of retRows) returnedById[r.purchaseId] = Number(r.totalReturned);

    const allIds = new Set([...Object.keys(paidById), ...Object.keys(returnedById)]);
    return Array.from(allIds).map(purchaseId => ({
      purchaseId,
      totalPaid: paidById[purchaseId] ?? 0,
      totalReturned: returnedById[purchaseId] ?? 0,
    }));
  }
  async createPurchasePayment(data: InsertPurchasePayment): Promise<PurchasePayment> {
    const id = randomUUID();
    const [r] = await db.insert(purchasePayments).values({ id, ...data }).returning();
    return r;
  }
  async deletePurchasePayment(id: string): Promise<boolean> {
    const result = await db.delete(purchasePayments).where(eq(purchasePayments.id, id)).returning();
    return result.length > 0;
  }

  // ── Partners ────────────────────────────────────────────────────────────────
  async getPartners(): Promise<Partner[]> {
    return db.select().from(partners).orderBy(desc(partners.createdAt));
  }
  async getPartner(id: string): Promise<Partner | undefined> {
    const [r] = await db.select().from(partners).where(eq(partners.id, id));
    return r;
  }
  async createPartner(data: InsertPartner): Promise<Partner> {
    const id = randomUUID();
    const [r] = await db.insert(partners).values({ id, ...data }).returning();
    return r;
  }
  async updatePartner(id: string, data: Partial<InsertPartner>): Promise<Partner | undefined> {
    const [r] = await db.update(partners).set(data).where(eq(partners.id, id)).returning();
    return r;
  }
  async deletePartner(id: string): Promise<boolean> {
    const result = await db.delete(partners).where(eq(partners.id, id)).returning();
    return result.length > 0;
  }

  // ── Supplier Returns / Exchanges ─────────────────────────────────────────────
  async getSupplierReturns(): Promise<SupplierReturn[]> {
    return db.select().from(supplierReturns).orderBy(desc(supplierReturns.createdAt));
  }
  async getSupplierReturn(id: string): Promise<SupplierReturn | undefined> {
    const [r] = await db.select().from(supplierReturns).where(eq(supplierReturns.id, id));
    return r;
  }
  async getSupplierReturnsByPurchase(purchaseId: string): Promise<SupplierReturn[]> {
    return db.select().from(supplierReturns).where(eq(supplierReturns.purchaseId, purchaseId)).orderBy(desc(supplierReturns.createdAt));
  }
  async getSupplierReturnsBySupplier(supplierId: string): Promise<SupplierReturn[]> {
    return db.select().from(supplierReturns).where(eq(supplierReturns.supplierId, supplierId)).orderBy(desc(supplierReturns.createdAt));
  }
  async createSupplierReturn(data: InsertSupplierReturn): Promise<SupplierReturn> {
    const id = `sret-${randomUUID()}`;
    const [r] = await db.insert(supplierReturns).values({ ...data, id }).returning();
    return r;
  }

  async applySupplierReturn(id: string): Promise<SupplierReturn> {
    const ret = await this.getSupplierReturn(id);
    if (!ret) throw new Error("Retour introuvable");
    if (ret.status === "cancelled") throw new Error("Retour annulé, impossible de l'appliquer");
    if (ret.stockApplied && ret.balanceApplied) {
      await db.update(supplierReturns).set({ status: "completed" }).where(eq(supplierReturns.id, id));
      const [updated] = await db.select().from(supplierReturns).where(eq(supplierReturns.id, id));
      return updated;
    }

    // ── Apply stock effects ──────────────────────────────────────────────────
    if (!ret.stockApplied) {
      if (ret.phoneUnitId) {
        // IMEI-based: mark phone unit as returned_to_supplier
        await this.updatePhoneUnit(ret.phoneUnitId, { status: "returned_to_supplier" } as any);
        if (ret.productId) await this.syncPhoneStock(ret.productId);
        // inventory movement for IMEI return
        if (ret.productId) {
          await this.createInventoryMovement({
            productId: ret.productId,
            productName: ret.productName,
            type: "supplier_return_out",
            quantity: ret.quantity,
            reference: "supplier_return",
            referenceId: id,
            notes: `Retour fournisseur IMEI: ${ret.imei ?? ""} — ${ret.supplierName}`,
          });
        }
      } else if (ret.productId) {
        // Normal stock: reduce by returned quantity
        await this.adjustStock(ret.productId, ret.quantity, "supplier_return_out", "supplier_return", id, `Retour fournisseur — ${ret.supplierName}`);
      }

      // Exchange: replacement item enters stock
      if (ret.type === "exchange" && ret.replacementProductId) {
        if (ret.replacementPhoneUnitId) {
          // Replacement is a phone unit: mark as available
          await this.updatePhoneUnit(ret.replacementPhoneUnitId, { status: "available", soldOrderId: null } as any);
          await this.syncPhoneStock(ret.replacementProductId);
          await this.createInventoryMovement({
            productId: ret.replacementProductId,
            productName: ret.replacementProductName ?? "",
            type: "exchange_in",
            quantity: ret.replacementQuantity ?? 1,
            reference: "supplier_exchange",
            referenceId: id,
            notes: `Échange fournisseur reçu IMEI: ${ret.replacementImei ?? ""} — ${ret.supplierName}`,
          });
        } else {
          await this.adjustStock(ret.replacementProductId, ret.replacementQuantity ?? 1, "exchange_in", "supplier_exchange", id, `Échange fournisseur reçu — ${ret.supplierName}`);
        }
      }
    }

    // ── Apply balance effects (reduce purchase total effectively) ────────────
    // We track balance via supplierReturns.totalValue — no direct field on purchases to modify.
    // Balance is always computed on-the-fly from purchases + payments + returns.

    await db.update(supplierReturns).set({ status: "completed", stockApplied: true, balanceApplied: true }).where(eq(supplierReturns.id, id));
    const [updated] = await db.select().from(supplierReturns).where(eq(supplierReturns.id, id));
    return updated;
  }

  async cancelSupplierReturn(id: string): Promise<SupplierReturn> {
    const ret = await this.getSupplierReturn(id);
    if (!ret) throw new Error("Retour introuvable");
    if (ret.status === "cancelled") throw new Error("Déjà annulé");

    // Reverse stock effects if already applied
    if (ret.stockApplied) {
      if (ret.phoneUnitId) {
        // Re-mark phone unit as available
        await this.updatePhoneUnit(ret.phoneUnitId, { status: "available" } as any);
        if (ret.productId) await this.syncPhoneStock(ret.productId);
      } else if (ret.productId) {
        // Restore stock
        await this.adjustStock(ret.productId, ret.quantity, "adjustment", "supplier_return_cancel", id, `Annulation retour fournisseur — ${ret.supplierName}`);
      }
      // Reverse exchange replacement
      if (ret.type === "exchange" && ret.replacementProductId) {
        if (ret.replacementPhoneUnitId) {
          await this.updatePhoneUnit(ret.replacementPhoneUnitId, { status: "returned_to_supplier" } as any);
          await this.syncPhoneStock(ret.replacementProductId);
        } else {
          await this.adjustStock(ret.replacementProductId, ret.replacementQuantity ?? 1, "adjustment", "supplier_return_cancel", id, `Annulation échange fournisseur — ${ret.supplierName}`);
        }
      }
    }

    await db.update(supplierReturns).set({ status: "cancelled", stockApplied: false, balanceApplied: false }).where(eq(supplierReturns.id, id));
    const [updated] = await db.select().from(supplierReturns).where(eq(supplierReturns.id, id));
    return updated;
  }

  async getPurchaseBalance(purchaseId: string): Promise<{ total: number; totalPaid: number; totalReturned: number; remaining: number; credit: number }> {
    const purchase = await this.getPurchase(purchaseId);
    const total = parseFloat((purchase?.total as string) ?? "0");
    const payments = await this.getPurchasePayments(purchaseId);
    const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount as string), 0);
    const rets = await db.select().from(supplierReturns)
      .where(and(eq(supplierReturns.purchaseId, purchaseId), eq(supplierReturns.status, "completed")));
    const totalReturned = rets.reduce((s, r) => s + parseFloat(r.totalValue as string), 0);
    const net = total - totalPaid - totalReturned;
    return { total, totalPaid, totalReturned, remaining: Math.max(0, net), credit: net < 0 ? Math.abs(net) : 0 };
  }

  async getSupplierBalance(supplierId: string): Promise<{ totalPurchases: number; totalPaid: number; totalReturned: number; remaining: number; credit: number }> {
    const supplierPurchases = await db.select().from(purchases).where(eq(purchases.supplierId, supplierId));
    const totalPurchases = supplierPurchases.reduce((s, p) => s + parseFloat(p.total as string), 0);
    const allPayments = await db.select().from(purchasePayments)
      .where(sql`${purchasePayments.purchaseId} IN (SELECT id FROM purchases WHERE supplier_id = ${supplierId})`);
    const totalPaid = allPayments.reduce((s, p) => s + parseFloat(p.amount as string), 0);
    const allReturns = await db.select().from(supplierReturns)
      .where(and(eq(supplierReturns.supplierId, supplierId), eq(supplierReturns.status, "completed")));
    const totalReturned = allReturns.reduce((s, r) => s + parseFloat(r.totalValue as string), 0);
    const net = totalPurchases - totalPaid - totalReturned;
    return { totalPurchases, totalPaid, totalReturned, remaining: Math.max(0, net), credit: net < 0 ? Math.abs(net) : 0 };
  }

  // ── Operation History (Undo log) ─────────────────────────────────────────────
  async logOperation(data: InsertOperationHistory): Promise<OperationHistory> {
    const [r] = await db.insert(operationHistory).values(data).returning();
    return r;
  }

  async getRecentOperations(limit = 5): Promise<OperationHistory[]> {
    return db.select().from(operationHistory)
      .where(eq(operationHistory.isUndone, false))
      .orderBy(desc(operationHistory.createdAt))
      .limit(limit);
  }

  async getOperation(id: string): Promise<OperationHistory | undefined> {
    const [r] = await db.select().from(operationHistory).where(eq(operationHistory.id, id));
    return r;
  }

  async markOperationUndone(id: string): Promise<void> {
    await db.update(operationHistory)
      .set({ isUndone: true, undoneAt: new Date() })
      .where(eq(operationHistory.id, id));
  }

  async deleteProfitRecordByOrderId(orderId: string): Promise<void> {
    await db.delete(profitRecords).where(eq(profitRecords.orderId, orderId));
  }

  // ── Restore helpers (undo of delete operations) ──────────────────────────────
  async restoreExpense(data: any): Promise<void> {
    const { id, label, amount, category, notes, expenseDate, createdAt } = data;
    await db.insert(expenses).values({ id, label, amount, category, notes: notes ?? null, expenseDate: expenseDate ? new Date(expenseDate) : new Date(), createdAt: createdAt ? new Date(createdAt) : new Date() }).onConflictDoNothing();
  }
  async restoreCategory(data: any): Promise<void> {
    const { id, name, slug, icon, color, description, active, sortOrder } = data;
    await db.insert(categories).values({ id, name, slug, icon: icon ?? null, color: color ?? null, description: description ?? null, active: active ?? true, sortOrder: sortOrder ?? 0 }).onConflictDoNothing();
  }
  async restoreBrand(data: any): Promise<void> {
    const { id, name, slug, logo, active, createdAt } = data;
    await db.insert(brands).values({ id, name, slug, logo: logo ?? null, active: active ?? true, createdAt: createdAt ? new Date(createdAt) : new Date() }).onConflictDoNothing();
  }
  async restoreSupplier(data: any): Promise<void> {
    const { id, name, phone, email, address, notes, active, createdAt } = data;
    await db.insert(suppliers).values({ id, name, phone: phone ?? null, email: email ?? null, address: address ?? null, notes: notes ?? null, active: active ?? true, createdAt: createdAt ? new Date(createdAt) : new Date() }).onConflictDoNothing();
  }
  async restoreProduct(data: any): Promise<void> {
    const { id, name, description, slug, sku, price, costPrice, category, categoryId, brand, brandId, stock, published, featured, productType, specifications, sortOrder, createdAt } = data;
    await db.insert(products).values({ id, name, description: description ?? null, slug, sku: sku ?? null, price, costPrice, category: category ?? null, categoryId: categoryId ?? null, brand: brand ?? null, brandId: brandId ?? null, stock: stock ?? 0, published: published ?? false, featured: featured ?? false, productType: productType ?? "accessory", specifications: specifications ?? null, sortOrder: sortOrder ?? 0, image: null, images: null, createdAt: createdAt ? new Date(createdAt) : new Date() }).onConflictDoNothing();
  }
  async restoreAfterSaleRecord(data: any): Promise<void> {
    const { id, orderId, customerId, customerName, productId, productName, type, status, notes, warrantyExpiry, createdAt } = data;
    await db.insert(afterSaleRecords).values({ id, orderId: orderId ?? null, customerId: customerId ?? null, customerName, productId: productId ?? null, productName, type, status: status ?? "open", notes: notes ?? null, warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null, createdAt: createdAt ? new Date(createdAt) : new Date() }).onConflictDoNothing();
  }
  async restorePartner(data: any): Promise<void> {
    const { id, name, phone, email, sharePercentage, notes, active, createdAt } = data;
    await db.insert(partners).values({ id, name, phone: phone ?? null, email: email ?? null, sharePercentage, notes: notes ?? null, active: active ?? true, createdAt: createdAt ? new Date(createdAt) : new Date() }).onConflictDoNothing();
  }

  // ============ SERVICE SALES ============

  async getServiceSales(): Promise<ServiceSale[]> {
    return db.select().from(serviceSales).orderBy(desc(serviceSales.createdAt));
  }

  async getServiceSaleById(id: string): Promise<ServiceSale | undefined> {
    const [s] = await db.select().from(serviceSales).where(eq(serviceSales.id, id));
    return s;
  }

  async createServiceSale(data: InsertServiceSale): Promise<ServiceSale> {
    const id = `svc-${randomUUID()}`;
    const [s] = await db.insert(serviceSales).values({ ...data, id }).returning();
    return s;
  }

  async deleteServiceSale(id: string): Promise<boolean> {
    const result = await db.delete(serviceSales).where(eq(serviceSales.id, id)).returning();
    return result.length > 0;
  }

  // ============ PAYROLL ============

  async getEmployees(): Promise<Employee[]> {
    return db.select().from(employees).orderBy(employees.fullName);
  }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const [e] = await db.select().from(employees).where(eq(employees.id, id));
    return e;
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const id = `emp-${randomUUID()}`;
    const [e] = await db.insert(employees).values({ ...data, id }).returning();
    return e;
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [e] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return e;
  }

  async getSalaryAdvances(employeeId?: string, month?: number, year?: number): Promise<SalaryAdvance[]> {
    let q = db.select().from(salaryAdvances).$dynamic();
    const conditions = [];
    if (employeeId) conditions.push(eq(salaryAdvances.employeeId, employeeId));
    if (month !== undefined) conditions.push(eq(salaryAdvances.month, month));
    if (year !== undefined) conditions.push(eq(salaryAdvances.year, year));
    if (conditions.length) q = q.where(and(...conditions));
    return q.orderBy(desc(salaryAdvances.createdAt));
  }

  async createSalaryAdvance(data: InsertSalaryAdvance): Promise<SalaryAdvance> {
    const id = `adv-${randomUUID()}`;
    const [a] = await db.insert(salaryAdvances).values({ ...data, id }).returning();
    return a;
  }

  async deleteSalaryAdvance(id: string): Promise<boolean> {
    const result = await db.delete(salaryAdvances).where(eq(salaryAdvances.id, id)).returning();
    return result.length > 0;
  }

  async getSalaryPayments(employeeId?: string, month?: number, year?: number): Promise<SalaryPayment[]> {
    let q = db.select().from(salaryPayments).$dynamic();
    const conditions = [];
    if (employeeId) conditions.push(eq(salaryPayments.employeeId, employeeId));
    if (month !== undefined) conditions.push(eq(salaryPayments.month, month));
    if (year !== undefined) conditions.push(eq(salaryPayments.year, year));
    if (conditions.length) q = q.where(and(...conditions));
    return q.orderBy(desc(salaryPayments.createdAt));
  }

  async createSalaryPayment(data: InsertSalaryPayment): Promise<SalaryPayment> {
    const id = `pay-${randomUUID()}`;
    const [p] = await db.insert(salaryPayments).values({ ...data, id }).returning();
    return p;
  }

  async deleteSalaryPayment(id: string): Promise<boolean> {
    const result = await db.delete(salaryPayments).where(eq(salaryPayments.id, id)).returning();
    return result.length > 0;
  }

  // ============ CLIENT CREDIT ============

  async getClientCredits(): Promise<ClientCredit[]> {
    return db.select().from(clientCredits).orderBy(desc(clientCredits.createdAt));
  }

  async getClientCreditById(id: string): Promise<ClientCredit | undefined> {
    const [row] = await db.select().from(clientCredits).where(eq(clientCredits.id, id));
    return row;
  }

  async createClientCredit(data: InsertClientCredit): Promise<ClientCredit> {
    const id = randomUUID();
    const [row] = await db.insert(clientCredits).values({ ...data, id }).returning();
    return row;
  }

  async updateClientCredit(id: string, data: Partial<ClientCredit>): Promise<ClientCredit | undefined> {
    const [row] = await db.update(clientCredits).set({ ...data, updatedAt: new Date() }).where(eq(clientCredits.id, id)).returning();
    return row;
  }

  async getCreditVersements(creditId: string): Promise<CreditVersement[]> {
    return db.select().from(creditVersements).where(eq(creditVersements.creditId, creditId)).orderBy(desc(creditVersements.createdAt));
  }

  async createCreditVersement(data: InsertCreditVersement): Promise<CreditVersement> {
    const id = randomUUID();
    const [row] = await db.insert(creditVersements).values({ ...data, id }).returning();
    return row;
  }

  async deleteCreditVersement(id: string): Promise<boolean> {
    const result = await db.delete(creditVersements).where(eq(creditVersements.id, id)).returning();
    return result.length > 0;
  }

  async getTotalActiveClientCredit(): Promise<number> {
    try {
      const result = await db.select({ total: sql<string>`COALESCE(SUM(remaining_amount),0)` })
        .from(clientCredits)
        .where(sql`status NOT IN ('paid','cancelled')`);
      return parseFloat(result[0]?.total ?? "0");
    } catch {
      return 0;
    }
  }
}

async function seedDatabase() {
  await seedRoles();

  const existingAdmin = await db.select().from(users).where(eq(users.id, "user-admin"));
  if (existingAdmin.length > 0) {
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length === 0) {
      await seedCategoriesAndBrands();
    }
    // Ensure admin has roleId set
    if (!existingAdmin[0].roleId) {
      const adminRole = await db.select().from(roles).where(eq(roles.slug, "admin"));
      if (adminRole.length > 0) {
        await db.update(users).set({ roleId: adminRole[0].id }).where(eq(users.id, "user-admin"));
      }
    }
    return;
  }

  console.log("[db] Seeding database...");

  const adminRole = await db.select().from(roles).where(eq(roles.slug, "admin"));
  await db.insert(users).values({
    id: "user-admin", username: "admin",
    password: hashPassword("admin2026"),
    role: "admin", name: "المدير",
    roleId: adminRole.length > 0 ? adminRole[0].id : null,
    active: true,
  });

  await seedCategoriesAndBrands();

  console.log("[db] Database seeded ✓");
}

async function seedRoles() {
  const existing = await db.select().from(roles);
  if (existing.length > 0) return;

  const vendeurPerms = ["pos.view", "pos.sell", "pos.print", "orders.view", "orders.create"];
  const managerPerms = ALL_PERMISSIONS.filter(p => !p.startsWith("users.") && !p.startsWith("roles.") && p !== "settings.update");

  await db.insert(roles).values([
    { id: "role-admin", name: "Admin / Propriétaire", slug: "admin", permissions: JSON.stringify(ALL_PERMISSIONS), isSystem: true },
    { id: "role-vendeur", name: "Caissier / Vendeur", slug: "vendeur", permissions: JSON.stringify(vendeurPerms), isSystem: true },
    { id: "role-manager", name: "Manager", slug: "manager", permissions: JSON.stringify(managerPerms), isSystem: false },
  ]);
  console.log("[db] Default roles seeded ✓");
}

async function seedCategoriesAndBrands() {
  const existingCategories = await db.select().from(categories);
  if (existingCategories.length === 0) {
    await db.insert(categories).values([
      { id: "cat-newphone",  name: "هواتف جديدة",       slug: "new-phones",    icon: "Smartphone",      color: "#3b82f6", description: "أحدث الهواتف الذكية",          active: true, sortOrder: 1 },
      { id: "cat-usedphone", name: "هواتف مستعملة",     slug: "used-phones",   icon: "PhoneOff",        color: "#f59e0b", description: "هواتف مستعملة بحالة ممتازة",  active: true, sortOrder: 2 },
      { id: "cat-earphone",  name: "سماعات",             slug: "earphones",     icon: "Headphones",      color: "#8b5cf6", description: "سماعات لاسلكية وسلكية",       active: true, sortOrder: 3 },
      { id: "cat-charger",   name: "شواحن",              slug: "chargers",      icon: "Zap",             color: "#10b981", description: "شواحن أصلية وسريعة",          active: true, sortOrder: 4 },
      { id: "cat-cable",     name: "كابلات",             slug: "cables",        icon: "Cable",           color: "#ef4444", description: "كابلات USB وسريعة الشحن",     active: true, sortOrder: 5 },
      { id: "cat-case",      name: "حافظات",             slug: "cases",         icon: "Shield",          color: "#6366f1", description: "حافظات وحماية الهاتف",        active: true, sortOrder: 6 },
      { id: "cat-watch",     name: "ساعات ذكية",         slug: "smart-watches", icon: "Watch",           color: "#ec4899", description: "ساعات ذكية ورياضية",          active: true, sortOrder: 7 },
      { id: "cat-other",     name: "إكسسوارات أخرى",    slug: "other-acc",     icon: "MoreHorizontal",  color: "#6b7280", description: "إكسسوارات متنوعة",            active: true, sortOrder: 8 },
    ]);
  }

  const existingBrands = await db.select().from(brands);
  if (existingBrands.length === 0) {
    await db.insert(brands).values([
      { id: "brand-apple",   name: "Apple",   slug: "apple",   active: true },
      { id: "brand-samsung", name: "Samsung", slug: "samsung", active: true },
      { id: "brand-xiaomi",  name: "Xiaomi",  slug: "xiaomi",  active: true },
      { id: "brand-oppo",    name: "Oppo",    slug: "oppo",    active: true },
      { id: "brand-realme",  name: "Realme",  slug: "realme",  active: true },
      { id: "brand-huawei",  name: "Huawei",  slug: "huawei",  active: true },
      { id: "brand-other",   name: "أخرى",    slug: "other",   active: true },
    ]);
  }
}

export const storage = new DatabaseStorage();

seedDatabase().catch(console.error);
