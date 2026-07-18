-- ============================================================================
--  BORAQ — Database Schema (Supabase) v3  (نسخة مصححة)
--  آمنة تشغّلها فوق داتابيز موجودة: كلشي "if not exists" / "drop ... if exists"
--  لصقها كاملة فـ: Supabase > SQL Editor > Run
-- ============================================================================

-- ============================================================================
--  1) الجداول الأساسية  (تتصاوب غير إلا ما كانتش موجودة)
-- ============================================================================

-- الأجونسيات
create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  city text,
  email text,
  created_at timestamptz default now()
);

-- 🔴 الجديد: جدول الشوفورة (كان ناقص، والكود كيستعملو)
create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  email text,
  phone text,
  latitude double precision,
  longitude double precision,
  last_active timestamptz,
  created_at timestamptz default now()
);

-- الـ profiles (كيربط المستخدم بدوره)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'agency',   -- 'admin' | 'agency' | 'driver'
  agency_id uuid references agencies(id) on delete set null,
  created_at timestamptz default now()
);

-- 🔴 الجديد: عمود driver_id ف profiles (كان ناقص)
alter table profiles add column if not exists driver_id uuid references drivers(id) on delete set null;

-- الطرود
create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  tracking_number text unique not null,
  sender_name text,
  sender_phone text,
  receiver_name text,
  receiver_phone text,
  origin text,
  destination text,
  weight numeric default 0,
  date_sent date default current_date,
  status text default 'pending',         -- pending | inTransit | arrived | delivered
  agency_id uuid references agencies(id) on delete set null,
  created_by text default 'admin',
  created_by_name text,
  created_at timestamptz default now()
);

-- الإشعارات
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  target text not null default 'agency', -- 'agency' | 'admin'
  agency_id uuid references agencies(id) on delete cascade,
  agency_name text,
  package_id uuid references packages(id) on delete cascade,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================================
--  2) أعمدة إضافية على الطرود  (updated_at + دعم COD/الدفع، اختياري)
-- ============================================================================
alter table packages add column if not exists updated_at timestamptz default now();

-- ---- الفلوس: النموذج ديالك (كارگو من أوروبا، 20 درهم/كيلو) ----
-- الثمن للكيلو (افتراضي 20 د.ه، تقدر تبدّلو لكل طرد)
alter table packages add column if not exists price_per_kg numeric default 20;
-- الثمن الإجمالي = الوزن × الثمن للكيلو  (كيتحسب أوتوماتيكي، ماتعمّرهش بيدك)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_name='packages' and column_name='total_price') then
    alter table packages
      add column total_price numeric generated always as (coalesce(weight,0) * coalesce(price_per_kg,20)) stored;
  end if;
end $$;
-- شكون كيخلّص: 'sender' (خلّص فباريس) أو 'receiver' (كيخلّص عند الاستلام)
alter table packages add column if not exists payer text default 'receiver';
-- حالة الدفع (كتتخلّص فالأجونسي ملي المستلم يجي يهزّ الكولي — ماشي الشوفور)
alter table packages add column if not exists payment_status text default 'unpaid'; -- unpaid | paid
alter table packages add column if not exists paid_at timestamptz;
-- تاريخ ملي المستلم جا هزّ الكولي من الأجونسي
alter table packages add column if not exists picked_up_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'packages_payer_check') then
    alter table packages add constraint packages_payer_check check (payer in ('sender','receiver'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'packages_payment_status_check') then
    alter table packages add constraint packages_payment_status_check check (payment_status in ('unpaid','paid'));
  end if;
end $$;

-- ============================================================================
--  3) CHECK على الحالة  (تمنع قيم غالطة بحال 'deliverd')
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'packages_status_check') then
    alter table packages
      add constraint packages_status_check
      check (status in ('pending','inTransit','arrived','delivered'));
  end if;
end $$;

-- ============================================================================
--  4) الفهارس (Indexes) — باش يبقى السيستم سريع ملي يكثرو الطرود
-- ============================================================================
create index if not exists idx_packages_status        on packages (status);
create index if not exists idx_packages_agency         on packages (agency_id);
create index if not exists idx_packages_created_at     on packages (created_at desc);
create index if not exists idx_packages_date_sent      on packages (date_sent);
create index if not exists idx_packages_receiver_phone on packages (receiver_phone);
create index if not exists idx_packages_payment_status  on packages (payment_status);

create index if not exists idx_notifs_target   on notifications (target);
create index if not exists idx_notifs_agency   on notifications (agency_id);
create index if not exists idx_notifs_is_read  on notifications (is_read);

create index if not exists idx_profiles_agency on profiles (agency_id);
create index if not exists idx_profiles_driver on profiles (driver_id);

-- ============================================================================
--  5) updated_at أوتوماتيكي
-- ============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_packages_updated_at on packages;
create trigger trg_packages_updated_at
  before update on packages
  for each row execute function set_updated_at();

-- ============================================================================
--  6) 🆕 تاريخ الحالات — تتبّع فوقاش/شكون بدّل حالة كل طرد
-- ============================================================================
create table if not exists package_status_history (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references packages(id) on delete cascade,
  status text,
  changed_by uuid,        -- auth.users.id
  created_at timestamptz default now()
);

create index if not exists idx_pkg_history_package on package_status_history (package_id);

-- كل ما تبدّل الحالة، كيتسجّل سطر جديد أوتوماتيكي
create or replace function log_package_status()
returns trigger as $$
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    insert into package_status_history (package_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_pkg_status_history on packages;
create trigger trg_pkg_status_history
  after insert or update of status on packages
  for each row execute function log_package_status();

-- ============================================================================
--  7) دوال الأدوار
-- ============================================================================
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

create or replace function my_driver()
returns uuid as $$
  select driver_id from profiles where id = auth.uid();
$$ language sql security definer;

-- ============================================================================
--  8) الحماية (Row Level Security)
-- ============================================================================
alter table agencies               enable row level security;
alter table drivers                enable row level security;
alter table profiles               enable row level security;
alter table packages               enable row level security;
alter table notifications          enable row level security;
alter table package_status_history enable row level security;

-- ---- profiles ----
drop policy if exists "read own profile"     on profiles;
drop policy if exists "admin manage profiles" on profiles;
drop policy if exists "insert own profile"    on profiles;
create policy "read own profile"      on profiles for select using (id = auth.uid() or is_admin());
create policy "admin manage profiles" on profiles for all    using (is_admin());
create policy "insert own profile"    on profiles for insert with check (true);

-- ---- agencies ----
drop policy if exists "admin all agencies"      on agencies;
drop policy if exists "agency read self"        on agencies;
drop policy if exists "all read agencies list"  on agencies;
create policy "admin all agencies"     on agencies for all    using (is_admin());
create policy "all read agencies list" on agencies for select using (auth.uid() is not null);

-- ---- drivers (🆕) ----
drop policy if exists "admin all drivers"  on drivers;
drop policy if exists "all read drivers"   on drivers;
drop policy if exists "driver update self" on drivers;
create policy "admin all drivers"  on drivers for all    using (is_admin());
create policy "all read drivers"   on drivers for select using (auth.uid() is not null);
-- الشوفور كيبدّل غير الموقع/المعلومات ديالو هو
create policy "driver update self" on drivers for update using (id = my_driver() or is_admin());

-- ---- packages ----
drop policy if exists "admin all packages"                on packages;
drop policy if exists "any authenticated user read packages" on packages;
drop policy if exists "agency insert packages"            on packages;
drop policy if exists "agency update own packages"        on packages;
drop policy if exists "driver update own packages"        on packages;
create policy "admin all packages" on packages for all using (is_admin());
create policy "any authenticated user read packages" on packages for select using (auth.uid() is not null);
-- ✅ الأجونسي كيقدر يصيفط كولي لأي أجونسي أخرى (agency_id = الوجهة)
--    داكشي علاش أي مستخدم مسجّل مسموح ليه يزيد كولي — هادا مقصود فالنموذج ديال Boraq
create policy "agency insert packages" on packages for insert
  with check (auth.uid() is not null);
create policy "agency update own packages" on packages for update
  using (agency_id = my_agency() or is_admin());
create policy "driver update packages" on packages for update
  using (is_driver());

-- ---- notifications ----
drop policy if exists "admin all notifs"       on notifications;
drop policy if exists "agency read own notifs" on notifications;
drop policy if exists "agency update own notifs" on notifications;
drop policy if exists "all insert notifs"      on notifications;
create policy "admin all notifs"        on notifications for all    using (is_admin());
create policy "agency read own notifs"  on notifications for select using (agency_id = my_agency() and target = 'agency');
create policy "agency update own notifs" on notifications for update using (agency_id = my_agency());
create policy "all insert notifs"       on notifications for insert with check (auth.uid() is not null);

-- ---- package_status_history (🆕) ----
drop policy if exists "read history" on package_status_history;
create policy "read history" on package_status_history for select using (auth.uid() is not null);

-- ============================================================================
--  9) دوال المسح (Auth + قاعدة البيانات دفعة وحدة)
-- ============================================================================
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


-- ── ADD GOOGLE MAPS LINK TO AGENCIES ──
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
