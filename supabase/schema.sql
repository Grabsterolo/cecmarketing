-- CEC Marketing Dashboard — esquema inicial de Supabase
-- Ejecutar en el SQL Editor del proyecto de Supabase.

-- ============================================================
-- 1. Configuración de Sofía (system prompt + base de conocimiento)
-- ============================================================
-- Fila única (id = 1) que el dashboard edita y que el backend del
-- webhook de WhatsApp lee en cada mensaje para armar el prompt completo.
create table if not exists sofia_config (
  id int primary key default 1,
  system_prompt text,
  knowledge_base text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

alter table sofia_config enable row level security;

-- Cualquier usuario autenticado del dashboard puede leer y escribir.
-- Ajustar más adelante si se necesita restringir por rol.
create policy "Authenticated users can read sofia_config"
  on sofia_config for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can update sofia_config"
  on sofia_config for all
  using (auth.role() = 'authenticated');

-- Fila inicial vacía para que el dashboard tenga algo que mostrar
-- (reemplazar con el contenido real del sandbox al desplegar).
insert into sofia_config (id, system_prompt, knowledge_base)
values (1, '', '')
on conflict (id) do nothing;


-- ============================================================
-- 2. Conversaciones de Sofía (historial de WhatsApp)
-- ============================================================
-- El backend del webhook (Cloudflare Worker conectado a Zenvia) inserta
-- una fila aquí por cada conversación o por cada turno, según se decida
-- en la implementación del backend.
create table if not exists sofia_conversations (
  id uuid primary key default gen_random_uuid(),
  phone_number text,
  topic text,                  -- clasificado por Claude: "precio", "valoración", etc.
  last_message text,
  escalated boolean default false,
  escalation_reason text,
  created_at timestamptz default now()
);

alter table sofia_conversations enable row level security;

create policy "Authenticated users can read sofia_conversations"
  on sofia_conversations for select
  using (auth.role() = 'authenticated');

-- El backend del webhook escribe con la service_role key (bypasea RLS),
-- así que no se necesita una policy de insert para el rol authenticated.


-- ============================================================
-- 3. Perfiles (igual patrón que ceccolaboradores, simplificado)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'member',
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read their own profile"
  on profiles for select
  using (auth.uid() = id);
