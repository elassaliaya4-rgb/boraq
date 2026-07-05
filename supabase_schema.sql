-- ============================================
--  BORAQ — Database Schema (Supabase) v2
--  لصق هاد الكود كامل فـ: Supabase > SQL Editor > Run
-- ============================================

-- 1) جدول الأجونسيات
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  city text,
  email text,
  created_at timestamptz default now()
);

-- 2) جدول الـ profiles (يربط المستخدم بدوره)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'agency',  -- 'admin' أو 'agency'
  agency_id uuid references agencies(id) on delete set null,
  created_at timestamptz default now()
);

-- 3) جدول الطرود (مع الحقول الجديدة)
create table packages (
  id uuid primary key default gen_random_uuid(),
  tracking_number text unique not null,
  sender_name text,
  sender_phone text,        -- تيليفون المرسل
  receiver_name text,
  receiver_phone text,      -- تيليفون المستلم
  origin text,
  destination text,
  weight numeric default 0, -- الوزن بالكيلوغرام
  date_sent date default current_date,  -- تاريخ الإرسال
  status text default 'pending',  -- pending / inTransit / arrived / delivered
  agency_id uuid references agencies(id) on delete set null,
  created_by text default 'admin',     -- admin أو agency
  created_by_name text,                -- اسم اللي زاد الطرد
  created_at timestamptz default now()
);

-- 4) جدول الإشعارات (للأجونسيات + للأدمين)
create table notifications (
  id uuid primary key default gen_random_uuid(),
  target text not null default 'agency',  -- 'agency' أو 'admin'
  agency_id uuid references agencies(id) on delete cascade,
  agency_name text,         -- اسم الأجونسي اللي زاد (لإشعارات الأدمين)
  package_id uuid references packages(id) on delete cascade,  -- باش ننقرو عليه
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================
--  الحماية (Row Level Security)
-- ============================================
alter table agencies enable row level security;
alter table profiles enable row level security;
alter table packages enable row level security;
alter table notifications enable row level security;

create or replace function is_admin()
returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer;

create or replace function my_agency()
returns uuid as $$
  select agency_id from profiles where id = auth.uid();
$$ language sql security definer;

create or replace function is_driver()
returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'driver');
$$ language sql security definer;

-- ---- profiles ----
create policy "read own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin manage profiles" on profiles for all using (is_admin());
create policy "insert own profile" on profiles for insert with check (true);

-- ---- agencies ----
create policy "admin all agencies" on agencies for all using (is_admin());
create policy "agency read self" on agencies for select using (id = my_agency() or is_admin());
-- الكل يقدر يقرا لائحة الأجونسيات (باش يختار وجهة الطرد)
create policy "all read agencies list" on agencies for select using (auth.uid() is not null);

-- ---- packages ----
create policy "admin all packages" on packages for all using (is_admin());
-- الأجونسي يقرا الطرود ديالو
create policy "agency read own packages" on packages for select using (agency_id = my_agency() or is_admin());
-- الشوفور يقرا الطرود
create policy "driver read all packages" on packages for select using (is_driver());
-- الأجونسي يقدر يزيد طرد
create policy "agency insert packages" on packages for insert with check (auth.uid() is not null);
-- الأجونسي يقدر يبدل حالة الطرود ديالو
create policy "agency update own packages" on packages for update using (agency_id = my_agency() or is_admin());
-- الشوفور يقدر يبدل حالة الطرود (سكان)
create policy "driver update own packages" on packages for update using (is_driver());

-- ---- notifications ----
create policy "admin all notifs" on notifications for all using (is_admin());
create policy "agency read own notifs" on notifications for select using (agency_id = my_agency() and target = 'agency');
create policy "agency update own notifs" on notifications for update using (agency_id = my_agency());
-- الكل يقدر يصاوب إشعار (ملي يزيد طرد)
create policy "all insert notifs" on notifications for insert with check (auth.uid() is not null);

-- ============================================
--  ✅ بعد ما تشغل هاد الكود:
--  1. صاوب حساب admin من: Authentication > Users > Add User
--     (مثلاً: admin@boraq.com + كلمة سر، فعّل Auto Confirm)
--  2. نسخ الـ user id ديالو، وشغل هاد السطر (بدل USER_ID):
--
--     insert into profiles (id, role) values ('USER_ID', 'admin');
--
--  دابا تقدر تدخل كـ admin! 🎉
-- ============================================

-- ==========================================================================
--  دوال لمسح المستخدمين من Auth وسجلاتهم من قاعدة البيانات دفعة واحدة (تمنع خطأ User Already Registered)
-- ==========================================================================
create or replace function public.delete_driver(drv_id uuid, usr_id uuid)
returns void as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    delete from public.drivers where id = drv_id;
    if usr_id is not null then
      delete from auth.users where id = usr_id;
    end if;
  else
    raise exception 'Unauthorized';
  end if;
end;
$$ language plpgsql security definer;

create or replace function public.delete_agency(age_id uuid, usr_id uuid)
returns void as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    delete from public.agencies where id = age_id;
    if usr_id is not null then
      delete from auth.users where id = usr_id;
    end if;
  else
    raise exception 'Unauthorized';
  end if;
end;
$$ language plpgsql security definer;
