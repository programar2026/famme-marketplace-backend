import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireSeller } from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const { category, q } = req.query;
  const conditions = ["p.status = 'ativo'"];
  const params = [];

  if (category) {
    params.push(category);
    conditions.push(`p.category_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR s.store_name ILIKE $${params.length})`);
  }

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.price_kz, p.category_id, c.label AS category_label,
            s.id AS seller_id, s.store_name, s.city
     FROM products p
     JOIN sellers s ON s.id = p.seller_id
     JOIN categories c ON c.id = p.category_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.created_at DESC
     LIMIT 60`,
    params
  );
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, s.store_name, s.city, c.label AS category_label
     FROM products p
     JOIN sellers s ON s.id = p.seller_id
     JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Produto não encontrado." });
  res.json(rows[0]);
});

router.post("/", requireAuth, requireSeller, async (req, res) => {
  const { category_id, name, description, price_kz, stock } = req.body;
  if (!category_id || !name || !price_kz) {
    return res.status(400).json({ error: "Categoria, nome e preço são obrigatórios." });
  }
  const { rows } = await pool.query(
    `INSERT INTO products (seller_id, category_id, name, description, price_kz, stock)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.auth.id, category_id, name, description, price_kz, stock || 0]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", requireAuth, requireSeller, async (req, res) => {
  const { name, description, price_kz, stock, status } = req.body;
  const { rows } = await pool.query(
    `UPDATE products SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       price_kz = COALESCE($3, price_kz),
       stock = COALESCE($4, stock),
       status = COALESCE($5, status),
       updated_at = now()
     WHERE id = $6 AND seller_id = $7
     RETURNING *`,
    [name, description, price_kz, stock, status, req.params.id, req.auth.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Produto não encontrado ou não te pertence." });
  res.json(rows[0]);
});

router.delete("/:id", requireAuth, requireSeller, async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM products WHERE id = $1 AND seller_id = $2`,
    [req.params.id, req.auth.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Produto não encontrado ou não te pertence." });
  res.status(204).send();
});

export default router;
