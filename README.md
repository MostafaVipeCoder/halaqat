# حلقات — Halaqat

منصة SaaS لإدارة مدارس ومراكز تحفيظ القرآن الكريم: الطلاب والحلقات، متابعة الحفظ والتسميع، الحضور بالـ QR، الرسوم والفواتير، والتقارير — مع عزل كامل لبيانات كل مدرسة.

A multi-tenant SaaS for Quran memorization schools, built with React, Vite and Supabase.

## المميزات

- **الحفظ والتسميع**: خطة حفظ لكل طالب، تسجيل جلسات التسميع (حفظ جديد / مراجعة / تثبيت) بالأخطاء والتقدير، اقتراح الورد التالي تلقائيًا، وخريطة حفظ للأجزاء والسور.
- **الطلاب والحلقات**: إدارة الطلاب، الحلقات، المراحل، والانضباط.
- **الحضور**: كود QR لكل طالب وماسح بالكاميرا مع قواعد مواعيد العمل.
- **المالية**: فواتير فردية وجماعية، المعفيين، والتقارير المالية.
- **لوحة المنصة (Super Admin)**: المدارس، الباقات، الخصومات، وإعدادات المنصة.

التوثيق الكامل للخصائص وخارطة الطريق: [docs/FEATURES.md](docs/FEATURES.md)

## التشغيل محليًا

```bash
npm install --legacy-peer-deps
npm run dev
```

أنشئ ملف `.env.local` يحتوي على:

```
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<publishable key>"
```

## قاعدة البيانات (Supabase)

على مشروع Supabase جديد، شغّل ملفات `migrations/` بالترتيب:

1. `000_saas_school_baseline.sql` — السكيمة الكاملة، صلاحيات RLS لكل مدرسة، وإنشاء مدرسة وملف مدير تلقائيًا عند التسجيل.
2. `memorization_module.sql` — جداول خطة الحفظ وجلسات التسميع.

> `school_id_migration.sql` خاص بترقية قاعدة البيانات القديمة فقط — لا تشغّله على مشروع جديد.

## الواجهة والأنماط

`src/index.css` حزمة Tailwind 4.1.3 مولّدة مسبقًا. الـ classes غير الموجودة فيها تُولّد في `src/styles/utilities.css`:

```bash
npm run build:utilities-css
```
