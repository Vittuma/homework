-- =============================================
-- CryptoRadar v2 — Supabase Schema
-- Chạy file này trong Supabase SQL Editor
-- =============================================

-- Enable pgvector extension
create extension if not exists vector;

-- Coins table
create table if not exists coins (
  id           text primary key,
  symbol       text not null,
  name         text,
  image        text,
  score        int default 50,
  sentiment    text default 'Neutral',
  recommendation text default 'Hold',
  price        numeric,
  change_24h   numeric,
  volume_24h   numeric,
  market_cap   numeric,
  updated_at   timestamptz default now()
);

-- News articles
create table if not exists news_articles (
  id           uuid primary key default gen_random_uuid(),
  coin_id      text references coins(id) on delete cascade,
  title        text not null,
  url          text unique,
  source       text,
  summary      text,
  sentiment    text default 'neutral',
  credibility  int default 5,
  is_fake      boolean default false,
  fake_reason  text,
  published_at timestamptz,
  created_at   timestamptz default now()
);

-- AI analyses (cache)
create table if not exists ai_analyses (
  id              uuid primary key default gen_random_uuid(),
  coin_id         text references coins(id) on delete cascade,
  overall_score   int,
  price_score     int,
  news_score      int,
  volume_score    int,
  momentum_score  int,
  bullish_factors jsonb default '[]',
  bearish_factors jsonb default '[]',
  fake_flags      jsonb default '[]',
  summary         text,
  confidence      int,
  expires_at      timestamptz default (now() + interval '15 minutes'),
  created_at      timestamptz default now()
);

-- Narratives / trending
create table if not exists narratives (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  coins         text[] default '{}',
  trending_score int default 0,
  article_count  int default 0,
  created_at    timestamptz default now()
);

-- Price snapshots
create table if not exists price_snapshots (
  id         uuid primary key default gen_random_uuid(),
  coin_id    text references coins(id) on delete cascade,
  price      numeric,
  volume     numeric,
  market_cap numeric,
  change_24h numeric,
  timestamp  timestamptz default now()
);

-- Indexes
create index if not exists idx_news_coin_date on news_articles(coin_id, published_at desc);
create index if not exists idx_analyses_coin on ai_analyses(coin_id, expires_at desc);
create index if not exists idx_prices_coin_time on price_snapshots(coin_id, timestamp desc);
create index if not exists idx_narratives_score on narratives(trending_score desc);

-- RLS policies (allow anon read, service_role write)
alter table coins enable row level security;
alter table news_articles enable row level security;
alter table ai_analyses enable row level security;
alter table narratives enable row level security;
alter table price_snapshots enable row level security;

create policy "Public read coins" on coins for select using (true);
create policy "Public read news" on news_articles for select using (true);
create policy "Public read analyses" on ai_analyses for select using (true);
create policy "Public read narratives" on narratives for select using (true);
create policy "Public read prices" on price_snapshots for select using (true);

create policy "Service write coins" on coins for all using (auth.role() = 'service_role');
create policy "Service write news" on news_articles for all using (auth.role() = 'service_role');
create policy "Service write analyses" on ai_analyses for all using (auth.role() = 'service_role');
create policy "Service write narratives" on narratives for all using (auth.role() = 'service_role');
create policy "Service write prices" on price_snapshots for all using (auth.role() = 'service_role');
