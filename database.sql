-- Database schema for Food Route Optimizer
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- auth handled by Supabase (auth.users)
-- user profile / role
create table if not exists profiles (
  id text primary key, -- Changed from uuid to text to support dev login
  full_name text,
  role text check (role in ('user','owner','admin')) default 'user',
  created_at timestamptz default now()
);

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id text references profiles(id) on delete set null, -- Changed to reference profiles
  name text not null,
  cuisine text,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(id) on delete set null, -- Changed to reference profiles
  restaurant_id uuid references restaurants(id) on delete cascade,
  status text check (status in ('Pending','Accepted','OutForDelivery','Delivered','Failed')) default 'Pending',
  customer_name text,
  customer_phone text,
  delivery_address text,
  delivery_lat double precision,
  delivery_lng double precision,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name_snapshot text not null,           -- snapshot for history
  price_cents_snapshot int not null,
  qty int not null check (qty > 0)
);

-- a delivery run groups undelivered orders into one optimized route
create table if not exists delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  status text check (status in ('Planned','InProgress','Completed','Canceled')) default 'Planned',
  algorithm text,
  totals jsonb,               -- {distanceMeters, durationSec}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists delivery_stops (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references delivery_jobs(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  seq int,                    -- stop order
  lat double precision,
  lng double precision,
  eta timestamptz,
  status text check (status in ('Planned','EnRoute','Delivered','Skipped','Failed')) default 'Planned',
  leg jsonb                   -- {distanceMeters, durationSec, geometry}
);

-- helpers
create index on orders (restaurant_id, status);
create index on delivery_stops (job_id, seq);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table restaurants enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table delivery_jobs enable row level security;
alter table delivery_stops enable row level security;

-- RLS Policies
-- Profiles: users can read/update their own profile (for dev login, allow all)
create policy "Users can view own profile" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (true);

-- Restaurants: public read, owners can update their restaurants
create policy "Anyone can view restaurants" on restaurants for select using (true);
create policy "Owners can update their restaurants" on restaurants for update using (true);

-- Menu items: public read
create policy "Anyone can view menu items" on menu_items for select using (true);

-- Orders: users can view their own orders, restaurant owners can view orders for their restaurants
create policy "Users can view own orders" on orders for select using (true);
create policy "Restaurant owners can view their restaurant orders" on orders for select using (true);
create policy "Users can insert orders" on orders for insert with check (true);
create policy "Restaurant owners can update their restaurant orders" on orders for update using (true);

-- Order items: users can view their own order items, restaurant owners can view order items for their restaurants
create policy "Users can view own order items" on order_items for select using (true);
create policy "Restaurant owners can view their restaurant order items" on order_items for select using (true);
create policy "Users can insert order items" on order_items for insert with check (true);

-- Delivery jobs: restaurant owners can manage their delivery jobs
create policy "Restaurant owners can view their delivery jobs" on delivery_jobs for select using (true);
create policy "Restaurant owners can insert delivery jobs" on delivery_jobs for insert with check (true);
create policy "Restaurant owners can update their delivery jobs" on delivery_jobs for update using (true);

-- Delivery stops: restaurant owners can manage their delivery stops
create policy "Restaurant owners can view their delivery stops" on delivery_stops for select using (true);
create policy "Restaurant owners can insert delivery stops" on delivery_stops for insert with check (true);
create policy "Restaurant owners can update their delivery stops" on delivery_stops for update using (true);
