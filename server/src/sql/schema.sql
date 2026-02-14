-- ═══════════════════════════════════════════════════
-- ALDEBERT BARBER — Schema Completo
-- ═══════════════════════════════════════════════════

-- Tabela de administradores
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de usuários (clientes)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmado',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (date, time)
);
