# دليل نشر Zora Bio على Dokploy

## المتطلبات
- VPS مع Dokploy مثبت
- PostgreSQL service منشأة في Dokploy
- الـ Internal Connection URL من Dokploy

---

## الخطوة 1: انسخ الـ DATABASE_URL من Dokploy

من صفحة قاعدة البيانات في Dokploy → Internal Credentials:
```
postgresql://postgres:PASSWORD@bio-db-HOST:5432/bio-db
```

---

## الخطوة 2: أنشئ Application في Dokploy

1. Dokploy → Projects → Create Application
2. اختر **GitHub** واختر repo: `unlock-gab/ecom`
3. Branch: `main`

---

## الخطوة 3: أضف Environment Variables

في إعدادات التطبيق → Environment:
```
DATABASE_URL=postgresql://postgres:PASSWORD@bio-db-taltt9:5432/bio-db
SESSION_SECRET=اكتب-مفتاح-سري-طويل-هنا
PORT=3000
NODE_ENV=production
```

---

## الخطوة 4: اضبط Build & Start Commands

في إعدادات التطبيق:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

---

## الخطوة 5: أنشئ الجداول (مرة واحدة فقط)

افتح Terminal في Dokploy (زر Open Terminal):
```bash
npm run db:push
```

هذا سيُنشئ جداول: `users`, `categories`, `products`, `orders`
وعند أول تشغيل ستُنشأ البيانات الأولية تلقائياً.

---

## الخطوة 6: Deploy

اضغط **Deploy** في Dokploy — المشروع سيعمل تلقائياً.

---

## معلومات الدخول الافتراضية

- **رابط الأدمن**: `https://yourdomain.com/admin/login`
- **اسم المستخدم**: `admin`
- **كلمة المرور**: `admin2026`

> **غيّر كلمة المرور فوراً بعد أول تسجيل دخول!**

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| خطأ في DB | تحقق من DATABASE_URL في Environment Variables |
| الجداول غير موجودة | شغّل `npm run db:push` من Terminal |
| الموقع لا يعمل | تحقق من Logs في Dokploy |
