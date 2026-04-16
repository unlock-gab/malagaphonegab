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
  DEFAULT_DELIVERY_PRICES,
  users, products, categories, brands, suppliers, purchases, purchaseItems,
  inventoryMovements, orders, orderItems, expenses, profitRecords,
  blockedIps, abandonedCarts, appSettings, deliveryCompanies, productVariants,
  afterSaleRecords, phoneUnits,
} from "@shared/schema";
import { randomUUID, createHash } from "crypto";
import { db } from "./db";
import { eq, getTableColumns, desc, sql, and, lt, gte, lte, ilike } from "drizzle-orm";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + "nova_store_salt_2026").digest("hex");
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

    return p;
  }

  async deletePurchase(id: string): Promise<boolean> {
    const existing = await this.getPurchase(id);
    // Fix 3: Reverse stock if this completed purchase had already applied stock
    if (existing && (existing as any).purchaseStockApplied) {
      const items = await this.getPurchaseItems(id);
      for (const item of items) {
        if (item.productId) {
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
        // Storefront single-product order (no order_items row)
        await this.adjustStock(
          existing.productId,
          existing.quantity ?? 1,
          "order_out",
          "order",
          id,
          `طلب مؤكد: ${existing.customerName}`,
        );
      }
      await db.update(orders).set({ stockDeducted: true }).where(eq(orders.id, id));
    }

    // Also deduct stock at "delivered" if somehow it was never deducted (e.g. order skipped "confirmed")
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
          await this.adjustStock(existing.productId, existing.quantity ?? 1, "order_out", "order", id, `طلب مسلَّم: ${existing.customerName}`);
        }
        await db.update(orders).set({ stockDeducted: true }).where(eq(orders.id, id));
      }
      await this.createProfitSnapshotForOrder(id);
    }

    // Fix 1: Restore stock at "cancelled" — same dual-path logic
    if (status === "cancelled" && existing.status !== "cancelled") {
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
                `إلغاء طلب: ${existing.customerName}`,
              );
            }
          }
        } else if (existing.productId) {
          await this.adjustStock(
            existing.productId,
            existing.quantity ?? 1,
            "return_in",
            "order_cancelled",
            id,
            `إلغاء طلب: ${existing.customerName}`,
          );
        }
        await db.update(orders).set({ stockDeducted: false }).where(eq(orders.id, id));
      }
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

      // Fix 5: Revenue = product sale only (subtotal), delivery fee is a pass-through cost to shipper
      const totalCollected = parseFloat(order.total as string) || 0;
      const deliveryCost = parseFloat(order.deliveryPrice as string) || 0;
      // Revenue from products only — delivery fee goes entirely to the delivery company
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
      const partnerShare = netProfit * 0.3333;
      const ownerShare = netProfit * 0.6667;

      await this.createProfitRecord({
        orderId,
        revenue: revenue.toFixed(2),
        productCost: productCost.toFixed(2),
        allocatedExpenses: orderExpenses.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        netProfit: netProfit.toFixed(2),
        partnerShare: partnerShare.toFixed(2),
        ownerShare: ownerShare.toFixed(2),
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
    ] = await Promise.all([
      db.select({ id: products.id, stock: products.stock, minStock: products.minStock, name: products.name,
        price: products.price, costPrice: products.costPrice, image: products.image,
        category: products.category, featured: products.featured, published: products.published,
        condition: products.condition, productType: products.productType }).from(products),
      db.select({ status: orders.status, total: orders.total, createdAt: orders.createdAt }).from(orders),
      db.select().from(profitRecords),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5),
      db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(8),
      db.select().from(purchases).orderBy(desc(purchases.createdAt)).limit(5),
    ]);

    const totalProducts = allProducts.length;
    const lowStockProducts = allProducts.filter(p => p.stock <= (p.minStock ?? 3));
    const lowStockCount = lowStockProducts.length;
    const newOrdersCount = allOrders.filter(o => o.status === "new").length;

    const deliveredOrders = allOrders.filter(o => o.status === "delivered");
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.total as string || "0"), 0);

    const netProfit = allProfitRecords.reduce((sum, p) => sum + parseFloat(p.netProfit as string || "0"), 0);
    const partnerShare = allProfitRecords.reduce((sum, p) => sum + parseFloat(p.partnerShare as string || "0"), 0);
    const ownerShare = allProfitRecords.reduce((sum, p) => sum + parseFloat(p.ownerShare as string || "0"), 0);

    const fullLowStock = await this.getLowStockProducts(5);

    // Build monthly revenue chart data (last 6 months)
    const monthlyMap: Record<string, { revenue: number; profit: number }> = {};
    for (const o of allOrders) {
      if (o.status !== "delivered") continue;
      const d = new Date(o.createdAt!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, profit: 0 };
      monthlyMap[key].revenue += parseFloat(o.total as string || "0");
    }
    for (const p of allProfitRecords) {
      const d = new Date(p.createdAt!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, profit: 0 };
      monthlyMap[key].profit += parseFloat(p.netProfit as string || "0");
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

    return {
      totalProducts,
      lowStockCount,
      newOrdersCount,
      totalRevenue,
      netProfit,
      partnerShare,
      ownerShare,
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

    const VALID_SPENT_STATUSES = ["delivered"];
    const NON_COUNTED_STATUSES = ["cancelled", "returned_by_delivery", "delivery_failed", "customer_refused"];

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

    // Fix 1+8: Restore or log stock — dual-path for orderItems vs single-product orders
    if (condition === "sellable" && existing.stockDeducted) {
      const items = await this.getOrderItems(orderId);
      if (items.length > 0) {
        for (const item of items) {
          if (item.productId) {
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
}

async function seedDatabase() {
  const existingAdmin = await db.select().from(users).where(eq(users.id, "user-admin"));
  if (existingAdmin.length > 0) {
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length === 0) {
      await seedCategoriesAndBrands();
    }
    return;
  }

  console.log("[db] Seeding database...");

  await db.insert(users).values({
    id: "user-admin", username: "admin",
    password: hashPassword("admin2026"),
    role: "admin", name: "المدير",
  });

  await seedCategoriesAndBrands();

  console.log("[db] Database seeded ✓");
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
