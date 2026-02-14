import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import appointmentsRoutes from "./routes/appointments.js";
import loyaltyRoutes from "./routes/loyalty.js";
import { query } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });
const frontendPath = path.join(__dirname, "..", "..");

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve frontend static files (site.html, site.css, site.js)
app.use(express.static(frontendPath));

app.get("/api/status", (req, res) => {
  res.json({ status: "Aldebert Barber API online" });
});

app.use("/api/auth", authRoutes);
app.use("/api", appointmentsRoutes);
app.use("/api/loyalty", loyaltyRoutes);

// Fallback: serve site.html for root and unknown non-API routes
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "Rota não encontrada" });
  }
  res.sendFile(path.join(frontendPath, "site.html"));
});

const createAdminIfNotExists = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("⚠ ADMIN_EMAIL ou ADMIN_PASSWORD não configurados no .env");
    return;
  }

  try {
    const existing = await query("SELECT id FROM admins WHERE email = $1", [
      adminEmail,
    ]);

    if (existing.rows.length) {
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await query(
      "INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3)",
      [adminEmail, passwordHash, "Administrador"]
    );

    console.log("✓ Admin padrão criado");
  } catch (err) {
    console.error("✕ Erro ao criar admin:", err.message);
  }
};

const initDatabase = async () => {
  try {
    // Tabela de administradores
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT 'Admin',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Tabela de usuários (clientes)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Tabela de agendamentos
    await query(`
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
      )
    `);
    // Tabela de fidelidade (programa de 10 cortes)
    await query(`
      CREATE TABLE IF NOT EXISTS loyalty (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cuts_completed INTEGER NOT NULL DEFAULT 0,
        reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (user_id)
      )
    `);
    console.log("✓ Tabelas do banco criadas (admins, users, appointments, loyalty)");
  } catch (err) {
    console.error("✕ Erro ao inicializar banco de dados:", err.message);
    console.log("⚠ O servidor continuará rodando sem banco de dados.");
  }
};

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Aldebert Barber — Servidor rodando`);
  console.log(`  http://localhost:${port}`);
  console.log(`════════════════════════════════════════\n`);
  await initDatabase();
  await createAdminIfNotExists();
});
