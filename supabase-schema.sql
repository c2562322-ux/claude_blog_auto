-- =============================================
-- 병원 블로그 생성기 DB 스키마 (Supabase)
-- Supabase SQL Editor에 그대로 붙여넣어서 실행하세요
-- =============================================

-- users 테이블 (auth.users 확장)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text unique not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.users enable row level security;

create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);

create policy "Admins can read all users" on public.users
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update users" on public.users
  for update using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- 신규 유저 자동 등록 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- hospitals 테이블
create table public.hospitals (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  specialty text,
  location text,
  phone text,
  hours text,
  doctor_name text,
  conditions text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.hospitals enable row level security;

create policy "All authenticated users can read hospitals" on public.hospitals
  for select using (auth.uid() is not null);

create policy "Admins can manage hospitals" on public.hospitals
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- hospital_assignments 테이블 (병원-팀원 배정)
create table public.hospital_assignments (
  id uuid default gen_random_uuid() primary key,
  hospital_id uuid references public.hospitals on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(hospital_id, user_id)
);

alter table public.hospital_assignments enable row level security;

create policy "Users can read their assignments" on public.hospital_assignments
  for select using (
    user_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can manage assignments" on public.hospital_assignments
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- hospital_examples 테이블 (기존 글 학습용)
create table public.hospital_examples (
  id uuid default gen_random_uuid() primary key,
  hospital_id uuid references public.hospitals on delete cascade not null,
  title text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.hospital_examples enable row level security;

create policy "Authenticated users can read examples" on public.hospital_examples
  for select using (auth.uid() is not null);

create policy "Admins can manage examples" on public.hospital_examples
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Members can manage examples for assigned hospitals" on public.hospital_examples
  for all using (
    exists (
      select 1 from public.hospital_assignments
      where hospital_id = hospital_examples.hospital_id and user_id = auth.uid()
    )
  );

-- hospital_topics 테이블 (주제 목록)
create table public.hospital_topics (
  id uuid default gen_random_uuid() primary key,
  hospital_id uuid references public.hospitals on delete cascade not null,
  topic text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.hospital_topics enable row level security;

create policy "Authenticated users can read topics" on public.hospital_topics
  for select using (auth.uid() is not null);

create policy "Admins can manage topics" on public.hospital_topics
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Members can manage topics for assigned hospitals" on public.hospital_topics
  for all using (
    exists (
      select 1 from public.hospital_assignments
      where hospital_id = hospital_topics.hospital_id and user_id = auth.uid()
    )
  );

-- posts 테이블 (생성된 글)
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  hospital_id uuid references public.hospitals on delete cascade not null,
  user_id uuid references public.users on delete set null,
  topic text not null,
  pattern text not null check (pattern in ('informative', 'doctor')),
  length text not null check (length in ('short', 'medium', 'long')),
  seo_keywords text,
  content text not null,
  char_count integer,
  status_written boolean default false,
  status_reviewed boolean default false,
  status_published boolean default false,
  publish_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;

create policy "Users can read their posts" on public.posts
  for select using (
    user_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin') or
    exists (
      select 1 from public.hospital_assignments
      where hospital_id = posts.hospital_id and user_id = auth.uid()
    )
  );

create policy "Users can insert posts for assigned hospitals" on public.posts
  for insert with check (
    user_id = auth.uid() and (
      exists (select 1 from public.users where id = auth.uid() and role = 'admin') or
      exists (
        select 1 from public.hospital_assignments
        where hospital_id = posts.hospital_id and user_id = auth.uid()
      )
    )
  );

create policy "Users can update their own posts" on public.posts
  for update using (
    user_id = auth.uid() or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete posts" on public.posts
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- updated_at 자동 갱신
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger handle_hospitals_updated_at
  before update on public.hospitals
  for each row execute procedure public.handle_updated_at();
