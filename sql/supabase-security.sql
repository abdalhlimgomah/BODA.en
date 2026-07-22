-- Run this in Supabase SQL Editor (project: msgqzgzoslearaprgiqq)
-- Goal: tighten RLS and protect sensitive rows.
-- IMPORTANT:
-- These policies assume you use Supabase Auth (authenticated JWT per user).
-- If your current login still depends on anonymous access to public.users, migrate login first.

-- 1) Enable RLS on critical tables
alter table if exists public.users enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.kobon enable row level security;

-- 2) USERS table policies
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'))
with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- Optional: if you still need signup through direct insert into public.users.
drop policy if exists "users_insert_auth_only" on public.users;
create policy "users_insert_auth_only"
on public.users
for insert
to authenticated
with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- 3) ORDERS policies (owner only)
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders
for select
to authenticated
using (
  lower(coalesce(user_email, email, customer_email, '')) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders
for insert
to authenticated
with check (
  lower(coalesce(user_email, email, customer_email, '')) = lower(auth.jwt() ->> 'email')
);

-- 4) ORDER_ITEMS policies (linked to own order only)
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and lower(coalesce(o.user_email, o.email, o.customer_email, '')) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and lower(coalesce(o.user_email, o.email, o.customer_email, '')) = lower(auth.jwt() ->> 'email')
  )
);

-- 5) PRODUCTS read policy (public catalog)
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
on public.products
for select
to anon, authenticated
using (true);

-- 5.1) KOBON read policy (coupon validation from frontend)
drop policy if exists "kobon_public_read" on public.kobon;
create policy "kobon_public_read"
on public.kobon
for select
to anon, authenticated
using (true);

-- 6) RATINGS table + policies (for product ratings)
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  item_id text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.ratings enable row level security;

-- Add user_email column if upgrading existing table
alter table if exists public.ratings add column if not exists user_email text;

-- Replace old unique index with one keyed on email (since app uses localStorage auth)
drop index if exists ratings_user_item_unique;
create unique index if not exists ratings_email_item_unique on public.ratings(user_email, item_id);

-- select for all users (for product listing)
drop policy if exists "ratings_public_select" on public.ratings;
create policy "ratings_public_select"
  on public.ratings
  for select
  to anon, authenticated
  using (true);

-- insert/update by email (compatible with app's localStorage auth)
drop policy if exists "ratings_insert_own" on public.ratings;
create policy "ratings_insert_own"
  on public.ratings
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own"
  on public.ratings
  for update
  to anon, authenticated
  using (true)
  with check (true);


-- 6) Optional column for invoice download link.
alter table if exists public.orders
add column if not exists invoice_url text;

-- 🌍 Taager integration schema changes
alter table if exists public.products
add column if not exists source text default 'internal',
add column if not exists taager_product_id text,
add column if not exists available_countries jsonb default '[]'::jsonb;

alter table if exists public.orders
add column if not exists order_source text,
add column if not exists country_code text,
add column if not exists taager_order_status text default 'not_submitted';

-- 7) Backfill old order_items with product name/image from products.
--    Idempotent: safe to run multiple times.
do $$
declare
  has_oi_product_name boolean;
  has_oi_image boolean;
  has_p_name boolean;
  has_p_image boolean;
  has_p_image_url boolean;
  set_parts text[] := array[]::text[];
  where_parts text[] := array[]::text[];
  sql text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'product_name'
  ) into has_oi_product_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'image'
  ) into has_oi_image;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'name'
  ) into has_p_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'image'
  ) into has_p_image;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'image_url'
  ) into has_p_image_url;

  if has_oi_product_name and has_p_name then
    set_parts := array_append(
      set_parts,
      'product_name = coalesce(nullif(trim(oi.product_name), ''''), nullif(trim(p.name), ''''))'
    );
    where_parts := array_append(
      where_parts,
      'coalesce(trim(oi.product_name), '''') = '''' or lower(trim(oi.product_name)) in (''product'', ''منتج'')'
    );
  end if;

  if has_oi_image and (has_p_image or has_p_image_url) then
    if has_p_image and has_p_image_url then
      set_parts := array_append(
        set_parts,
        'image = coalesce(nullif(trim(oi.image), ''''), nullif(trim(p.image), ''''), nullif(trim(p.image_url), ''''))'
      );
    elsif has_p_image then
      set_parts := array_append(
        set_parts,
        'image = coalesce(nullif(trim(oi.image), ''''), nullif(trim(p.image), ''''))'
      );
    else
      set_parts := array_append(
        set_parts,
        'image = coalesce(nullif(trim(oi.image), ''''), nullif(trim(p.image_url), ''''))'
      );
    end if;
    where_parts := array_append(where_parts, 'coalesce(trim(oi.image), '''') = ''''');
  end if;

  if array_length(set_parts, 1) is null then
    raise notice 'Backfill skipped: required columns are missing.';
    return;
  end if;

  sql :=
    'update public.order_items oi set ' || array_to_string(set_parts, ', ') ||
    ' from public.products p where oi.product_id::text = p.id::text and (' ||
    array_to_string(where_parts, ' or ') || ')';

  execute sql;
end
$$;

-- 9) Heuristic backfill for orders.type when order_items are missing:
--    match orders.total_price to exactly one product price (or an integer multiple 1..10).
--    This improves old rows that lost item payloads.
do $$
declare
  has_orders_id boolean;
  has_orders_type boolean;
  has_orders_total boolean;
  has_products_id boolean;
  has_products_price boolean;
  has_products_price_after_discount boolean;
  has_products_name boolean;
  has_products_image boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'id'
  ) into has_orders_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'type'
  ) into has_orders_type;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'total_price'
  ) into has_orders_total;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'id'
  ) into has_products_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price'
  ) into has_products_price;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price_after_discount'
  ) into has_products_price_after_discount;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'name'
  ) into has_products_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'image'
  ) into has_products_image;

  if not (
    has_orders_id and
    has_orders_type and
    has_orders_total and
    has_products_id and
    has_products_price and
    has_products_price_after_discount and
    has_products_name and
    has_products_image
  ) then
    raise notice 'orders.type heuristic backfill skipped: required columns are missing.';
    return;
  end if;

  with product_prices as (
    select
      p.id::text as product_id,
      case
        when p.price_after_discount is not null and p.price_after_discount > 0 then p.price_after_discount::numeric
        when p.price is not null and p.price > 0 then p.price::numeric
        else null
      end as effective_price,
      nullif(trim(p.name), '') as product_name,
      nullif(trim(p.image), '') as product_image
    from public.products p
  ),
  scored as (
    select
      o.id::text as order_id,
      o.total_price::numeric as total_price,
      pp.product_id,
      pp.product_name,
      pp.product_image,
      pp.effective_price,
      case
        when abs(o.total_price::numeric - pp.effective_price) <= 0.01 then 1
        when pp.effective_price > 0
         and round((o.total_price::numeric / pp.effective_price)) between 1 and 10
         and abs((o.total_price::numeric / pp.effective_price) - round((o.total_price::numeric / pp.effective_price))) <= 0.01 then 2
        else 99
      end as score,
      case
        when pp.effective_price > 0 then greatest(1, least(10, round((o.total_price::numeric / pp.effective_price))::int))
        else 1
      end as inferred_qty
    from public.orders o
    join product_prices pp on pp.effective_price is not null
    where coalesce(trim(o.type), '') = ''
      and o.total_price is not null
      and (
        abs(o.total_price::numeric - pp.effective_price) <= 0.01
        or (
          pp.effective_price > 0
          and round((o.total_price::numeric / pp.effective_price)) between 1 and 10
          and abs((o.total_price::numeric / pp.effective_price) - round((o.total_price::numeric / pp.effective_price))) <= 0.01
        )
      )
  ),
  ranked as (
    select
      s.*,
      row_number() over (partition by s.order_id order by s.score asc, s.effective_price desc, s.product_id asc) as rn,
      count(*) over (partition by s.order_id) as candidate_count
    from scored s
  ),
  unique_hits as (
    select *
    from ranked
    where rn = 1 and candidate_count = 1
  )
  update public.orders o
  set type = jsonb_strip_nulls(
    jsonb_build_object(
      'product_id', h.product_id,
      'name', h.product_name,
      'image', h.product_image,
      'quantity', h.inferred_qty,
      'price', h.effective_price
    )
  )::text
  from unique_hits h
  where o.id::text = h.order_id
    and coalesce(trim(o.type), '') = '';
end
$$;

-- 8) Backfill orders.type with a lightweight JSON snapshot from order_items/products.
--    Useful when frontend cannot read order_items بسبب RLS لكن الطلب يحتاج اسم/صورة المنتج.
--    Idempotent: only fills rows where orders.type is empty.
do $$
declare
  has_orders_type boolean;
  has_orders_id boolean;
  has_oi_order_id boolean;
  has_oi_product_id boolean;
  has_oi_created_at boolean;
  has_oi_id boolean;
  has_oi_product_name boolean;
  has_oi_image boolean;
  has_p_name boolean;
  has_p_image boolean;
  name_expr text := 'null';
  image_expr text := 'null';
  sql text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'type'
  ) into has_orders_type;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'id'
  ) into has_orders_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'order_id'
  ) into has_oi_order_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'product_id'
  ) into has_oi_product_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'created_at'
  ) into has_oi_created_at;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'id'
  ) into has_oi_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'product_name'
  ) into has_oi_product_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'image'
  ) into has_oi_image;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'name'
  ) into has_p_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'image'
  ) into has_p_image;

  if not (has_orders_type and has_orders_id and has_oi_order_id and has_oi_product_id) then
    raise notice 'orders.type backfill skipped: required columns are missing.';
    return;
  end if;

  if has_oi_product_name then
    name_expr := 'nullif(trim(oi.product_name), '''')';
  elsif has_p_name then
    name_expr := 'nullif(trim(p.name), '''')';
  end if;

  if has_oi_image then
    image_expr := 'nullif(trim(oi.image), '''')';
  elsif has_p_image then
    image_expr := 'nullif(trim(p.image), '''')';
  end if;

  sql :=
    'update public.orders o set type = src.snapshot ' ||
    'from (' ||
      'select distinct on (oi.order_id::text) ' ||
      'oi.order_id::text as order_id, ' ||
      'jsonb_strip_nulls(jsonb_build_object(''product_id'', oi.product_id::text, ''name'', ' || name_expr || ', ''image'', ' || image_expr || '))::text as snapshot ' ||
      'from public.order_items oi ' ||
      'left join public.products p on p.id::text = oi.product_id::text ' ||
      'where oi.product_id is not null ' ||
      'order by oi.order_id::text' ||
      case when has_oi_created_at then ', oi.created_at asc' else '' end ||
      case when has_oi_id then ', oi.id asc' else '' end ||
    ') src ' ||
    'where o.id::text = src.order_id and coalesce(trim(o.type), '''') = ''''';

  execute sql;
end
$$;
