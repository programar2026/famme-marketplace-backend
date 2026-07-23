import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// --- Criar encomenda a partir do carrinho ---
// body: { items: [{ product_id, quantity }], shipping_address, payment_method }
router.post("/", requireAuth, async (req, res) => {
  const { items, shipping_address, payment_method } = req.body;
  if (!items?.length) return res.status(400).json({ error: "O carrinho está vazio." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      const { rows } = await client.query(
        `SELECT p.id, p.price_kz, p.stock, p.seller_id, s.commission_rate
         FROM products p JOIN sellers s ON s.id = p.seller_id
         WHERE p.id = $1 AND p.status = 'ativo' FOR UPDATE`,
        [item.product_id]
      );
      const product = rows[0];
      if (!product) throw new Error(`Produto ${item.product_id} indisponível.`);
      if (product.stock < item.quantity) throw new Error(`Sem stock suficiente para ${item.product_id}.`);

      const lineTotal = Number(product.price_kz) * item.quantity;
      const commission = (lineTotal * Number(product.commission_rate)) / 100;
      const payout = lineTotal - commission;

      total += lineTotal;
      resolvedItems.push({
        product_id: product.id,
        seller_id: product.seller_id,
        quantity: item.quantity,
        unit_price_kz: product.price_kz,
        commission_rate: product.commission_rate,
        seller_payout_kz: payout,
      });

      await client.query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [item.quantity, product.id]);
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, total_kz, payment_method, shipping_address, status)
       VALUES ($1,$2,$3,$4,'pendente') RETURNING *`,
      [req.auth.id, total, payment_method, shipping_address]
    );
    const order = orderRows[0];

    for (const it of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price_kz, commission_rate, seller_payout_kz)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, it.product_id, it.seller_id, it.quantity, it.unit_price_kz, it.commission_rate, it.seller_payout_kz]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ order, items: resolvedItems, note: "Encomenda criada. Aguarda confirmação de pagamento." });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message || "Não foi possível criar a encomenda." });
  } finally {
    client.release();
  }
});

// --- Confirmar pagamento (chamado pelo webhook do gateway de pagamento) ---
router.post("/:id/confirmar-pagamento", async (req, res) => {
  const { payment_ref } = req.body;
  const { rows } = await pool.query(
    `UPDATE orders SET status = 'pago', payment_ref = $1 WHERE id = $2 RETURNING *`,
    [payment_ref, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Encomenda não encontrada." });
  res.json(rows[0]);
});

// --- Ver as minhas encomendas (cliente) ---
router.get("/minhas", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT o.*, json_agg(oi.*) AS items
     FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`,
    [req.auth.id]
  );
  res.json(rows);
});

// --- Vendas de uma vendedora (para o painel dela) ---
router.get("/vendedora", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT oi.*, o.status AS order_status, o.created_at
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.seller_id = $1 ORDER BY o.created_at DESC`,
    [req.auth.id]
  );
  const totalDue = rows.filter(r => r.order_status === "pago").reduce((s, r) => s + Number(r.seller_payout_kz), 0);
  res.json({ items: rows, total_a_receber_kz: totalDue });
});

export default router;
