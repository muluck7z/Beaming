alter table public.members
  add column if not exists ip_address text;
