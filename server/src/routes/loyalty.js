import { Router } from "express";
import { query } from "../db.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

/* ─── Minha fidelidade (usuário logado) — DEVE VIR ANTES DE /:userId ─── */
router.get("/me", authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT COALESCE(l.cuts_completed, 0) AS cuts_completed,
             COALESCE(l.reward_claimed, false) AS reward_claimed
      FROM users u
      LEFT JOIN loyalty l ON l.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);
    if (!result.rows.length) {
      return res.json({ cuts_completed: 0, reward_claimed: false });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar minha fidelidade:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── Listar todos os clientes com fidelidade (admin) ─── */
router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id AS user_id, u.name, u.email, u.phone,
             COALESCE(l.cuts_completed, 0) AS cuts_completed,
             COALESCE(l.reward_claimed, false) AS reward_claimed,
             l.updated_at
      FROM users u
      LEFT JOIN loyalty l ON l.user_id = u.id
      ORDER BY u.name ASC
    `);
    return res.json({ clients: result.rows });
  } catch (err) {
    console.error("Erro ao listar fidelidade:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── Adicionar corte ao cliente (admin) ─── */
router.post("/:userId/cut", authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    // Upsert: cria se não existe, incrementa se existe
    const result = await query(`
      INSERT INTO loyalty (user_id, cuts_completed, updated_at)
      VALUES ($1, 1, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET cuts_completed = CASE
            WHEN loyalty.reward_claimed = true THEN 1
            ELSE loyalty.cuts_completed + 1
          END,
          reward_claimed = CASE
            WHEN loyalty.reward_claimed = true THEN false
            ELSE loyalty.reward_claimed
          END,
          updated_at = NOW()
      RETURNING *
    `, [userId]);
    return res.json({ loyalty: result.rows[0] });
  } catch (err) {
    console.error("Erro ao adicionar corte:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── Remover corte do cliente (admin) ─── */
router.post("/:userId/remove-cut", authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query(`
      UPDATE loyalty
      SET cuts_completed = GREATEST(cuts_completed - 1, 0),
          updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [userId]);
    if (!result.rows.length) {
      return res.status(404).json({ message: "Registro de fidelidade não encontrado" });
    }
    return res.json({ loyalty: result.rows[0] });
  } catch (err) {
    console.error("Erro ao remover corte:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

/* ─── Marcar recompensa como resgatada (admin) ─── */
router.post("/:userId/claim", authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query(`
      UPDATE loyalty
      SET reward_claimed = true,
          cuts_completed = 0,
          updated_at = NOW()
      WHERE user_id = $1 AND cuts_completed >= 10
      RETURNING *
    `, [userId]);
    if (!result.rows.length) {
      return res.status(400).json({ message: "Cliente não atingiu 10 cortes ou não encontrado" });
    }
    return res.json({ loyalty: result.rows[0], message: "Recompensa resgatada! Contador zerado." });
  } catch (err) {
    console.error("Erro ao resgatar recompensa:", err.message);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;
