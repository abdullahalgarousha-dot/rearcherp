# دليل تشغيل النظام (System Running Guide)

## المتطلبات (Prerequisites)
- **Node.js**: الإصدار 18 أو أحدث (v18+).
- **Database**: تأكد من أن ملف قاعدة البيانات `dev.db` (لـ SQLite) موجود أو أن اتصال PostgreSQL سليم.

## خطوات التشغيل المثلى (Optimal Start Steps)

### 1. تنظيف النظام (في حال وجود مشاكل)
إذا واجهت أخطاء مثل "Port in use" أو "Lock file":
```powershell
# إيقاف جميع عمليات Node العالقة
taskkill /F /IM node.exe

# (اختياري) مسح ملفات الكاش
rm -r .next
```

### 2. تثبيت المكتبات (مرة واحدة أو عند التحديث)
```bash
npm install
```

### 3. تحديث قاعدة البيانات
لتطبيق أي تغييرات في `schema.prisma` وتوليد الـ Client:
```bash
npx prisma db push
npx prisma generate
```

### 4. تشغيل السيرفر (Development)
```bash
npm run dev
```
سيعمل الموقع على: [http://localhost:3000](http://localhost:3000)

---

## أوامر مفيدة (Useful Commands)

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل وضيغة التطوير (Development Mode) |
| `npm run build` | بناء نسخة الإنتاج (Production Build) |
| `npm run start` | تشغيل نسخة الإنتاج بعد البناء |
| `npx prisma studio` | فتح واجهة بصرية لإدارة قاعدة البيانات |
