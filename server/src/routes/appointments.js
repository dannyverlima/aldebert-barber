import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

const appointmentSchema = z.object({
  service: z.string().min(3),
  date: z.string().min(8),
  time: z.string().min(4),
  name: z.string().min(3),
  phone: z.string().min(8),
  price: z.number().positive(),
});

/* ─── Horários disponíveis (público) ─── */
router.get("/availability", async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: "Data obrigatória" });
  }
  try {
    const result = await query(
      "SELECT time FROM appointments WHERE date = $1 AND status = 'Confirmado'",
      [date]
    );
    return res.json({ bookedTimes: result.rows.map((row) => row.time) });
  } catch (err) {
    console.error("Erro ao buscar disponibilidade:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── Criar agendamento (público ou logado) ─── */
router.post("/appointments", async (req, res) => {
  const parse = appointmentSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Dados inválidos" });
  }

  const { service, date, time, name, phone, price } = parse.data;

  // Se tiver token, vincula ao user_id
  let userId = null;
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "").trim();
  if (token) {
    try {
      const jwt = await import("jsonwebtoken");
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
      if (decoded.role === "user") userId = decoded.id;
    } catch (_) { /* sem token válido, continua sem user_id */ }
  }

  try {
    const result = await query(
      "INSERT INTO appointments (user_id, service, date, time, name, phone, price) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [userId, service, date, time, name, phone, price]
    );
    return res.status(201).json({ appointment: result.rows[0] });
  } catch (error) {
    return res.status(409).json({ message: "Horário indisponível" });
  }
});

/* ─── Meus agendamentos (usuário logado) ─── */
router.get("/my-appointments", authenticate, async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM appointments WHERE user_id = $1 ORDER BY date ASC, time ASC",
      [req.user.id]
    );
    return res.json({ appointments: result.rows });
  } catch (err) {
    console.error("Erro ao listar meus agendamentos:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── Todos os agendamentos (admin apenas) ─── */
router.get("/appointments", authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      "SELECT a.*, u.email as user_email FROM appointments a LEFT JOIN users u ON a.user_id = u.id ORDER BY date ASC, time ASC"
    );
    return res.json({ appointments: result.rows });
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── Cancelar agendamento (admin) ─── */
router.delete("/appointments/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query("UPDATE appointments SET status = 'Cancelado' WHERE id = $1", [id]);
    return res.json({ message: "Agendamento cancelado" });
  } catch (err) {
    console.error("Erro ao cancelar agendamento:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── Cancelar próprio agendamento (usuário) ─── */
router.delete("/my-appointments/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await query("UPDATE appointments SET status = 'Cancelado' WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    return res.json({ message: "Agendamento cancelado" });
  } catch (err) {
    console.error("Erro ao cancelar agendamento:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;
