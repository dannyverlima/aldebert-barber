import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const appointmentSchema = z.object({
  service: z.string().min(3),
  date: z.string().min(8),
  time: z.string().min(4),
  name: z.string().min(3),
  phone: z.string().min(8),
  price: z.number().positive(),
});

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

router.post("/appointments", async (req, res) => {
  const parse = appointmentSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ message: "Dados inválidos" });
  }

  const { service, date, time, name, phone, price } = parse.data;
  try {
    const result = await query(
      "INSERT INTO appointments (service, date, time, name, phone, price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [service, date, time, name, phone, price]
    );
    return res.status(201).json({ appointment: result.rows[0] });
  } catch (error) {
    return res.status(409).json({ message: "Horário indisponível" });
  }
});

router.get("/appointments", authenticate, async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM appointments ORDER BY date ASC, time ASC"
    );
    return res.json({ appointments: result.rows });
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

router.delete("/appointments/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM appointments WHERE id = $1", [id]);
    return res.json({ message: "Agendamento cancelado" });
  } catch (err) {
    console.error("Erro ao cancelar agendamento:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;
