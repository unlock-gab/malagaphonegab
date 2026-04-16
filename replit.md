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
| `users` | المديرون والمؤكدون |
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
| `wilayas` | ولايات الجزائر وأسعار التوصيل |
| `shippers` | شركات التوصيل |
| `product_variants` | متغيرات المنتج (لون، سعة، IMEI، سعر، مخزون) |
| `phone_units` | وحدات الهاتف الفردية بـ IMEI — تُنشأ تلقائياً عند إتمام شراء هاتف/تابلت، تُربط بالطلبات |
| `after_sale_records` | سجلات ما بعد البيع (الضمان، الإصلاح) |

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
