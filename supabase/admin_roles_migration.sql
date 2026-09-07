alter table public.announcements
  alter column title drop not null;

alter table public.announcements
  add column if not exists author_role text;
