import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8).optional(),
  password: z.string().min(6),
});

/* ─── LOGIN ADMIN ─── */
router.post("/admin/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Dados inválidos" });
  }

  try {
    const { email, password } = parse.data;
    const result = await query("SELECT * FROM admins WHERE email = $1", [email]);
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email, role: "admin" } });
  } catch (err) {
    console.error("Erro no login admin:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── REGISTRO USUÁRIO ─── */
router.post("/register", async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Dados inválidos. Nome mín. 3 caracteres, senha mín. 6." });
  }

  try {
    const { name, email, phone, password } = parse.data;

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) {
      return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone",
      [name, email, phone || null, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.status(201).json({ token, user: { ...user, role: "user" } });
  } catch (err) {
    console.error("Erro no registro:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── LOGIN USUÁRIO ─── */
router.post("/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Dados inválidos" });
  }

  try {
    const { email, password } = parse.data;
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: "user" } });
  } catch (err) {
    console.error("Erro no login:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── PERFIL DO USUÁRIO LOGADO ─── */
router.get("/me", authenticate, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const result = await query("SELECT id, name, email FROM admins WHERE id = $1", [req.user.id]);
      const admin = result.rows[0];
      if (!admin) return res.status(404).json({ message: "Admin não encontrado" });
      return res.json({ user: { ...admin, role: "admin" } });
    }

    const result = await query("SELECT id, name, email, phone FROM users WHERE id = $1", [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    return res.json({ user: { ...user, role: "user" } });
  } catch (err) {
    console.error("Erro ao buscar perfil:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;
