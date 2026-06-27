-- =========================================================
-- GUIDO — Sistema de Gestión Territorial
-- Supabase Setup · Base de datos pura (sin Supabase Auth)
-- Ejecutar en: Supabase → SQL Editor → Run
-- =========================================================

-- ── Extensiones ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TABLA: users ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  username            TEXT        UNIQUE NOT NULL,
  email               TEXT        UNIQUE NOT NULL,
  phone               TEXT,
  password_hash       TEXT        NOT NULL,
  role                TEXT        DEFAULT 'Registrador',
  region              TEXT,
  province            TEXT,
  municipio           TEXT,
  distrito            TEXT,
  zone                TEXT,
  status              TEXT        DEFAULT 'Pendiente',
  theme               TEXT        DEFAULT 'light',
  reset_token         TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ── TABLA: voters ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.voters (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT        NOT NULL,
  cedula                  TEXT        NOT NULL UNIQUE,
  phone                   TEXT,
  region                  TEXT,
  province                TEXT,
  municipio               TEXT,
  distrito                TEXT,
  zone                    TEXT,
  sector                  TEXT,
  mesa                    TEXT,
  recinto                 TEXT,
  observacion             TEXT,

  registered_by_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  registered_by           TEXT,
  registered_by_name      TEXT,
  registered_by_role      TEXT,
  registered_by_region    TEXT,
  registered_by_province  TEXT,
  registered_by_municipio TEXT,
  registered_by_distrito  TEXT,
  registered_by_zone      TEXT,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ── TABLA: audit_logs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ts             TIMESTAMPTZ DEFAULT now(),
  actor          TEXT,
  actor_username TEXT,
  actor_role     TEXT,
  action         TEXT        NOT NULL,
  target_id      TEXT,
  target_name    TEXT,
  details        TEXT
);

-- ── Función updated_at (idempotente) ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Triggers updated_at (idempotentes) ───────────────────
DROP TRIGGER IF EXISTS set_users_updated_at  ON public.users;
DROP TRIGGER IF EXISTS set_voters_updated_at ON public.voters;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_voters_updated_at
  BEFORE UPDATE ON public.voters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Desactivar RLS (acceso directo con anon key) ─────────
ALTER TABLE public.users      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.voters     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- ── Índices ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_username    ON public.users(lower(username));
CREATE INDEX IF NOT EXISTS idx_users_email       ON public.users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_role        ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status      ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_reset_tok   ON public.users(reset_token) WHERE reset_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voters_cedula     ON public.voters(cedula);
CREATE INDEX IF NOT EXISTS idx_voters_reg_by     ON public.voters(registered_by_id);
CREATE INDEX IF NOT EXISTS idx_voters_province   ON public.voters(province);
CREATE INDEX IF NOT EXISTS idx_voters_municipio  ON public.voters(municipio);
CREATE INDEX IF NOT EXISTS idx_voters_created    ON public.voters(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_ts          ON public.audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor       ON public.audit_logs(actor_username);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON public.audit_logs(action);

-- ── Permisos para anon key (cliente JS) ──────────────────
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon;

-- =========================================================
-- FIN — Pegar URL y ANON KEY en script.js:
--   const SUPABASE_URL      = 'https://xxxx.supabase.co';
--   const SUPABASE_ANON_KEY = 'eyJ...';
-- =========================================================
