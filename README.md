# ⚡ Boraq — نظام الشحن والتوصيل

دليل التشغيل خطوة بخطوة. تبع كل خطوة بالترتيب.

---

## 📋 شنو خاصك

- حساب **Supabase** مجاني → https://supabase.com
- حساب **Vercel** مجاني → https://vercel.com (للنشر)
- **Node.js** مثبت فالجهاز → https://nodejs.org (نسخة LTS)

---

## الخطوة 1 — تشغيل المشروع فالجهاز

حل الطرمينال فالفولدر ديال boraq وكتب:

```bash
npm install
```

(هاد العملية كتثبت كل المكتبات، صبر شوية)

---

## الخطوة 2 — صاوب حساب Supabase

1. مشي لـ https://supabase.com ودير حساب
2. اضغط **New Project**
3. عطيه اسم `boraq` وكلمة سر قوية للـ database
4. صبر حتى يوجد (دقيقتين)

---

## الخطوة 3 — صاوب الجداول (Database)

1. فـ Supabase، مشي لـ **SQL Editor** (فالقائمة اليسرى)
2. اضغط **New query**
3. حل الملف `supabase_schema.sql` اللي معاك
4. انسخ **كل** المحتوى ولصقو
5. اضغط **Run** ▶️

دابا الجداول تصاوبو ✅

---

## الخطوة 4 — صاوب حساب Admin

1. فـ Supabase مشي لـ **Authentication** > **Users**
2. اضغط **Add user** > **Create new user**
3. عمّر:
   - Email: `admin@boraq.com`
   - Password: (كلمة سر قوية)
   - فعّل **Auto Confirm User** ✅
4. اضغط **Create user**
5. انسخ الـ **User UID** ديالو (كاين فاللائحة)
6. ارجع لـ **SQL Editor**، new query، ولصق هادا (بدل `USER_ID` بالـ UID):

```sql
insert into profiles (id, role) values ('USER_ID', 'admin');
```

7. اضغط **Run** ▶️

دابا عندك حساب admin ✅

---

## الخطوة 5 — اربط المشروع بـ Supabase

1. فـ Supabase مشي لـ **Project Settings** > **API**
2. انسخ:
   - **Project URL**
   - **anon public key**
3. فالفولدر ديال المشروع، صاوب ملف جديد سميتو `.env`
4. لصق فيه (بدل القيم):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
```

---

## الخطوة 6 — شغّل المشروع

فالطرمينال:

```bash
npm run dev
```

غادي يعطيك لينك (بحال http://localhost:5173) — حلو فالـ browser.

دخل بـ:
- Email: `admin@boraq.com`
- Password: (اللي ديري)

دابا راك فـ **فضاء الأدمين** 🎉

---

## كيفاش تستعمل النظام

### كـ Admin:
1. **زيد أجونسي** — من تاب "الأجونسيات" > "إضافة أجونسي"
   - كل أجونسي كيتعطى email + password يدخل بيهم
2. **زيد طرد** — من تاب "الطرود" > "إضافة طرد"
   - اختار الأجونسي اللي غادي ليه الطرد
   - ملي تحفظ، الأجونسي كيوصلو إشعار 🔔
3. **التيكيت** — اضغط 🎫 على أي طرد باش تطبع تيكيت بـ QR

### كـ Agence:
1. كيدخل بـ email + password اللي عطيتيه
2. كيشوف **غير طرودو** هو
3. كيوصلو **إشعار** ملي يجي طرد جديد 🔔

---

## الخطوة 7 — النشر على Vercel (online)

1. صاوب حساب على **GitHub** ورفع المشروع فيه
2. مشي لـ https://vercel.com ودخل بـ GitHub
3. اضغط **Add New** > **Project**
4. اختار repo ديال boraq
5. فـ **Environment Variables** زيد:
   - `VITE_SUPABASE_URL` = الـ URL ديالك
   - `VITE_SUPABASE_ANON_KEY` = الـ key ديالك
6. اضغط **Deploy**

دابا النظام online ويمكن للأجونسيات يدخلو من أي بلاصة! 🌍

---

## 🆘 إلا تعرقلتي

رجع لـ Claude وقول ليه فين وقفتي، وغادي يعاونك.
