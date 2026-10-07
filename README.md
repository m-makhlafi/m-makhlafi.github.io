# بورتفوليو محمد المخلافي

موقع شخصي لمحتوى تقني بالعربية (برمجة + شبكات وسيرفرات)، مبني بـ [Astro](https://astro.build) وينشر مجاناً على GitHub Pages.

## التشغيل على جهازك

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # يبني الموقع في مجلد dist
```

## أين أعدّل المحتوى؟

| ماذا | الملف |
|---|---|
| الاسم، البريد، الروابط، فقرة "من أنا" | `src/data/site.ts` |
| المهارات، المشاريع، الفيديوهات القصيرة، سجل الإصدارات | `src/data/portfolio.ts` |
| المختبرات | `src/content/labs/*.yaml` |
| الألوان والخطوط | أعلى `src/styles/global.css` |

## إضافة مختبر جديد

1. انسخ `src/content/labs/vlan-trunk.yaml` باسم جديد، مثل `ospf.yaml` (إذا كان الملف موجوداً كـ"قريباً" عدّله هو).
2. غيّر `status` إلى `available`، واكتب `topology` و `steps`.
3. لكل أمر سطر `{ cmd: "...", ex: "شرح الأمر" }`.
4. `state` في كل خطوة يذكر ما يتغير فقط في المخطط (لون جهاز، نص تحته، تحويل كابل إلى trunk).

الصفحة `/labs/<اسم-الملف>/` تُبنى تلقائياً، وتظهر البطاقة في الكتالوج، والجدول المرجعي للأوامر يُجمع وحده.

## النشر على GitHub Pages

1. أنشئ مستودعاً على GitHub. إذا سميته `<username>.github.io` يكون الرابط `https://<username>.github.io`.
2. ارفع المشروع إلى فرع `main`.
3. في المستودع: **Settings ← Pages ← Source: GitHub Actions**.
4. كل `push` إلى `main` ينشر الموقع تلقائياً عبر `.github/workflows/deploy.yml`.
