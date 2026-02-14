import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "aldebert",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do PostgreSQL:", err.message);
});

export const query = (text, params) => pool.query(text, params);

export const connect = async () => {
  try {
    const client = await pool.connect();
    console.log("✓ Database connected");
    client.release();
  } catch (err) {
    console.error("✕ Erro ao conectar ao banco:", err.message);
  }
};
