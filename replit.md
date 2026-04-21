# ERP Backoffice | إدارة متجر الهواتف والإكسسوارات

## نظرة عامة
نظام ERP-lite متكامل لإدارة متجر هواتف ذكية وإكسسوارات في الجزائر.
مبني بـ React + Express.js مع قاعدة بيانات PostgreSQL عبر Drizzle ORM.

## المصادقة
- **المدير**: username=`admin`, password=`admin2026`
- مسار الدخول: `/admin/login`

## البنية التقنية
- **Frontend**: React + TanStack Query + Wouter + shadcn/ui (light theme, blue accent, RTL Arabic)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Port**: 5000

## جداول قاعدة البيانات
| الجدول | الوصف |
|--------|-------|
| `roles` | الأدوار وصلاحياتها (admin, vendeur, manager + مخصصة) |
| `users` | المديرون والمؤكدون مع ربط الأدوار والصلاحيات |
| `categories` | فئات المنتجات (8 مبدئية: هواتف، سماعات...) |
| `brands` | ماركات الهواتف (7 مبدئية: Apple, Samsung...) |
| `products` | المنتجات مع مواصفات الهاتف الكاملة |
| `suppliers` | الموردون |
| `purchases` | فواتير الشراء |
| `purchase_items` | تفاصيل بنود الشراء |
| `inventory_movements` | حركات المخزون |
| `orders` | طلبات البيع |
| `order_items` | بنود الطلب |
| `expenses` | المصاريف التشغيلية |
| `profit_records` | سجلات الأرباح (تُنشأ تلقائياً عند التسليم) |
| `operation_history` | سجل العمليات القابلة للتراجع (Undo) — آخر 5 عمليات |
| `wilayas` | ولايات الجزائر وأسعار التوصيل |
| `shippers` | شركات التوصيل |
| `product_variants` | متغيرات المنتج (لون، سعة، IMEI، سعر، مخزون) |
| `phone_units` | وحدات الهاتف الفردية بـ IMEI — تُنشأ تلقائياً عند إتمام شراء هاتف/تابلت، تُربط بالطلبات |
| `after_sale_records` | سجلات ما بعد البيع (الضمان، الإصلاح) |
| `service_sales` | مبيعات الخدمات (إصلاح، فلاشة، ...) — تظهر في تقرير الأرباح |
| `employees` | موظفو المتجر مع الراتب الشهري والحالة |
| `salary_advances` | سلف الموظفين (تُسجَّل كمصروف salary_advance) |
| `salary_payments` | دفعات الرواتب (تُسجَّل كمصروف salary) |
| `client_credits` | مبيعات بالتقسيط/الكريدي للعملاء (الرصيد المتبقي يظهر في Dashboard) |
| `credit_versements` | دفعات سداد الكريدي من العملاء |

## صفحات لوحة الإدارة (بعد التحسينات الشاملة)
| المسار | الصفحة |
|--------|--------|
| `/admin` | لوحة التحكم - KPIs، آخر الطلبات، نقص المخزون |
| `/admin/products` | المنتجات - **Table-first view** (toggle card)، sortable columns، bulk actions، status filter، publish/featured toggle per row |
| `/admin/categories` | الفئات - CRUD |
| `/admin/brands` | الماركات - CRUD |
| `/admin/suppliers` | الموردون - CRUD |
| `/admin/purchases` | المشتريات - **Table layout**، line items table in form، view dialog، status filter |
| `/admin/inventory` | المخزون - **stock health filter tabs** (all/healthy/low/out)، last movement column، quick adjust per row |
| `/admin/orders` | الطلبات - **Table with all columns**، WhatsApp quick-contact، detail dialog، status timeline |
| `/admin/expenses` | المصاريف - CRUD |
| `/admin/profit` | الأرباح - **Detailed records table** (orderId, revenue, cost, expenses, netProfit, partnerShare, ownerShare) + totals row |
| `/admin/reports` | تقرير المنتجات - أكثر المنتجات مبيعاً، هامش الربح، فلتر تاريخ |
| `/admin/customers` | الزبائن - قائمة مجمّعة من الطلبات، سجل الطلبات، واتساب |
| `/admin/pos` | **نقطة البيع POS** - بحث سريع بالاسم/SKU/IMEI، PhoneUnitPicker للهواتف، سلة شراء، دفع فوري، طباعة فاتورة (source=pos) |
| `/admin/delivery` | أسعار التوصيل |
| `/admin/settings` | الإعدادات |
| `/admin/service-sales` | **مبيعات الخدمات** - تسجيل بيع خدمة (إصلاح، فلاشة...)، إحصائيات، تكامل مع الأرباح |
| `/admin/salaries` | **الرواتب** - إدارة الموظفين، رواتب شهرية، سلف، دفعات، تكامل مع المصاريف |
| `/admin/client-credits` | **Crédit Client** - إدارة مبيعات الكريدي، تسجيل الدفعات، تتبع الرصيد المتبقي |

## نظام الترجمة (i18n) - اكتمل بالكامل
- **ملف الترجمات**: `client/src/lib/adminTranslations.ts` — قاموس FR/AR شامل بجميع المفاتيح
- **Context**: `client/src/context/AdminLangContext.tsx` — يوفر `useAdminLang()` hook لـ `t(key)` و `dir`
- **اللغة الافتراضية**: فرنسية (FR)، يُحفظ الاختيار في localStorage
- **جميع صفحات الإدارة**: تستخدم `useAdminLang()` و `dir={dir}` بدلاً من `dir="rtl"` المُضمَّن
- **الصفحات المترجمة بالكامل**: AdminDashboard, AdminLogin, AdminExpenses, AdminSuppliers, AdminCategories, AdminBrands, AdminProfit, AdminCustomers, AdminDelivery
- **الصفحات المدعومة بالـ dir الديناميكي**: AdminOrders, AdminProducts, AdminPOS, AdminInventory, AdminPurchases, AdminSettings, AdminAfterSale, AdminReports, AdminConfirmateurs, AdminShippers, AdminAbandoned, AdminIPBlocker

## تحسينات UI/UX (Phase 2)
- **Sidebar**: تنظيم أقسام ERP نظيف، حذف ip-blocker وabandoned من التنقل الرئيسي
- **Products**: الجدول افتراضي، toggle card view، sort بكل column، bulk publish/hide/delete، status filter، inline toggles
- **Orders**: جدول كامل بكل الأعمدة، زر واتساب سريع، dialog تفصيلية، status timeline، خصم مخزون تلقائي عند التأكيد
- **Purchases**: table list، items table قابلة للتعديل مباشرة، dialog عرض التفاصيل
- **Inventory**: tabs حالة المخزون، عمود آخر حركة + نوعها، زر تعديل سريع
- **Profit**: جدول سجلات تفصيلي مع صف مجموعات في الأسفل، date range filter
- **WhatsApp URL**: `https://wa.me/213XXXXXXXX` (تحويل تلقائي من 0xxx إلى 213xxx)

## منطق الأرباح
- عند تغيير حالة الطلب إلى `delivered`: يُنشأ سجل ربح تلقائياً
- صافي الربح = الإيرادات - تكلفة المنتج
- حصة الشريك = 33.33% من صافي الربح
- حصة المالك = 66.67% من صافي الربح

## حالات الطلبات
`new` → `confirmed` → `preparing` → `shipped` → `delivered` / `cancelled`

## ميزات المنتج
- حالة المنتج: جديد / مستعمل جيد / مستعمل مقبول / مجدد
- مواصفات: التخزين، الرام، اللون، الشاشة، البطارية، المعالج، نظام التشغيل، الكاميرا
- متابعة: IMEI 1 و 2، SKU، الباركود، ضمان الشهور
- المخزون: الكمية الحالية والحد الأدنى

## واجهة المتجر (Storefront Phase - مكتمل)
تم تحويل الواجهة الأمامية بالكامل من متجر مكملات (ZoraBio) إلى متجر هواتف وإكسسوارات احترافي.

### التصميم الجديد
- **لون الهوية**: أزرق (blue-600) + خلفية بيضاء/رمادي فاتح
- **الشعار**: موبايل شوب مع أيقونة Smartphone
- **اتجاه**: RTL عربي كامل

### الصفحات والمكونات المحدّثة
| الملف | التغييرات |
|-------|-----------|
| `Navbar.tsx` | روابط الهواتف/المستعمل/إكسسوارات/العروض، واتساب sticky، بحث |
| `Footer.tsx` | تصميم إلكترونيات، روابط قسم الهواتف، معلومات التواصل |
| `ProductCard.tsx` | badge الحالة (جديد/مستعمل)، صحة البطارية، التخزين/الرام للهواتف |
| `Home.tsx` | هيرو تقني، شبكة الفئات، هواتف جديدة، هواتف مستعملة، عروض، ماركات، WhatsApp CTA |
| `Products.tsx` | فلتر category/brand/condition/price/offers، drawer موبايل، sort متقدم |
| `ProductDetail.tsx` | مواصفات الهاتف الكاملة، شريط صحة البطارية، زر واتساب ضخم، image gallery |

### ميزات الواجهة
- بحث فوري بالاسم والـ SKU
- فلتر الحالة: جديد/مستعمل جيد/مستعمل مقبول/مجدد
- شريط صحة البطارية للهواتف المستعملة
- CTA واتساب مع رسالة منسّقة تلقائياً
- نموذج طلب سريع بدون حساب (الدفع عند الاستلام)
- جدول مواصفات الهاتف الكامل (معالج، شاشة، رام، تخزين، كاميرا...)

## ملاحظات البيئة
- **واتساب**: رقم `0555123456` (يتحول تلقائياً إلى `213555123456`)
- البيانات المبدئية: 8 فئات + 7 ماركات (تُنشأ عند بدء تشغيل الخادم إذا كانت قاعدة البيانات فارغة)
